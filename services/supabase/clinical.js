
import { v4 as uuidv4 } from 'uuid';
import { supabase, LLM_BASE_URL, LLM_API_KEY, LLM_MODEL, fetch } from './client.js';
import { getVisit, updateVisit } from './visits.js';
import { generateLabLogistics, generateMedicationLogistics } from './logistics.js';

export const generateDifferentials = async (visitId) => {
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
            headers: { 'Authorization': `Bearer ${LLM_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: LLM_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: `You are a clinical diagnostic AI. Analyze the patient data and return a JSON array of differential diagnoses in ENGLISH.
                        Output Format: [{ "rank": 1, "condition_name": "...", "confidence_score": 90, "rationale": "...", "suggested_investigations": ["..."] }]`
                    },
                    { role: 'user', content: context }
                ],
                response_format: { type: "json_object" }
            })
        });

        const result = await response.json();
        let content = result.choices[0]?.message?.content || "{}";
        let differentials = [];

        try {
            let cleanContent = content.trim();
            if (cleanContent.startsWith('```')) {
                cleanContent = cleanContent.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '');
            }
            if (!cleanContent.startsWith('{') && !cleanContent.startsWith('[') && cleanContent.indexOf('{') !== -1) {
                const startObj = cleanContent.indexOf('{');
                const startArr = cleanContent.indexOf('[');
                const start = (startObj !== -1 && startArr !== -1) ? Math.min(startObj, startArr) : Math.max(startObj, startArr);
                if (start !== -1) {
                    const end = Math.max(cleanContent.lastIndexOf('}'), cleanContent.lastIndexOf(']'));
                    if (end !== -1) cleanContent = cleanContent.substring(start, end + 1);
                }
            }
            const parsed = JSON.parse(cleanContent);
            if (Array.isArray(parsed)) differentials = parsed;
            else if (parsed.differentials) differentials = parsed.differentials;
            else {
                const firstArray = Object.values(parsed).find(v => Array.isArray(v));
                if (firstArray) differentials = firstArray;
            }
        } catch (e) { console.error("Parse error", e); }

        // Delete existing differentials then insert new ones
        await supabase.from('differentials').delete().eq('visit_id', visitId);

        if (differentials.length > 0) {
            const items = differentials.map((diff, i) => ({
                id: uuidv4(),
                visit_id: visitId,
                rank: diff.rank || i + 1,
                condition_name: diff.condition_name,
                confidence_score: diff.confidence_score,
                rationale: diff.rationale,
                suggested_investigations: diff.suggested_investigations,
                created_at: new Date().toISOString()
            }));
            await supabase.from('differentials').insert(items);
        }

        return differentials;
    } catch (error) {
        console.error("DDX generation failed:", error);
        return [];
    }
};

export const chatWithAI = async (messages) => {
    try {
        const hasSystemPrompt = messages.some(m => m.role === 'system');

        const systemPrompt = `### SYSTEM ROLE
You are an expert Clinical Diagnostic Assistant designed to interview a physician or patient. Your goal is to gather a complete medical history to build a precise differential diagnosis.

### INPUT CONTEXT
You will receive a stream of symptoms provided by the user. These symptoms may be incomplete or vague.

### OBJECTIVE
Analyze the provided symptoms and generate **ONE** high-yield follow-up inquiry. This inquiry must be designed to:
1. **Rule out emergencies:** Prioritize "Red Flag" symptoms (e.g., if chest pain, ask about radiation/sweating).
2. **Narrow the Differential:** Ask questions that distinguish between the most likely causes.
3. **Clarify:** Use clinical frameworks (SOCRATES, OPQRST) to flesh out vague symptoms.

### OPERATIONAL RULES
1. **NO DIAGNOSIS:** Do not offer a diagnosis, probability lists, or treatment advice at this stage.
2. **BE CONCISE:** Keep questions short, professional, and direct.
3. **COMPOUND EFFICIENCY:** You may combine 2-3 closely related queries into your "one" question.
4. **DYNAMIC ADAPTATION:** Adapt to the severity and type of symptoms presented.

### INTERNAL PROTOCOL (DO NOT REVEAL TO USER)
1. **Interview Limit:** You must ask exactly 4 questions in total across the conversation.
2. **Turn Tracking:** Count the number of "assistant" messages in the conversation history.
    - If count < 3: Ask your high-yield question as per the rules above.
    - If count == 3: Ask your FINAL question.
    - If count >= 4: Do NOT ask a question. Instead, output exactly: "I have enough information. Please click 'Generate Differentials' to see the analysis."
3. **JSON Output:** You MUST output valid JSON.
    IMPORTANT: You must include the word JSON in your response to satisfy the API requirement.
    Return ONLY valid JSON.
    {
    "message": "Your question or closing statement (in English, unless user requests otherwise)",
        "new_symptoms": ["symptom1", "symptom2"],
            "new_medications": ["med1", "med2"],
                "new_history": ["history1"]
}`;

        const finalMessages = hasSystemPrompt ? messages : [
            { role: 'system', content: systemPrompt },
            ...messages
        ];

        if (!LLM_API_KEY) {
            return { message: "System Error: AI API Key is missing.", new_symptoms: [], new_medications: [], new_history: [] };
        }

        const response = await fetch(`${LLM_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${LLM_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: LLM_MODEL, messages: finalMessages })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`LLM API Failed: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;

        try {
            let cleanContent = content.trim();
            if (cleanContent.startsWith('```')) {
                cleanContent = cleanContent.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '');
            }
            try {
                return JSON.parse(cleanContent);
            } catch (e) {
                const firstCurly = cleanContent.indexOf('{');
                const lastCurly = cleanContent.lastIndexOf('}');
                if (firstCurly !== -1 && lastCurly !== -1 && lastCurly > firstCurly) {
                    return JSON.parse(cleanContent.substring(firstCurly, lastCurly + 1));
                }
                throw e;
            }
        } catch (e) {
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

    try {
        const response = await fetch(`${LLM_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${LLM_API_KEY}`, 'Content-Type': 'application/json' },
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
                    { role: 'user', content: context }
                ],
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) throw new Error(`LLM API Error: ${response.statusText}`);

        const result = await response.json();
        let content = result.choices[0]?.message?.content || "{}";

        let cleanContent = content.trim();
        if (cleanContent.startsWith('```')) {
            cleanContent = cleanContent.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '');
        }
        if (!cleanContent.startsWith('{') && cleanContent.indexOf('{') !== -1) {
            cleanContent = cleanContent.substring(cleanContent.indexOf('{'));
            if (cleanContent.lastIndexOf('}') !== -1) {
                cleanContent = cleanContent.substring(0, cleanContent.lastIndexOf('}') + 1);
            }
        }

        const parsed = JSON.parse(cleanContent);

        if (parsed.investigative_suggestions) {
            parsed.investigative_suggestions = parsed.investigative_suggestions.map(item => ({
                ...item,
                Confidence_Score: item.Confidence_Score <= 1 ? Math.round(item.Confidence_Score * 100) : item.Confidence_Score,
                logistics: generateLabLogistics(item.Test_Name)
            }));
        }

        parsed.medications = (parsed.medications || []).map(item => ({
            ...item,
            logistics: generateMedicationLogistics(item.Name)
        }));

        const generatedSummary = `Patient presents with ${parsed.patient_analysis.Chief_Complaint || "unspecified complaints"}. Reported symptoms: ${parsed.patient_analysis.Symptoms || "none"}. Plan: ${parsed.patient_analysis.Treatment_Plan || "Consultation"}.`;

        try {
            await updateVisit(visitId, { clinical_analysis: parsed, summary: generatedSummary });
        } catch (saveError) {
            console.error("Failed to save clinical analysis:", saveError);
        }

        return parsed;
    } catch (error) {
        console.error("Analysis generation failed:", error);
        return {
            patient_analysis: {
                Age: "Unknown", Sex: "Unknown",
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
        source: classificationData.source || 'ai',
        created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('classifications').insert(classification);
    if (error) { console.error("Error creating classification:", error); throw error; }
    return classification;
};

export const getClassifications = async (visitId) => {
    const { data, error } = await supabase.from('classifications').select('*').eq('visit_id', visitId);
    if (error) { console.error("Error getting classifications:", error); return []; }
    return data || [];
};

export const generateClassifications = async (visitId) => {
    try {
        const visitData = await getVisit(visitId);
        const { visit, symptoms } = visitData;

        const context = `
Patient Information:
Chief Complaint: ${visit.chief_complaint}
Symptoms: ${symptoms.map(s => s.symptom_text).join(', ')}
Clinical Notes: ${visit.visit_notes || 'None'}

Based on this information, provide ICD-10 and SNOMED CT codes.
        `;

        const response = await fetch(`${LLM_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${LLM_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: LLM_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: `You are a medical coding AI assistant. Analyze the patient data and return ICD-10 and SNOMED CT codes.
Output Format (JSON):
{ "classifications": [{ "icd_code": "J18.9", "icd_description": "...", "snomed_code": "...", "snomed_description": "...", "confidence_score": 85 }] }
Return ONLY valid JSON. Provide 1-3 most relevant codes.`
                    },
                    { role: 'user', content: context }
                ],
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) throw new Error(`LLM API Error: ${response.statusText}`);

        const result = await response.json();
        let content = result.choices[0]?.message?.content || "{}";

        let cleanContent = content.trim();
        if (cleanContent.startsWith('```')) cleanContent = cleanContent.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '');
        if (!cleanContent.startsWith('{') && !cleanContent.startsWith('[') && cleanContent.indexOf('{') !== -1) {
            const start = Math.min(...[cleanContent.indexOf('{'), cleanContent.indexOf('[')].filter(n => n !== -1));
            const end = Math.max(cleanContent.lastIndexOf('}'), cleanContent.lastIndexOf(']'));
            if (start !== -1 && end !== -1) cleanContent = cleanContent.substring(start, end + 1);
        }

        const parsed = JSON.parse(cleanContent);
        const classifications = Array.isArray(parsed.classifications) ? parsed.classifications : (Array.isArray(parsed) ? parsed : []);

        const stored = [];
        for (const cls of classifications) {
            const s = await createClassification({
                visitId,
                icdCode: cls.icd_code,
                icdDescription: cls.icd_description,
                snomedCode: cls.snomed_code,
                snomedDescription: cls.snomed_description,
                confidenceScore: cls.confidence_score || 85,
                source: 'ai'
            });
            stored.push(s);
        }
        return stored;
    } catch (error) {
        console.error("Classification generation failed:", error);
        return [];
    }
};

export const createSymptomHistory = async (historyData) => {
    const history = {
        id: uuidv4(),
        visit_id: historyData.visitId,
        symptom_text: historyData.symptomText,
        severity: historyData.severity || 'moderate',
        duration_days: historyData.durationDays || 0,
        onset_date: historyData.onsetDate || new Date().toISOString(),
        resolved_date: historyData.resolvedDate || null,
        notes: historyData.notes || '',
        created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('symptom_history').insert(history);
    if (error) { console.error("Error creating symptom history:", error); throw error; }
    return history;
};

export const getSymptomHistory = async (visitId) => {
    const { data, error } = await supabase
        .from('symptom_history').select('*').eq('visit_id', visitId).order('created_at', { ascending: true });
    if (error) { console.error("Error getting symptom history:", error); return []; }
    return data || [];
};

export const getTriageQueue = async () => {
    return [
        {
            id: 'triage-1', name: 'Rajesh Kumar', age: 45, sex: 'M',
            chiefComplaint: 'Chest pain radiating to left arm',
            vitals: { hr: 110, spo2: 96, temp: 37.2 },
            level: { priority: 2, reason: "Possible Cardiac Event" },
            timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString()
        },
        {
            id: 'triage-2', name: 'Priya Sharma', age: 28, sex: 'F',
            chiefComplaint: 'High fever and severe headache',
            vitals: { hr: 102, spo2: 98, temp: 39.5 },
            level: { priority: 3, reason: "Infection/Febrile Illness" },
            timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString()
        },
        {
            id: 'triage-3', name: 'Amit Patel', age: 62, sex: 'M',
            chiefComplaint: 'Difficulty breathing',
            vitals: { hr: 95, spo2: 88, temp: 36.8 },
            level: { priority: 1, reason: "Respiratory Distress (Low SpO2)" },
            timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString()
        }
    ];
};

export const createTriageAssessment = async (data) => {
    return { id: uuidv4(), ...data, status: 'created' };
};

export const summarizeConversation = async (messages) => {
    return { summary: "Conversation summarized." };
};
