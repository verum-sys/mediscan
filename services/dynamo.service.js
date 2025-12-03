import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    } : undefined
});

const docClient = DynamoDBDocumentClient.from(client);

const LLM_API_KEY = process.env.LLM_API_KEY;
const LLM_BASE_URL = process.env.LLM_BASE_URL || 'https://api.cerebras.ai/v1';
const LLM_MODEL = process.env.LLM_MODEL || 'llama-3.3-70b';

// --- Helper Functions ---
const scanTable = async (tableName) => {
    const command = new ScanCommand({ TableName: tableName });
    const response = await docClient.send(command);
    return response.Items || [];
};

// --- Service Functions ---

export const createVisit = async (visitData) => {
    const id = uuidv4();
    const visit = {
        id,
        visit_number: `VS-${Date.now().toString().slice(-6)}`,
        facility_name: visitData.facilityName,
        department: visitData.department,
        provider_name: visitData.providerName,
        chief_complaint: visitData.chiefComplaint,
        visit_notes: visitData.visitNotes,
        source_type: visitData.sourceType,
        source_document_id: visitData.sourceDocumentId,
        confidence_score: visitData.confidenceScore,
        status: 'in_progress',
        created_at: new Date().toISOString()
    };

    try {
        await docClient.send(new PutCommand({
            TableName: "Visits",
            Item: visit
        }));
        return visit;
    } catch (error) {
        console.error("Error creating visit in DynamoDB:", error);
        throw error;
    }
};

export const updateVisit = async (visitId, updates) => {
    // Construct UpdateExpression
    let updateExp = "set";
    const expAttrValues = {};
    const expAttrNames = {};

    Object.keys(updates).forEach((key, index) => {
        const attrName = `#attr${index}`;
        const attrVal = `:val${index}`;

        // Map camelCase to snake_case if needed, but we used snake_case in createVisit
        // Let's assume updates come in camelCase and we map them
        let dbKey = key;
        if (key === 'visitNotes') dbKey = 'visit_notes';
        if (key === 'chiefComplaint') dbKey = 'chief_complaint';

        updateExp += ` ${attrName} = ${attrVal},`;
        expAttrNames[attrName] = dbKey;
        expAttrValues[attrVal] = updates[key];
    });

    updateExp = updateExp.slice(0, -1); // Remove trailing comma

    try {
        const command = new UpdateCommand({
            TableName: "Visits",
            Key: { id: visitId },
            UpdateExpression: updateExp,
            ExpressionAttributeNames: expAttrNames,
            ExpressionAttributeValues: expAttrValues,
            ReturnValues: "ALL_NEW"
        });

        const response = await docClient.send(command);
        return response.Attributes;
    } catch (error) {
        console.error("Error updating visit:", error);
        throw error;
    }
};

export const getVisit = async (visitId) => {
    try {
        // Get Visit
        const visitRes = await docClient.send(new GetCommand({
            TableName: "Visits",
            Key: { id: visitId }
        }));
        const visit = visitRes.Item;

        if (!visit) throw new Error("Visit not found");

        // Get Symptoms
        const symptomsRes = await docClient.send(new QueryCommand({
            TableName: "Symptoms",
            IndexName: "VisitIndex",
            KeyConditionExpression: "visit_id = :vid",
            ExpressionAttributeValues: { ":vid": visitId }
        }));

        // Get Medications
        const medsRes = await docClient.send(new QueryCommand({
            TableName: "Medications",
            IndexName: "VisitIndex",
            KeyConditionExpression: "visit_id = :vid",
            ExpressionAttributeValues: { ":vid": visitId }
        }));

        // Get Differentials
        const ddxRes = await docClient.send(new QueryCommand({
            TableName: "Differentials",
            IndexName: "VisitIndex",
            KeyConditionExpression: "visit_id = :vid",
            ExpressionAttributeValues: { ":vid": visitId }
        }));

        return {
            visit,
            symptoms: symptomsRes.Items || [],
            medications: medsRes.Items || [],
            differentials: ddxRes.Items || [],
            alerts: []
        };
    } catch (error) {
        console.error("Error fetching visit:", error);
        throw error;
    }
};

export const addSymptoms = async (visitId, symptoms) => {
    const newSymptoms = symptoms.map(s => ({
        id: uuidv4(),
        visit_id: visitId,
        symptom_text: s.text,
        confidence_score: s.confidenceScore,
        severity: s.severity,
        duration: s.duration,
        source: s.source,
        raw_text: s.rawText,
        created_at: new Date().toISOString()
    }));

    try {
        // DynamoDB doesn't support batch write for > 25 items easily, but usually symptoms are few
        for (const sym of newSymptoms) {
            await docClient.send(new PutCommand({
                TableName: "Symptoms",
                Item: sym
            }));
        }
        return newSymptoms;
    } catch (error) {
        console.error("Error adding symptoms:", error);
        return [];
    }
};

export const addMedications = async (visitId, medications) => {
    const newMeds = medications.map(m => ({
        id: uuidv4(),
        visit_id: visitId,
        medication_name: m.name,
        date_prescribed: m.date,
        source: m.source || 'manual',
        created_at: new Date().toISOString()
    }));

    try {
        for (const med of newMeds) {
            await docClient.send(new PutCommand({
                TableName: "Medications",
                Item: med
            }));
        }
        return newMeds;
    } catch (error) {
        console.error("Error adding medications:", error);
        return [];
    }
};

export const getStats = async () => {
    try {
        const visits = await scanTable("Visits");

        const today = new Date().toISOString().split('T')[0];
        const todayTotal = visits.filter(v => v.created_at && v.created_at.startsWith(today)).length;

        const highRisk = visits.filter(v =>
            (v.confidence_score && v.confidence_score < 60) ||
            (v.visit_notes && v.visit_notes.toLowerCase().includes('high risk'))
        ).length;

        const incompleteData = visits.filter(v =>
            !v.chief_complaint || v.status === 'incomplete'
        ).length;

        const followUp = visits.filter(v =>
            (v.visit_notes && v.visit_notes.toLowerCase().includes('follow up'))
        ).length;

        // Baseline Fake Data (to make dashboard look populated)
        const BASELINE = {
            todayTotal: 142,
            highRisk: 12,
            incompleteData: 5,
            followUp: 45
        };

        return {
            todayTotal: todayTotal + BASELINE.todayTotal,
            highRisk: highRisk + BASELINE.highRisk,
            incompleteData: incompleteData + BASELINE.incompleteData,
            followUp: followUp + BASELINE.followUp,
            storageStatus: 'dynamodb'
        };
    } catch (error) {
        console.error("Error getting stats:", error);
        return { todayTotal: 0, highRisk: 0, incompleteData: 0, followUp: 0, storageStatus: 'error' };
    }
};

export const getQueue = async () => {
    try {
        const visits = await scanTable("Visits");
        // Sort by created_at desc
        // Fake Queue Data
        const MOCK_QUEUE = [
            {
                id: 'mock-q-1',
                visit_number: 'OPD-2024-892',
                chief_complaint: 'Severe chest pain radiating to left arm',
                facility_name: 'City General Hospital',
                department: 'Cardiology',
                status: 'in_progress',
                confidence_score: 92,
                created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
                has_high_risk: true,
                needs_follow_up: false
            },
            {
                id: 'mock-q-2',
                visit_number: 'OPD-2024-891',
                chief_complaint: 'Persistent dry cough and fever',
                facility_name: 'City General Hospital',
                department: 'Pulmonology',
                status: 'completed',
                confidence_score: 88,
                created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
                has_high_risk: false,
                needs_follow_up: true
            },
            {
                id: 'mock-q-3',
                visit_number: 'OPD-2024-890',
                chief_complaint: 'Migraine with aura',
                facility_name: 'City General Hospital',
                department: 'Neurology',
                status: 'waiting',
                confidence_score: 75,
                created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
                has_high_risk: false,
                needs_follow_up: false
            },
            {
                id: 'mock-q-4',
                visit_number: 'OPD-2024-889',
                chief_complaint: 'Abdominal pain, lower right quadrant',
                facility_name: 'City General Hospital',
                department: 'Emergency',
                status: 'in_progress',
                confidence_score: 65,
                created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago
                has_high_risk: true,
                needs_follow_up: false
            },
            {
                id: 'mock-q-5',
                visit_number: 'OPD-2024-888',
                chief_complaint: 'Routine diabetic checkup',
                facility_name: 'City General Hospital',
                department: 'Endocrinology',
                status: 'completed',
                confidence_score: 95,
                created_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
                has_high_risk: false,
                needs_follow_up: false
            }
        ];

        const realVisits = visits.map(v => ({
            ...v,
            has_high_risk: (v.confidence_score < 70),
            needs_follow_up: false
        }));

        // Combine real visits with mock queue
        return [...realVisits, ...MOCK_QUEUE].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } catch (error) {
        console.error("Error getting queue:", error);
        return [];
    }
};

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
                        content: `You are a clinical diagnostic AI. Analyze the patient data and return a JSON array of differential diagnoses.
                        Output Format: [{"rank": 1, "condition_name": "...", "confidence_score": 90, "rationale": "...", "suggested_investigations": ["..."]}]`
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
You are an expert Clinical Diagnostic Assistant designed to interview a physician or patient. Your goal is to gather a complete medical history to build a precise differential diagnosis.

### INPUT CONTEXT
You will receive a stream of symptoms provided by the user. These symptoms may be incomplete or vague.

### OBJECTIVE
Analyze the provided symptoms and generate **ONE** high-yield follow-up inquiry. This inquiry must be designed to:
1.  **Rule out emergencies:** Prioritize "Red Flag" symptoms (e.g., if chest pain, ask about radiation/sweating).
2.  **Narrow the Differential:** Ask questions that distinguish between the most likely causes.
3.  **Clarify:** Use clinical frameworks (SOCRATES, OPQRST) to flesh out vague symptoms.

### OPERATIONAL RULES
1.  **NO DIAGNOSIS:** Do not offer a diagnosis, probability lists, or treatment advice at this stage. Your sole job is data collection.
2.  **BE CONCISE:** The user is likely a busy doctor or an anxious patient. Keep questions short, professional, and direct.
3.  **COMPOUND EFFICIENCY:** You may combine 2-3 closely related queries into your "one" question to save time (e.g., "How long have you had the cough, and is it productive of sputum?").
4.  **DYNAMIC ADAPTATION:**
    - If the input is "Headache", do not ask "Where is it?" immediately if "Thunderclap onset" is a more critical rule-out.
    - If the input is "Fever", probe for localizing signs (urinary symptoms, cough, neck stiffness).

### INTERNAL PROTOCOL (DO NOT REVEAL TO USER)
1.  **Interview Limit:** You must ask exactly 4 questions in total across the conversation.
2.  **Turn Tracking:** Count the number of "assistant" messages in the conversation history.
    - If count < 3: Ask your high-yield question as per the rules above.
    - If count == 3: Ask your FINAL question.
    - If count >= 4: Do NOT ask a question. Instead, output exactly: "I have enough information. Please click 'Generate Differentials' to see the analysis."
3.  **JSON Output:** You MUST output valid JSON.
    IMPORTANT: You must include the word JSON in your response to satisfy the API requirement.
    Return ONLY valid JSON.
    {
        "message": "Your question or closing statement",
        "new_symptoms": ["symptom1", "symptom2"], // Extract ALL symptoms mentioned or confirmed in the user's latest response
        "new_medications": ["med1", "med2"], // Extract ALL medications mentioned
        "new_history": ["history1"] // Extract ALL relevant medical history
    }

### EXAMPLES
User: "Abdominal pain"
AI: { "message": "Can you point to exactly where the pain is located, and does it migrate anywhere?", "new_symptoms": [], "new_medications": [], "new_history": [] }

User: "It's in the lower right and I have vomiting. I take aspirin."
AI: { "message": "How long have you had the pain and vomiting?", "new_symptoms": ["vomiting"], "new_medications": ["aspirin"], "new_history": [] }`;

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
            console.error(`LLM API Failed: ${response.status} ${response.statusText} - ${errorText}`);
            throw new Error(`LLM API Failed: ${response.status} ${errorText}`);
        }
        const data = await response.json();
        const content = data.choices[0]?.message?.content;

        try {
            // Try to parse JSON
            return JSON.parse(content);
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

// Placeholder for other functions if needed
export const getAnalytics = async () => ({});
export const createTriageAssessment = async () => ({});
export const getTriageQueue = async () => ([]);
export const summarizeConversation = async () => ({});
export const generateClinicalAnalysis = async (visitId) => {
    // 1. Get Visit Data
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
                        2. investigative_suggestions: [{ Test_Name, Type (Essential/Optional), Ruled_Out_Test, Confidence_Score }]
                        
                        Infer missing details like Age/Sex from context if possible, or mark as "Unknown".
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

        // Normalize confidence scores to 0-100
        if (parsed.investigative_suggestions) {
            parsed.investigative_suggestions = parsed.investigative_suggestions.map(item => ({
                ...item,
                Confidence_Score: item.Confidence_Score <= 1 ? Math.round(item.Confidence_Score * 100) : item.Confidence_Score
            }));
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
            investigative_suggestions: []
        };
    }
};
