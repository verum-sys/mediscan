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

        return {
            todayTotal,
            highRisk,
            incompleteData,
            followUp,
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
        return visits.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 20).map(v => ({
            ...v,
            has_high_risk: (v.confidence_score < 70),
            needs_follow_up: false // logic can be improved
        }));
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
        const response = await fetch(`${LLM_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${LLM_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: LLM_MODEL,
                messages: messages,
                response_format: { type: "json_object" }
            })
        });
        const data = await response.json();
        return data.choices[0]?.message?.content;
    } catch (e) {
        console.error(e);
        return "Error connecting to AI";
    }
};

// Placeholder for other functions if needed
export const getAnalytics = async () => ({});
export const createTriageAssessment = async () => ({});
export const getTriageQueue = async () => ([]);
export const summarizeConversation = async () => ({});
export const generateClinicalAnalysis = async () => ({});
