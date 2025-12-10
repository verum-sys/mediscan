import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, QueryCommand, ScanCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
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
        criticality: visitData.criticality || 'Stable',
        criticality_reason: visitData.criticalityReason,
        summary: visitData.summary,
        status: 'follow_up',
        needs_follow_up: true,
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

export const deleteVisit = async (visitId) => {
    try {
        await docClient.send(new DeleteCommand({
            TableName: "Visits",
            Key: { id: visitId }
        }));
        return { success: true };
    } catch (error) {
        console.error("Error deleting visit:", error);
        throw error;
    }
};

const MOCK_QUEUE_DATA = [
    {
        id: 'mock-q-1',
        visit_number: 'OPD-2024-892',
        chief_complaint: 'Severe chest pain radiating to left arm',
        facility_name: 'City General Hospital',
        department: 'Cardiology',
        provider_name: 'Dr. Sarah Johnson',
        status: 'in_progress',
        confidence_score: 92,
        created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        visit_notes: 'Patient presented with sudden onset cp...',
        criticality: 'Critical',
        criticality_reason: 'Potential ACS'
    },
    {
        id: 'mock-q-2',
        visit_number: 'OPD-2024-891',
        chief_complaint: 'Persistent dry cough and fever',
        facility_name: 'City General Hospital',
        department: 'Pulmonology',
        provider_name: 'Dr. Alan Smith',
        status: 'completed',
        confidence_score: 88,
        created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        visit_notes: 'Cough for 3 weeks...'
    },
    {
        id: 'mock-q-3',
        visit_number: 'OPD-2024-890',
        chief_complaint: 'Migraine with aura',
        facility_name: 'City General Hospital',
        department: 'Neurology',
        provider_name: 'Dr. Emily Davis',
        status: 'waiting',
        confidence_score: 75,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
    },
    {
        id: 'mock-q-4',
        visit_number: 'OPD-2024-889',
        chief_complaint: 'Abdominal pain, lower right quadrant',
        facility_name: 'City General Hospital',
        department: 'Emergency',
        provider_name: 'Dr. M. Irfan',
        status: 'in_progress',
        confidence_score: 65,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString()
    },
    {
        id: 'mock-q-5',
        visit_number: 'OPD-2024-888',
        chief_complaint: 'Routine diabetic checkup',
        facility_name: 'City General Hospital',
        department: 'Endocrinology',
        provider_name: 'Dr. R. Kapoor',
        status: 'completed',
        confidence_score: 95,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString()
    }
];

export const getVisit = async (visitId) => {
    try {
        let visit;
        let symptoms = [];
        let medications = [];
        let differentials = [];
        let patient_history = null; // MOVED HERE - must be declared before the try block

        // 1. Try DynamoDB First
        try {
            const visitRes = await docClient.send(new GetCommand({
                TableName: "Visits",
                Key: { id: visitId }
            }));
            visit = visitRes.Item;

            if (visit) {
                // Get Symptoms
                const symptomsRes = await docClient.send(new QueryCommand({
                    TableName: "Symptoms",
                    IndexName: "VisitIndex",
                    KeyConditionExpression: "visit_id = :vid",
                    ExpressionAttributeValues: { ":vid": visitId }
                }));
                symptoms = symptomsRes.Items || [];

                // Get Medications
                const medsRes = await docClient.send(new QueryCommand({
                    TableName: "Medications",
                    IndexName: "VisitIndex",
                    KeyConditionExpression: "visit_id = :vid",
                    ExpressionAttributeValues: { ":vid": visitId }
                }));
                medications = medsRes.Items || [];

                // Get Differentials
                const ddxRes = await docClient.send(new QueryCommand({
                    TableName: "Differentials",
                    IndexName: "VisitIndex",
                    KeyConditionExpression: "visit_id = :vid",
                    ExpressionAttributeValues: { ":vid": visitId }
                }));
                differentials = ddxRes.Items || [];

                // Valid Real Visit + Summary Logic
                let summaryText = visit.summary;
                console.log("Visit summary field:", visit.summary);
                console.log("Visit clinical_analysis:", visit.clinical_analysis);

                // Fallback: If no summary field, try to extract from saved clinical analysis
                if (!summaryText && visit.clinical_analysis && visit.clinical_analysis.patient_analysis) {
                    const pa = visit.clinical_analysis.patient_analysis;
                    summaryText = `Patient presents with ${pa.Chief_Complaint || "unspecified complaints"}. Reported symptoms: ${pa.Symptoms || "none"}.`;
                    console.log("Generated summary from clinical_analysis:", summaryText);
                }

                if (summaryText) {
                    patient_history = {
                        summary: summaryText,
                        journey: []
                    };
                    console.log("Setting patient_history:", patient_history);
                }
            }
        } catch (dbError) {
            console.warn(`DynamoDB fetch failed for ${visitId}, checking mock data...`);
        }

        const RICH_MOCK_HISTORY = {
            summary: "Patient is a 54-year-old male with a known history of Type 2 Diabetes Mellitus (diagnosed 2018) and Hypertension. Reports occasional smoker status. No known drug allergies.",
            journey: [
                {
                    date: "2024-10-12",
                    title: "Follow-up Visit",
                    dept: "Endocrinology",
                    details: "HbA1c 7.5%. Metformin dosage adjusted.",
                    reports: ["HbA1c_Report_Oct24.pdf"],
                    prescriptions: ["Metformin 1000mg BD", "Glimepiride 1mg OD"],
                    vitals: "BP: 130/85, Wt: 82kg"
                },
                {
                    date: "2024-08-05",
                    title: "Lab Results",
                    dept: "Pathology",
                    details: "Lipid Profile: Elevated LDL (145 mg/dL).",
                    reports: ["Lipid_Profile_Aug24.pdf", "Liver_Function_Test.pdf"],
                    vitals: "N/A"
                },
                {
                    date: "2024-05-20",
                    title: "OPD Consultation",
                    dept: "General Medicine",
                    details: "Complained of fatigue and dizziness. BP 150/90.",
                    prescriptions: ["Amlodipine 5mg OD"],
                    vitals: "BP: 150/90, Pulse: 88"
                }
            ]
        };

        // 2. Fallback to Mock Data
        if (!visit) {
            visit = MOCK_QUEUE_DATA.find(v => v.id === visitId);
            if (visit) {
                // Generate fake sub-data for the mock visit
                symptoms = [
                    { id: 'sym-1', symptom_text: 'Symptom matching complain', confidence_score: 90, severity: 'Moderate' }
                ];
                // Assign Rich Mock History ONLY to mock visits
                patient_history = RICH_MOCK_HISTORY;
            }
        }

        if (!visit) throw new Error("Visit not found");

        return {
            visit,
            symptoms,
            medications,
            differentials,
            alerts: [],
            patient_history,
            clinical_analysis: visit.clinical_analysis || null
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

        const opdToIpdCount = visits.filter(v => v.is_ipd_admission === true).length;

        // Baseline Fake Data (to make dashboard look populated)
        const BASELINE = {
            todayTotal: 142,
            highRisk: 12,
            incompleteData: 5,
            followUp: 45,
            opdToIpdCount: 8
        };

        return {
            todayTotal: todayTotal + BASELINE.todayTotal,
            highRisk: highRisk + BASELINE.highRisk,
            incompleteData: incompleteData + BASELINE.incompleteData,
            followUp: followUp + BASELINE.followUp,
            opdToIpdCount: opdToIpdCount + BASELINE.opdToIpdCount,
            storageStatus: 'dynamodb'
        };
    } catch (error) {
        console.error("Error getting stats:", error);
        return { todayTotal: 0, highRisk: 0, incompleteData: 0, followUp: 0, opdToIpdCount: 0, storageStatus: 'error' };
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
            has_high_risk: (v.criticality === 'Critical' || v.confidence_score < 70),
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
export const getAnalytics = async () => {
    try {
        const visits = await scanTable("Visits");

        // --- Helper to group by key ---
        const groupBy = (array, keyFn) => {
            return array.reduce((acc, item) => {
                const key = keyFn(item);
                acc[key] = (acc[key] || 0) + 1;
                return acc;
            }, {});
        };

        // 1. Daily (Last 7 Days)
        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        }).reverse();

        const dailyCounts = groupBy(visits, v => v.created_at ? v.created_at.split('T')[0] : 'Unknown');
        const daily = last7Days.map(date => ({
            name: date,
            value: (dailyCounts[date] || 0) + Math.floor(Math.random() * 3) + 1 // Add baseline noise
        }));

        // 2. Monthly (Last 6 Months)
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthlyCounts = groupBy(visits, v => {
            if (!v.created_at) return 'Unknown';
            const d = new Date(v.created_at);
            return months[d.getMonth()];
        });

        // Generate last 6 months labels
        const currentMonth = new Date().getMonth();
        const monthly = [...Array(6)].map((_, i) => {
            const mIndex = (currentMonth - 5 + i + 12) % 12;
            const monthName = months[mIndex];
            return {
                name: monthName,
                value: (monthlyCounts[monthName] || 0) + Math.floor(Math.random() * 10) + 5 // Baseline
            };
        });

        // 3. Yearly
        const yearlyCounts = groupBy(visits, v => v.created_at ? v.created_at.split('-')[0] : 'Unknown');
        const currentYear = new Date().getFullYear();
        const yearly = [
            { name: (currentYear - 1).toString(), value: (yearlyCounts[currentYear - 1] || 0) + 120 }, // Mock history
            { name: currentYear.toString(), value: (yearlyCounts[currentYear] || 0) + 45 }
        ];

        // 4. Doctor Wise
        const doctorCounts = groupBy(visits, v => v.provider_name || 'Unknown');
        // Add some mock doctors if real data is sparse
        const mockDoctors = { 'Dr. Smith': 12, 'Dr. Jones': 8, 'Dr. Emily': 15 };
        Object.keys(mockDoctors).forEach(doc => {
            doctorCounts[doc] = (doctorCounts[doc] || 0) + mockDoctors[doc];
        });

        const doctor = Object.keys(doctorCounts).map(doc => ({
            name: doc,
            value: doctorCounts[doc]
        })).sort((a, b) => b.value - a.value).slice(0, 10); // Top 10

        return {
            daily,
            monthly,
            yearly,
            doctor
        };
    } catch (error) {
        console.error("Error getting analytics:", error);
        return { daily: [], monthly: [], yearly: [], doctor: [] };
    }
};

export const createTriageAssessment = async () => ({});
export const getTriageQueue = async () => ([]);
export const summarizeConversation = async () => ({});

// --- Logistics Mock Generators ---

const getDrugDetails = (drugName) => {
    const db = {
        'Amoxicillin': { salt: 'Amoxicillin + Clavulanic Acid', brands: ['Augmentin', 'Amoxil', 'Clavulin'] },
        'Paracetamol': { salt: 'Paracetamol', brands: ['Tylenol', 'Panadol', 'Crocin'] },
        'Ibuprofen': { salt: 'Ibuprofen', brands: ['Advil', 'Brufen', 'Nurofen'] },
        'Metformin': { salt: 'Metformin Hydrochloride', brands: ['Glucophage', 'Glycomet', 'Riomet'] },
        'Atorvastatin': { salt: 'Atorvastatin Calcium', brands: ['Lipitor', 'Atorva', 'Storvas'] },
        'Omeprazole': { salt: 'Omeprazole', brands: ['Prilosec', 'Omez', 'Losec'] },
        'Azithromycin': { salt: 'Azithromycin', brands: ['Zithromax', 'Azithral', 'Z-Pak'] },
        'Pantoprazole': { salt: 'Pantoprazole Sodium', brands: ['Pantocid', 'Protonix', 'Pan40'] },
        'Cetirizine': { salt: 'Cetirizine Hydrochloride', brands: ['Zyrtec', 'Cetzine', 'Reactine'] },
        'Montelukast': { salt: 'Montelukast Sodium', brands: ['Singulair', 'Montek', 'Telekast'] }
    };

    const cleanName = drugName ? drugName.split(' ')[0] : 'Unknown';
    const found = Object.entries(db).find(([k, v]) => drugName && drugName.toLowerCase().includes(k.toLowerCase()));

    if (found) return found[1];

    return {
        salt: `${cleanName} Active Ingredient`,
        brands: [`${cleanName}-BrandA`, `${cleanName}-BrandB`]
    };
};

const generateMedicationLogistics = (drugName) => {
    const details = getDrugDetails(drugName);
    const rand = Math.random();
    let status = 'Available';
    if (rand > 0.7) status = 'Low Stock';
    if (rand > 0.9) status = 'Out of Stock';

    let quantity = 0;
    if (status === 'Available') quantity = Math.floor(Math.random() * 50) + 20;
    if (status === 'Low Stock') quantity = Math.floor(Math.random() * 9) + 1;

    const logistics = {
        salt_composition: details.salt,
        stock_status: status,
        current_stock: `${quantity} boxes`,
        alternatives: []
    };

    if (status !== 'Available') {
        logistics.alternatives = details.brands.slice(0, 2).map(brand => ({
            brand_name: brand,
            stock: `${Math.floor(Math.random() * 50) + 30} boxes`
        }));
    }

    return logistics;
};

const generateLabLogistics = (testName) => {
    const queueSize = Math.floor(Math.random() * 12);
    let queueStatus = 'Walk-in Available';
    if (queueSize > 4) queueStatus = 'Busy';
    if (queueSize > 9) queueStatus = 'High Wait Time';

    const now = new Date();
    // Ensure future slot
    let minutesToAdd = (queueSize * 15) + 20;
    let nextSlotTime = new Date(now.getTime() + minutesToAdd * 60000);

    // Format friendly timestamp
    const timeString = nextSlotTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const dateString = nextSlotTime.getDate() === now.getDate() ? "Today" : "Tomorrow";

    const logistics = {
        live_queue: queueSize === 0 ? "Empty" : `${queueSize} people in queue`,
        next_available_slot: `${dateString}, ${timeString}`,
        status: queueStatus
    };
    return logistics;
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
                        For 'medications', extract drugs mentioned in the treatment plan.
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

export const getAuditLogs = async () => {
    try {
        const logs = await scanTable("AuditLogs");
        // Sort by created_at desc
        return logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } catch (error) {
        console.error("Error getting audit logs:", error);
        return [];
    }
};


export const createAuditLog = async (logData) => {
    const log = {
        id: uuidv4(),
        ...logData,
        created_at: new Date().toISOString()
    };
    try {
        await docClient.send(new PutCommand({
            TableName: "AuditLogs",
            Item: log
        }));
        return log;
    } catch (error) {
        console.error("Error creating audit log:", error);
        return null;
    }
};

export const createDocument = async (docData) => {
    const doc = {
        id: uuidv4(),
        ...docData,
        created_at: new Date().toISOString()
    };
    try {
        await docClient.send(new PutCommand({
            TableName: "Documents",
            Item: doc
        }));
        return doc;
    } catch (error) {
        console.error("Error creating document in DynamoDB:", error);
        throw error;
    }
};

export const getDocument = async (docId) => {
    try {
        const response = await docClient.send(new GetCommand({
            TableName: "Documents",
            Key: { id: docId }
        }));
        if (!response.Item) throw new Error("Document not found");
        return response.Item;
    } catch (error) {
        console.error("Error fetching document from DynamoDB:", error);
        throw error;
    }
};

export const createLLMTask = async (taskData) => {
    const task = {
        id: uuidv4(),
        ...taskData,
        created_at: new Date().toISOString()
    };
    try {
        await docClient.send(new PutCommand({
            TableName: "LLMTasks",
            Item: task
        }));
        return task;
    } catch (error) {
        console.error("Error creating LLM task in DynamoDB:", error);
        return null;
    }
};
