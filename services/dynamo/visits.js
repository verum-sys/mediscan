
import { PutCommand, GetCommand, UpdateCommand, QueryCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';
import { docClient, detectAreaFromPincode } from './client.js';

export const createVisit = async (visitData) => {
    const id = visitData.id || uuidv4();
    const visit = {
        id,
        visit_number: visitData.visit_number || `VS-${Date.now().toString().slice(-6)}`,
        patient_name: visitData.patientName || 'Unknown',
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

export const getMockQueueData = () => [
    {
        id: 'mock-inc-1',
        visit_number: 'OPD-2024-INC01',
        patient_name: 'Unknown Male',
        chief_complaint: '', // Empty for incomplete flag
        facility_name: 'Emergency Triage',
        department: 'Trauma',
        provider_name: 'Triage Nurse',
        status: 'incomplete',
        confidence_score: 40,
        created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        visit_notes: 'Patient brought in unconscious. Identification pending.',
        criticality: 'Unknown',
        needs_follow_up: true
    },
    {
        id: 'mock-inc-2',
        visit_number: 'OPD-2024-INC02',
        patient_name: 'Priya (Surname Unknown)',
        chief_complaint: 'Severe Abdominal Pain',
        facility_name: 'Mediscan Central',
        department: 'Gastroenterology',
        provider_name: 'Dr. Emily Davis',
        status: 'incomplete',
        confidence_score: 55,
        created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        visit_notes: 'Insurance details and past history not available.',
        criticality: 'Stable',
        needs_follow_up: true
    },
    {
        id: 'mock-q-6',
        visit_number: 'OPD-2024-901',
        patient_name: 'Rajesh Kumar',
        chief_complaint: 'Fluctuations in blood sugar levels, dizziness',
        facility_name: 'Mediscan Central',
        department: 'Endocrinology',
        provider_name: 'Dr. R. Kapoor',
        status: 'waiting',
        confidence_score: 95,
        created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(), // 10 mins ago
        visit_notes: 'Patient reports fasting BS > 180. Feeling dizzy often.',
        criticality: 'Stable',
        needs_follow_up: true
    },
    {
        id: 'mock-q-7',
        visit_number: 'OPD-2024-902',
        patient_name: 'Sita Devi',
        chief_complaint: 'Severe shortness of breath, wheezing',
        facility_name: 'Mediscan Central',
        department: 'Pulmonology',
        provider_name: 'Dr. Alan Smith',
        status: 'in_progress',
        confidence_score: 88,
        created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(), // 25 mins ago
        visit_notes: 'History of asthma. Acute exacerbation triggered by dust.',
        criticality: 'Critical',
        criticality_reason: 'Low SpO2 (92%)'
    },
    {
        id: 'mock-q-8',
        visit_number: 'OPD-2024-903',
        patient_name: 'Vikram Singh',
        chief_complaint: 'Follow-up for fracture healing (Right Arm)',
        facility_name: 'Mediscan Central',
        department: 'Orthopedics',
        provider_name: 'Dr. M. Irfan',
        status: 'completed',
        confidence_score: 98,
        created_at: new Date(Date.now() - 1000 * 60 * 40).toISOString(), // 40 mins ago
        visit_notes: 'Cast removed. X-ray shows good callus formation.',
        needs_follow_up: false
    },
    {
        id: 'mock-q-9',
        visit_number: 'OPD-2024-904',
        patient_name: 'Anita Desai',
        chief_complaint: 'High fever (103F) with body ache',
        facility_name: 'Mediscan Central',
        department: 'General Medicine',
        provider_name: 'Dr. Sarah Johnson',
        status: 'waiting',
        confidence_score: 85,
        created_at: new Date(Date.now() - 1000 * 60 * 55).toISOString(), // 55 mins ago
        visit_notes: 'Suspected viral fever or Dengue. Platelets check advised.',
        criticality: 'warning'
    },
    {
        id: 'mock-q-10',
        visit_number: 'OPD-2024-905',
        patient_name: 'Arjun Mehta',
        chief_complaint: 'Chronic burning sensation in stomach',
        facility_name: 'Mediscan Central',
        department: 'Gastroenterology',
        provider_name: 'Dr. Emily Davis',
        status: 'waiting',
        confidence_score: 90,
        created_at: new Date(Date.now() - 1000 * 60 * 70).toISOString(), // 1h 10m ago
        visit_notes: 'Reports acid reflux particularly at night.',
        needs_follow_up: true
    },
    // Original Mocks (Pushed down by time)
    {
        id: 'mock-q-1',
        visit_number: 'OPD-2024-892',
        patient_name: 'John Doe',
        chief_complaint: 'Severe chest pain radiating to left arm',
        facility_name: 'City General Hospital',
        department: 'Cardiology',
        provider_name: 'Dr. Sarah Johnson',
        status: 'in_progress',
        confidence_score: 92,
        created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
        visit_notes: 'Patient presented with sudden onset cp...',
        criticality: 'Critical',
        criticality_reason: 'Potential ACS'
    },
    {
        id: 'mock-q-2',
        visit_number: 'OPD-2024-891',
        patient_name: 'Jane Smith',
        chief_complaint: 'Persistent dry cough and fever',
        facility_name: 'City General Hospital',
        department: 'Pulmonology',
        provider_name: 'Dr. Alan Smith',
        status: 'completed',
        confidence_score: 88,
        created_at: new Date(Date.now() - 1000 * 60 * 150).toISOString(),
        visit_notes: 'Cough for 3 weeks...'
    },
    {
        id: 'mock-q-3',
        visit_number: 'OPD-2024-890',
        patient_name: 'Robert Brown',
        chief_complaint: 'Migraine with aura',
        facility_name: 'City General Hospital',
        department: 'Neurology',
        provider_name: 'Dr. Emily Davis',
        status: 'waiting',
        confidence_score: 75,
        created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString()
    },
    {
        id: 'mock-q-4',
        visit_number: 'OPD-2024-889',
        patient_name: 'Michael Wilson',
        chief_complaint: 'Abdominal pain, lower right quadrant',
        facility_name: 'City General Hospital',
        department: 'Emergency',
        provider_name: 'Dr. M. Irfan',
        status: 'in_progress',
        confidence_score: 65,
        created_at: new Date(Date.now() - 1000 * 60 * 210).toISOString()
    },
    {
        id: 'mock-q-5',
        visit_number: 'OPD-2024-888',
        patient_name: 'Linda Taylor',
        chief_complaint: 'Routine diabetic checkup',
        facility_name: 'City General Hospital',
        department: 'Endocrinology',
        provider_name: 'Dr. R. Kapoor',
        status: 'completed',
        confidence_score: 95,
        created_at: new Date(Date.now() - 1000 * 60 * 240).toISOString()
    }
];

export const getVisit = async (visitId) => {
    try {
        let visit;
        let symptoms = [];
        let medications = [];
        let differentials = [];
        let patient_history = null; // MOVED HERE - must be declared before the try block

        // 1. Try DynamoDB First (Skip for mocks to force rich demo data)
        if (!visitId.startsWith('mock-')) {
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
            visit = getMockQueueData().find(v => v.id === visitId);
            if (visit) {
                // Generate tailored data for each mock visit
                if (visit.id === 'mock-q-7') {
                    // Sita - Asthma
                    symptoms = [
                        { id: 'sym-7a', symptom_text: 'Severe Wheezing', confidence_score: 95, severity: 'Severe' },
                        { id: 'sym-7b', symptom_text: 'Shortness of Breath', confidence_score: 92, severity: 'Severe' }
                    ];
                    medications = [
                        { medication_name: 'Levolin Inhaler', date_prescribed: '2024-11-20', status: 'Active' },
                        { medication_name: 'Montelukast 10mg', date_prescribed: '2024-11-20', status: 'Active' }
                    ];
                    patient_history = {
                        summary: "Patient is a 45-year-old female. Known history of Asthma since childhood.",
                        journey: [
                            {
                                date: "2024-11-20", title: "Pulmonology Consult", dept: "Pulmonology",
                                details: "Slight wheezing. Inhaler prescribed.",
                                prescriptions: ["Levolin Inhaler", "Montelukast 10mg"], vitals: "SpO2: 96%"
                            },
                            {
                                date: "2024-09-10", title: "Viral Fever", dept: "General Medicine",
                                details: "Fever 101F. Prescribed Paracetamol.", prescriptions: ["Dolo 650"], vitals: "Temp: 101F"
                            }
                        ]
                    };
                } else if (visit.id === 'mock-q-9') {
                    // Anita - Fever
                    symptoms = [
                        { id: 'sym-9a', symptom_text: 'High Fever (103F)', confidence_score: 98, severity: 'Severe' },
                        { id: 'sym-9b', symptom_text: 'Generalized Body Ache', confidence_score: 90, severity: 'Moderate' }
                    ];
                    medications = [
                        { medication_name: 'Paracetamol 650mg', date_prescribed: '2024-12-19', status: 'Active' }
                    ];
                    patient_history = {
                        summary: "Patient is a 28-year-old female. Known history of seasonal allergies.",
                        journey: [
                            {
                                date: "2024-09-10", title: "Viral Fever Checkup", dept: "General Medicine",
                                details: "Similar episode of fever.", prescriptions: ["Dolo 650"], vitals: "Temp: 100F"
                            }
                        ]
                    };
                } else if (visit.id === 'mock-q-6') {
                    // Rajesh - Diabetes
                    symptoms = [
                        { id: 'sym-6a', symptom_text: 'Dizziness', confidence_score: 85, severity: 'Moderate' },
                        { id: 'sym-6b', symptom_text: 'Excessive Thirst (Polydipsia)', confidence_score: 90, severity: 'Mild' }
                    ];
                    medications = [
                        { medication_name: 'Metformin 1000mg', date_prescribed: '2024-10-12', status: 'Active' },
                        { medication_name: 'Glimepiride 1mg', date_prescribed: '2024-10-12', status: 'Active' }
                    ];
                    patient_history = RICH_MOCK_HISTORY;
                } else if (visit.id === 'mock-q-8') {
                    // Vikram - Ortho
                    symptoms = [
                        { id: 'sym-8a', symptom_text: 'Mild Pain in Right Arm', confidence_score: 80, severity: 'Mild' }
                    ];
                    medications = [
                        { medication_name: 'Calcium + Vit D3', date_prescribed: '2024-12-01', status: 'Active' }
                    ];
                    patient_history = {
                        summary: "Patient is a 32-year-old male. Recovering from fracture.",
                        journey: [
                            {
                                date: "2024-12-01", title: "Fracture Review", dept: "Orthopedics",
                                details: "Cast check. Healing well.", prescriptions: ["Calcium"], vitals: "Stable"
                            },
                            {
                                date: "2024-11-15", title: "Initial Visit - Fracture", dept: "Emergency",
                                details: "Fall injury. X-ray done.", year: "2024"
                            }
                        ]
                    };
                } else if (visit.id === 'mock-q-10') {
                    // Arjun - Gastro
                    symptoms = [
                        { id: 'sym-10a', symptom_text: 'Burning Sensation in Stomach', confidence_score: 90, severity: 'Moderate' },
                        { id: 'sym-10b', symptom_text: 'Acid Reflux', confidence_score: 88, severity: 'Moderate' }
                    ];
                    medications = [
                        { medication_name: 'Pantoprazole 40mg', date_prescribed: '2024-12-01', status: 'Active' },
                        { medication_name: 'Sucralfate Syrup', date_prescribed: '2024-12-01', status: 'Active' }
                    ];
                    patient_history = {
                        summary: "Patient is a 40-year-old male. History of GERD and Gastritis.",
                        journey: [
                            {
                                date: "2024-12-01", title: "Gastro Consult", dept: "Gastroenterology",
                                details: "Endoscopy planned.", prescriptions: ["Pan 40"], vitals: "Stable"
                            }
                        ]
                    };
                } else {
                    // Fallback for mock-q-1...5 (Generic)
                    symptoms = [
                        { id: 'sym-1', symptom_text: 'General Weakness', confidence_score: 80, severity: 'Mild' }
                    ];
                    patient_history = RICH_MOCK_HISTORY;
                }
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
