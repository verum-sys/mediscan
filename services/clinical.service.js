
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const LLM_API_KEY = process.env.LLM_API_KEY;
const LLM_BASE_URL = process.env.LLM_BASE_URL || 'https://api.cerebras.ai/v1';
const LLM_MODEL = process.env.LLM_MODEL || 'llama-3.3-70b';

// In-memory store for fallback when DB is down
const mockVisitsStore = new Map();
const mockSymptomsStore = new Map();

export const createVisit = async (visitData) => {
    console.log("Creating visit with data:", JSON.stringify(visitData, null, 2));

    const { data, error } = await supabase
        .from('visits')
        .insert([{
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
        }])
        .select()
        .single();

    if (error) {
        console.error("Error creating visit in DB:", error);

        // Create a dynamic mock visit and store it in memory
        const mockId = 'mock-visit-id-' + Date.now();
        const mockVisit = {
            id: mockId,
            visit_number: 'TEMP-' + Math.floor(Math.random() * 1000),
            facility_name: visitData.facilityName || 'Unknown Facility',
            department: visitData.department || 'General',
            provider_name: visitData.providerName || 'Unknown Provider',
            chief_complaint: visitData.chiefComplaint || 'Not specified',
            visit_notes: visitData.visitNotes || '',
            source_type: visitData.sourceType,
            source_document_id: visitData.sourceDocumentId,
            confidence_score: visitData.confidenceScore || 80,
            created_at: new Date().toISOString(),
            status: 'in_progress'
        };

        mockVisitsStore.set(mockId, mockVisit);
        console.log("Stored mock visit in memory:", mockId);

        return mockVisit;
    }
    return data;
};

const mockDifferentialsStore = new Map();

export const getVisit = async (visitId) => {
    // Handle mock IDs from in-memory store
    if (visitId && visitId.startsWith('mock-visit-id-')) {
        const storedVisit = mockVisitsStore.get(visitId);

        if (storedVisit) {
            const storedSymptoms = mockSymptomsStore.get(visitId) || [];
            const storedDifferentials = mockDifferentialsStore.get(visitId) || [];
            return {
                visit: storedVisit,
                symptoms: storedSymptoms,
                differentials: storedDifferentials,
                alerts: []
            };
        }

        // Fallback if not found in memory (shouldn't happen in same session)
        return {
            visit: {
                id: visitId,
                visit_number: 'MOCK-ERR',
                facility_name: 'Session Expired',
                department: 'General',
                provider_name: 'System',
                chief_complaint: 'Data lost (Server restarted)',
                status: 'in_progress',
                confidence_score: 0,
                created_at: new Date().toISOString(),
                visit_notes: 'The in-memory visit data was lost because the server restarted.'
            },
            symptoms: [],
            differentials: [],
            alerts: []
        };
    }

    const { data: visit, error: visitError } = await supabase
        .from('visits')
        .select('*')
        .eq('id', visitId)
        .single();

    if (visitError) {
        console.error("Error fetching visit:", visitError);
        throw visitError;
    }

    const { data: symptoms } = await supabase
        .from('symptoms')
        .select('*')
        .eq('visit_id', visitId);

    // Fetch differentials from DB if table exists (assuming 'differentials' table)
    // For now, we'll just check the mock store as a fallback or hybrid
    const storedDifferentials = mockDifferentialsStore.get(visitId) || [];

    return {
        visit,
        symptoms: symptoms || [],
        differentials: storedDifferentials,
        alerts: []
    };
};

export const addSymptoms = async (visitId, symptoms) => {
    if (visitId.startsWith('mock-')) {
        const currentSymptoms = mockSymptomsStore.get(visitId) || [];
        const newSymptoms = symptoms.map((s, i) => ({
            id: `mock-symptom-${Date.now()}-${i}`,
            visit_id: visitId,
            symptom_text: s.text,
            confidence_score: s.confidenceScore,
            severity: s.severity,
            duration: s.duration,
            source: s.source,
            raw_text: s.rawText,
            confidence: s.confidenceScore > 80 ? 'high' : 'medium'
        }));

        mockSymptomsStore.set(visitId, [...currentSymptoms, ...newSymptoms]);
        return newSymptoms;
    }

    const records = symptoms.map(s => ({
        visit_id: visitId,
        symptom_text: s.text,
        confidence_score: s.confidenceScore,
        severity: s.severity,
        duration: s.duration,
        source: s.source,
        raw_text: s.rawText
    }));

    const { data, error } = await supabase
        .from('symptoms')
        .insert(records)
        .select();

    if (error) {
        console.error("Error adding symptoms:", error);
        return [];
    }
    return data;
};

export const generateClinicalAnalysis = async (visitId) => {
    // 1. Get Visit Data
    let visitData;
    try {
        visitData = await getVisit(visitId);
    } catch (e) {
        console.error("Failed to fetch visit for analysis:", e);
        throw new Error("Visit not found");
    }

    const { visit, symptoms } = visitData;
    const context = `
    Patient Visit Info:
    Chief Complaint: ${visit.chief_complaint}
    Notes: ${visit.visit_notes}
    Symptoms: ${symptoms.map(s => s.symptom_text).join(', ')}
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
        return JSON.parse(content);

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

export const getStats = async () => {
    // 1. Fetch all visits (DB + Memory)
    const { data: dbVisits, error } = await supabase
        .from('visits')
        .select('*');

    const mockVisits = Array.from(mockVisitsStore.values());
    const allVisits = [...mockVisits, ...(dbVisits || [])];

    // 2. Calculate Stats
    const today = new Date().toISOString().split('T')[0];

    const todayTotal = allVisits.filter(v =>
        v.created_at && v.created_at.startsWith(today)
    ).length;

    // Logic for High Risk: Low confidence or explicit mention
    const highRisk = allVisits.filter(v =>
        (v.confidence_score && v.confidence_score < 60) ||
        (v.visit_notes && v.visit_notes.toLowerCase().includes('high risk')) ||
        (v.chief_complaint && v.chief_complaint.toLowerCase().includes('severe')) ||
        (v.chief_complaint && v.chief_complaint.toLowerCase().includes('emergency'))
    ).length;

    // Logic for Incomplete: Missing core fields
    const incompleteData = allVisits.filter(v =>
        !v.chief_complaint ||
        !v.provider_name ||
        v.provider_name === 'Unknown Provider' ||
        v.status === 'incomplete'
    ).length;

    // Logic for Follow Up: Explicit mention
    const followUp = allVisits.filter(v =>
        (v.visit_notes && v.visit_notes.toLowerCase().includes('follow up')) ||
        (v.visit_notes && v.visit_notes.toLowerCase().includes('review'))
    ).length;

    return {
        todayTotal,
        highRisk,
        incompleteData,
        followUp
    };
};

export const getQueue = async () => {
    // Get real visits from DB
    const { data, error } = await supabase
        .from('visits')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    let queue = [];

    if (!error && data) {
        queue = data;
    } else {
        console.error("Error fetching queue from DB:", error);
    }

    // Merge with in-memory mock visits
    const mockVisits = Array.from(mockVisitsStore.values()).sort((a, b) =>
        new Date(b.created_at) - new Date(a.created_at)
    );

    // Combine and sort
    const allVisits = [...mockVisits, ...queue].sort((a, b) =>
        new Date(b.created_at) - new Date(a.created_at)
    );

    return allVisits.map(v => ({
        id: v.id,
        visit_number: v.visit_number || v.id.slice(0, 8),
        chief_complaint: v.chief_complaint,
        facility_name: v.facility_name,
        department: v.department,
        status: v.status,
        confidence_score: v.confidence_score,
        created_at: v.created_at,
        has_high_risk: false,
        has_incomplete_data: false,
        needs_follow_up: false
    }));
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

    const { visit, symptoms } = visitData;
    const context = `
    Patient Info:
    Chief Complaint: ${visit.chief_complaint}
    Symptoms: ${symptoms.map(s => s.symptom_text).join(', ')}
    Notes: ${visit.visit_notes}
    `;

    console.log("Generating DDX for:", context);

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
                        
                        Output Format:
                        [
                            {
                                "id": "1",
                                "rank": 1,
                                "condition_name": "Disease Name",
                                "icd10_code": "Code",
                                "confidence_score": 90,
                                "rationale": "Why this matches",
                                "suggested_investigations": ["Test 1", "Test 2"]
                            }
                        ]
                        
                        Return ONLY valid JSON array.`
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
        let content = result.choices[0]?.message?.content;

        // Handle case where LLM returns object with key instead of array directly
        let differentials = [];
        try {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed)) {
                differentials = parsed;
            } else if (parsed.differentials) {
                differentials = parsed.differentials;
            } else {
                // Try to find the first array in the object
                const firstArray = Object.values(parsed).find(v => Array.isArray(v));
                if (firstArray) differentials = firstArray;
            }
        } catch (e) {
            console.error("Failed to parse DDX JSON:", e);
        }

        // Add IDs if missing
        differentials = differentials.map((d, i) => ({
            ...d,
            id: d.id || `ddx-${Date.now()}-${i}`
        }));

        // Store in memory
        mockDifferentialsStore.set(visitId, differentials);

        // Try to store in DB (if table existed, but we'll skip for now to avoid errors)

        return differentials;

    } catch (error) {
        console.error("DDX generation failed:", error);
        // Fallback mock data
        const mockDDX = [
            {
                id: `mock-ddx-${Date.now()}-1`,
                rank: 1,
                condition_name: "Viral Upper Respiratory Infection (Fallback)",
                icd10_code: "J06.9",
                confidence_score: 85,
                rationale: "System failed to generate dynamic DDX. Showing fallback.",
                suggested_investigations: ["CBC"]
            }
        ];
        mockDifferentialsStore.set(visitId, mockDDX);
        return mockDDX;
    }
};

const mockTriageStore = new Map();

export const createTriageAssessment = async (assessmentData) => {
    const id = `triage-${Date.now()}`;
    const assessment = {
        id,
        ...assessmentData,
        timestamp: new Date().toISOString(),
        status: 'WAITING'
    };
    mockTriageStore.set(id, assessment);
    return assessment;
};

export const getTriageQueue = async () => {
    const assessments = Array.from(mockTriageStore.values());

    // Sort by Level (ASC) then Timestamp (ASC - oldest first)
    return assessments.sort((a, b) => {
        if (a.level.priority !== b.level.priority) {
            return a.level.priority - b.level.priority;
        }
        return new Date(a.timestamp) - new Date(b.timestamp);
    });
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
                messages: [
                    { role: 'system', content: 'You are a helpful clinical assistant.' },
                    ...messages
                ]
            })
        });

        if (!response.ok) throw new Error("LLM API Failed");
        const data = await response.json();
        return data.choices[0]?.message?.content || "I couldn't process that.";
    } catch (e) {
        console.error("Chat error:", e);
        return "I am having trouble connecting to the clinical brain right now.";
    }
};
