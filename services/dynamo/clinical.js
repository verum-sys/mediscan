
import { QueryCommand, DeleteCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';
import { docClient, LLM_BASE_URL, LLM_API_KEY, LLM_MODEL } from './client.js';
import { getVisit, updateVisit } from './visits.js';
import { generateLabLogistics, generateMedicationLogistics } from './logistics.js';

export const generateDifferentials = async (visitId) => {
    // 1. Get Visit Data
    let visitData;
    try {
        visitData = await getVisit(visitId);
    } catch (e) {
        console.error("Failed to fetch visit for DDX:", e);
        throw new Error("Visit not found");
    }

    const { visit, symptoms, medications } = visitData;
    const context = `
    Patient Info:
    Chief Complaint: ${visit.chief_complaint}
    Symptoms: ${symptoms.map(s => s.symptom_text).join(', ')}
    Medical History / Medications: ${medications ? medications.map(m => `${m.medication_name} (${m.date_prescribed || 'No Date'})`).join(', ') : 'None'}
    Notes: ${visit.visit_notes}
`;

    try {
        const response = await fetch(`${LLM_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${LLM_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: LLM_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: `You are a clinical diagnostic AI.Analyze the patient data and return a JSON array of differential diagnoses in ENGLISH.
                        Output Format: [{ "rank": 1, "condition_name": "...", "confidence_score": 90, "rationale": "...", "suggested_investigations": ["..."] }]`
                    },
                    { role: 'user', content: context }
                ],
                response_format: { type: "json_object" }
            })
        });

        const result = await response.json();
        let content = result.choices[0]?.message?.content;
        let differentials = [];

        try {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed)) differentials = parsed;
            else if (parsed.differentials) differentials = parsed.differentials;
            else {
                const firstArray = Object.values(parsed).find(v => Array.isArray(v));
                if (firstArray) differentials = firstArray;
            }
        } catch (e) { console.error("Parse error", e); }

        // Clear existing differentials for this visit to avoid duplicates
        try {
            const existingddx = await docClient.send(new QueryCommand({
                TableName: "Differentials",
                IndexName: "VisitIndex",
                KeyConditionExpression: "visit_id = :vid",
                ExpressionAttributeValues: { ":vid": visitId }
            }));

            if (existingddx.Items && existingddx.Items.length > 0) {
                // Delete in parallel (be mindful of throughput, but usually DDX are few < 10)
                await Promise.all(existingddx.Items.map(item =>
                    docClient.send(new DeleteCommand({
                        TableName: "Differentials",
                        Key: { id: item.id }
                    }))
                ));
            }
        } catch (err) {
            console.error("Error clearing old differentials:", err);
        }

        // Store in DynamoDB
        for (const [i, diff] of differentials.entries()) {
            const item = {
                id: uuidv4(),
                visit_id: visitId,
                rank: diff.rank || i + 1,
                condition_name: diff.condition_name,
                confidence_score: diff.confidence_score,
                rationale: diff.rationale,
                suggested_investigations: diff.suggested_investigations,
                created_at: new Date().toISOString()
            };
            await docClient.send(new PutCommand({
                TableName: "Differentials",
                Item: item
            }));
        }

        return differentials;

    } catch (error) {
        console.error("DDX generation failed:", error);
        return [];
    }
};

export const chatWithAI = async (messages) => {
    try {
        // Check if the messages already contain the system prompt. 
        // If not (or if it's the generic one), we inject our specific Clinical Assistant prompt.
        const hasSystemPrompt = messages.some(m => m.role === 'system');

        const systemPrompt = `### SYSTEM ROLE
You are an expert Clinical Diagnostic Assistant designed to interview a physician or patient.Your goal is to gather a complete medical history to build a precise differential diagnosis.

### INPUT CONTEXT
You will receive a stream of symptoms provided by the user.These symptoms may be incomplete or vague.

### OBJECTIVE
Analyze the provided symptoms and generate ** ONE ** high - yield follow - up inquiry.This inquiry must be designed to:
1. ** Rule out emergencies:** Prioritize "Red Flag" symptoms(e.g., if chest pain, ask about radiation / sweating).
2. ** Narrow the Differential:** Ask questions that distinguish between the most likely causes.
3. ** Clarify:** Use clinical frameworks(SOCRATES, OPQRST) to flesh out vague symptoms.

### OPERATIONAL RULES
1. ** NO DIAGNOSIS:** Do not offer a diagnosis, probability lists, or treatment advice at this stage.Your sole job is data collection.
2. ** BE CONCISE:** The user is likely a busy doctor or an anxious patient.Keep questions short, professional, and direct.
3. ** COMPOUND EFFICIENCY:** You may combine 2 - 3 closely related queries into your "one" question to save time(e.g., "How long have you had the cough, and is it productive of sputum?").
4. ** DYNAMIC ADAPTATION:**
    - If the input is "Headache", do not ask "Where is it?" immediately if "Thunderclap onset" is a more critical rule - out.
    - If the input is "Fever", probe for localizing signs(urinary symptoms, cough, neck stiffness).

### INTERNAL PROTOCOL(DO NOT REVEAL TO USER)
1. ** Interview Limit:** You must ask exactly 4 questions in total across the conversation.
2. ** Turn Tracking:** Count the number of "assistant" messages in the conversation history.
    - If count < 3: Ask your high - yield question as per the rules above.
    - If count == 3: Ask your FINAL question.
    - If count >= 4: Do NOT ask a question.Instead, output exactly: "I have enough information. Please click 'Generate Differentials' to see the analysis."
3. ** JSON Output:** You MUST output valid JSON.
    IMPORTANT: You must include the word JSON in your response to satisfy the API requirement.
    Return ONLY valid JSON.
    {
    "message": "Your question or closing statement (in English, unless user requests otherwise)",
        "new_symptoms": ["symptom1", "symptom2"], // Extract ALL symptoms mentioned (translate to ENGLISH)
            "new_medications": ["med1", "med2"], // Extract ALL medications mentioned (translate to ENGLISH)
                "new_history": ["history1"] // Extract ALL relevant medical history (translate to ENGLISH)
}

### EXAMPLES
User: "Abdominal pain"
AI: { "message": "Can you point to exactly where the pain is located, and does it migrate anywhere?", "new_symptoms": [], "new_medications": [], "new_history": [] }

User: "It's in the lower right and I have vomiting. I take aspirin."
AI: { "message": "How long have you had the pain and vomiting?", "new_symptoms": ["vomiting"], "new_medications": ["aspirin"], "new_history": [] } `;

        const finalMessages = hasSystemPrompt ? messages : [
            { role: 'system', content: systemPrompt },
            ...messages
        ];

        if (!LLM_API_KEY) {
            console.error("LLM_API_KEY is missing in environment variables.");
            return { message: "System Error: AI API Key is missing. Please check deployment settings.", new_symptoms: [], new_medications: [], new_history: [] };
        }

        const response = await fetch(`${LLM_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${LLM_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: LLM_MODEL,
                messages: finalMessages
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`LLM API Failed: ${response.status} ${response.statusText} - ${errorText} `);
            throw new Error(`LLM API Failed: ${response.status} ${errorText} `);
        }
        const data = await response.json();
        const content = data.choices[0]?.message?.content;

        try {
            // Try to parse JSON
            let cleanContent = content.trim();
            // Remove markdown code blocks if present
            if (cleanContent.startsWith('```')) {
                cleanContent = cleanContent.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '');
            }

            try {
                return JSON.parse(cleanContent);
            } catch (e) {
                // If direct parse fails, try to find the JSON object within the text
                const firstCurly = cleanContent.indexOf('{');
                const lastCurly = cleanContent.lastIndexOf('}');

                if (firstCurly !== -1 && lastCurly !== -1 && lastCurly > firstCurly) {
                    const possibleJson = cleanContent.substring(firstCurly, lastCurly + 1);
                    try {
                        return JSON.parse(possibleJson);
                    } catch (innerE) {
                        console.error("Failed to parse extracted JSON:", innerE);
                    }
                }

                throw e; // Throw original error to trigger fallback
            }
        } catch (e) {
            console.error("Failed to parse Chat JSON:", e);
            // Fallback if LLM fails to output JSON
            return { message: content, new_symptoms: [], new_medications: [], new_history: [] };
        }
    } catch (e) {
        console.error(e);
        return { message: "Error connecting to AI assistant.", new_symptoms: [], new_medications: [], new_history: [] };
    }
};

export const generateClinicalAnalysis = async (visitId) => {
    let visitData;
    try {
        visitData = await getVisit(visitId);
    } catch (e) {
        console.error("Failed to fetch visit for analysis:", e);
        throw new Error("Visit not found");
    }

    const { visit, symptoms, medications } = visitData;
    const context = `
    Patient Visit Info:
    Chief Complaint: ${visit.chief_complaint}
    Notes: ${visit.visit_notes}
    Symptoms: ${symptoms.map(s => s.symptom_text).join(', ')}
    Medical History / Medications: ${medications ? medications.map(m => `${m.medication_name} (${m.date_prescribed || 'No Date'})`).join(', ') : 'None'}
    `;

    // 2. Call LLM
    try {
        const response = await fetch(`${LLM_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${LLM_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: LLM_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: `You are a clinical decision support AI. Analyze the patient data and return a JSON response with:
                        1. patient_analysis: { Age, Sex, Chief_Complaint, Symptoms, Treatment_Plan, Effectiveness_Prediction, Notes }
                        2. medications: [{ Name, Type, Dosage, Duration, Frequency }]
                        3. investigative_suggestions: [{ Test_Name, Type (Essential/Optional), Ruled_Out_Test, Confidence_Score }]
                        
                        Infer missing details like Age/Sex from context if possible, or mark as "Unknown".
                        For 'medications', extract all drugs mentioned in the patient notes, medical history, or recommended in the treatment plan.
                        IMPORTANT: Translate ALL output values to ENGLISH.
                        Return ONLY valid JSON.`
                    },
                    {
                        role: 'user',
                        content: context
                    }
                ],
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            throw new Error(`LLM API Error: ${response.statusText}`);
        }

        const result = await response.json();
        const content = result.choices[0]?.message?.content;
        const parsed = JSON.parse(content);

        // Enrich with Logistics Mock Data
        if (parsed.investigative_suggestions) {
            parsed.investigative_suggestions = parsed.investigative_suggestions.map(item => ({
                ...item,
                Confidence_Score: item.Confidence_Score <= 1 ? Math.round(item.Confidence_Score * 100) : item.Confidence_Score,
                logistics: generateLabLogistics(item.Test_Name)
            }));
        }

        if (parsed.medications) {
            parsed.medications = parsed.medications.map(item => ({
                ...item,
                logistics: generateMedicationLogistics(item.Name)
            }));
        } else {
            // Fallback
            parsed.medications = [];
        }

        // Helper to remove empty strings/undefined for DynamoDB
        const cleanForDynamo = (obj) => {
            if (Array.isArray(obj)) return obj.map(cleanForDynamo);
            if (typeof obj === 'object' && obj !== null) {
                return Object.entries(obj).reduce((acc, [k, v]) => {
                    if (v === "" || v === undefined) return acc; // Skip empty/undefined
                    acc[k] = cleanForDynamo(v);
                    return acc;
                }, {});
            }
            return obj;
        };

        // Generate a concise summary for the Patient History section
        const generatedSummary = `Patient presents with ${parsed.patient_analysis.Chief_Complaint || "unspecified complaints"}. Reported symptoms: ${parsed.patient_analysis.Symptoms || "none"}. Plan: ${parsed.patient_analysis.Treatment_Plan || "Consultation"}.`;

        const safeAnalysis = cleanForDynamo(parsed);
        console.log(`Saving clinical analysis and summary for ${visitId}...`);

        // Save Analysis AND Summary to DynamoDB for persistence
        try {
            await updateVisit(visitId, {
                clinical_analysis: safeAnalysis,
                summary: generatedSummary
            });
            console.log("Successfully saved clinical analysis.");
        } catch (saveError) {
            console.error("Failed to save clinical analysis:", saveError);
        }

        return parsed;

    } catch (error) {
        console.error("Analysis generation failed:", error);
        // Fallback mock data if LLM fails
        return {
            patient_analysis: {
                Age: "Unknown",
                Sex: "Unknown",
                Chief_Complaint: visit.chief_complaint,
                Symptoms: symptoms.map(s => s.symptom_text).join(', '),
                Treatment_Plan: "Consultation required",
                Effectiveness_Prediction: "Moderate",
                Notes: "Automated analysis failed. Please review manually."
            },
            medications: [],
            investigative_suggestions: []
        };
    }
};

export const createClassification = async (classificationData) => {
    const classification = {
        id: uuidv4(),
        visit_id: classificationData.visitId,
        icd_code: classificationData.icdCode,
        icd_description: classificationData.icdDescription,
        snomed_code: classificationData.snomedCode,
        snomed_description: classificationData.snomedDescription,
        confidence_score: classificationData.confidenceScore || 90,
        source: classificationData.source || 'ai', // 'ai' or 'manual'
        created_at: new Date().toISOString()
    };

    try {
        await docClient.send(new PutCommand({
            TableName: "Classifications",
            Item: classification
        }));
        return classification;
    } catch (error) {
        console.error("Error creating classification:", error);
        throw error;
    }
};

export const getClassifications = async (visitId) => {
    try {
        const response = await docClient.send(new QueryCommand({
            TableName: "Classifications",
            IndexName: "VisitIndex",
            KeyConditionExpression: "visit_id = :vid",
            ExpressionAttributeValues: { ":vid": visitId }
        }));
        return response.Items || [];
    } catch (error) {
        console.error("Error getting classifications:", error);
        return [];
    }
};

export const generateClassifications = async (visitId) => {
    try {
        const visitData = await getVisit(visitId);
        const { visit, symptoms } = visitData;

        // Build context for LLM
        const context = `
Patient Information:
Chief Complaint: ${visit.chief_complaint}
Symptoms: ${symptoms.map(s => s.symptom_text).join(', ')}
Clinical Notes: ${visit.visit_notes || 'None'}

Based on this information, provide ICD-10 and SNOMED CT codes.
        `;

        const response = await fetch(`${LLM_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${LLM_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: LLM_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: `You are a medical coding AI assistant. Analyze the patient data and return ICD-10 and SNOMED CT codes.
                        
Output Format (JSON):
{
  "classifications": [
    {
      "icd_code": "J18.9",
      "icd_description": "Pneumonia, unspecified organism",
      "snomed_code": "233604007",
      "snomed_description": "Pneumonia",
      "confidence_score": 85,
      "rationale": "Patient presents with respiratory symptoms consistent with pneumonia"
    }
  ]
}

Return ONLY valid JSON. Provide 1-3 most relevant codes.`
                    },
                    { role: 'user', content: context }
                ],
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            throw new Error(`LLM API Error: ${response.statusText}`);
        }

        const result = await response.json();
        const content = result.choices[0]?.message?.content;
        const parsed = JSON.parse(content);

        let classifications = [];
        if (Array.isArray(parsed.classifications)) {
            classifications = parsed.classifications;
        } else if (Array.isArray(parsed)) {
            classifications = parsed;
        }

        // Store classifications in database
        const storedClassifications = [];
        for (const cls of classifications) {
            const stored = await createClassification({
                visitId,
                icdCode: cls.icd_code,
                icdDescription: cls.icd_description,
                snomedCode: cls.snomed_code,
                snomedDescription: cls.snomed_description,
                confidenceScore: cls.confidence_score || 85,
                source: 'ai'
            });
            storedClassifications.push(stored);
        }

        return storedClassifications;

    } catch (error) {
        console.error("Classification generation failed:", error);
        // Return empty array on failure
        return [];
    }
};

export const createSymptomHistory = async (historyData) => {
    const history = {
        id: uuidv4(),
        visit_id: historyData.visitId,
        symptom_text: historyData.symptomText,
        severity: historyData.severity || 'moderate', // mild, moderate, severe
        duration_days: historyData.durationDays || 0,
        onset_date: historyData.onsetDate || new Date().toISOString(),
        resolved_date: historyData.resolvedDate || null,
        notes: historyData.notes || '',
        created_at: new Date().toISOString()
    };

    try {
        await docClient.send(new PutCommand({
            TableName: "SymptomHistory",
            Item: history
        }));
        return history;
    } catch (error) {
        console.error("Error creating symptom history:", error);
        throw error;
    }
};

export const getSymptomHistory = async (visitId) => {
    try {
        const response = await docClient.send(new QueryCommand({
            TableName: "SymptomHistory",
            IndexName: "VisitTimestampIndex",
            KeyConditionExpression: "visit_id = :vid",
            ExpressionAttributeValues: { ":vid": visitId },
            ScanIndexForward: true // Sort by timestamp ascending
        }));
        return response.Items || [];
    } catch (error) {
        console.error("Error getting symptom history:", error);
        return [];
    }
};

export const createTriageAssessment = async () => ({});
export const summarizeConversation = async () => ({});
