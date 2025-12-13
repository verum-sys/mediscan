
import { PutCommand, GetCommand, UpdateCommand, QueryCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';
import { docClient, detectAreaFromPincode } from './client.js';

export const createVisit = async (visitData) => {
    const id = uuidv4();
    const visit = {
        id,
        visit_number: visitData.visit_number || `VS-${Date.now().toString().slice(-6)}`,
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
        pincode: visitData.pincode || 'UNKNOWN',
        area: visitData.area || detectAreaFromPincode(visitData.pincode),
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

export const MOCK_QUEUE_DATA = [
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
