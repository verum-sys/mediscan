
import express from 'express';
import * as service from '../services/dynamo.service.js';

const router = express.Router();

router.get('/stats', async (req, res) => {
    try {
        const stats = await service.getStats();
        res.json(stats);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/analytics', async (req, res) => {
    try {
        const analytics = await service.getAnalytics();
        res.json(analytics);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/queue', async (req, res) => {
    try {
        const queue = await service.getQueue();
        res.json(queue);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/visits', async (req, res) => {
    try {
        const visit = await service.createVisit(req.body);
        res.json(visit);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/visits/:id', async (req, res) => {
    try {
        const visitData = await service.getVisit(req.params.id);
        res.json(visitData);
    } catch (e) {
        res.status(404).json({ error: 'Visit not found' });
    }
});

router.patch('/visits/:id', async (req, res) => {
    try {
        const result = await service.updateVisit(req.params.id, req.body);
        if (!result) return res.status(404).json({ error: 'Visit not found' });
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.delete('/visits/:id', async (req, res) => {
    try {
        const result = await service.deleteVisit(req.params.id);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/visits/:id/symptoms', async (req, res) => {
    try {
        const result = await service.addSymptoms(req.params.id, req.body.symptoms);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/visits/:id/medications', async (req, res) => {
    try {
        const result = await service.addMedications(req.params.id, req.body.medications);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/visits/:id/differentials', async (req, res) => {
    try {
        const result = await service.generateDifferentials(req.params.id);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/visits/:id/analysis', async (req, res) => {
    try {
        const result = await service.generateClinicalAnalysis(req.params.id);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/triage', async (req, res) => {
    try {
        const result = await service.createTriageAssessment(req.body);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/triage/queue', async (req, res) => {
    try {
        const result = await service.getTriageQueue();
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/chat', async (req, res) => {
    try {
        const response = await service.chatWithAI(req.body.messages);
        res.json({ response });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


router.post('/chat/summarize', async (req, res) => {
    try {
        const result = await service.summarizeConversation(req.body.messages);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/audit-logs', async (req, res) => {
    try {
        const result = await service.getAuditLogs();
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/documents/:id', async (req, res) => {
    try {
        const result = await service.getDocument(req.params.id);
        res.json(result);
    } catch (e) {
        res.status(404).json({ error: 'Document not found' });
    }
});

// Process voice input with LLM
router.post('/process-voice', async (req, res) => {
    try {
        const { transcript } = req.body;

        if (!transcript || !transcript.trim()) {
            return res.status(400).json({ error: 'Transcript is required' });
        }

        const llmApiKey = process.env.LLM_API_KEY;
        const llmBaseUrl = process.env.LLM_BASE_URL || 'https://api.cerebras.ai/v1';
        const llmModel = process.env.LLM_MODEL || 'llama-3.3-70b';

        if (!llmApiKey) {
            return res.status(500).json({ error: 'LLM API key not configured' });
        }

        // Process voice input through LLM
        const aiResponse = await fetch(`${llmBaseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${llmApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: llmModel,
                messages: [
                    {
                        role: 'system',
                        content: `You are a medical assistant analyzing voice-dictated patient information. Extract structured data and return ONLY valid JSON.
                        
                        Output Format:
                        {
                            "chief_complaint": "Main complaint in brief",
                            "symptoms": [
                                { "text": "symptom name", "severity": "mild/moderate/severe", "duration": "e.g. 3 days", "onset": "e.g. sudden/gradual", "confidenceScore": 85 }
                            ],
                            "criticality": "Critical" | "Stable",
                            "criticality_reason": "Reason for assessment",
                            "clinical_summary": "Concise summary (2-3 sentences)",
                            "department": "Suggested department (e.g., Cardiology, Emergency)",
                            "facility_name": "General Consultation",
                            "doctor_name": "AI Assistant"
                        }
                        
                        Instructions:
                        1. Extract ALL symptoms mentioned with details (severity, duration, onset)
                        2. Assess criticality based on symptoms described
                        3. Determine appropriate department
                        4. Create a brief clinical summary
                        5. Return ONLY JSON, no additional text`
                    },
                    {
                        role: 'user',
                        content: `Voice Input: ${transcript}`
                    }
                ],
                response_format: { type: "json_object" }
            })
        });

        if (!aiResponse.ok) {
            const errorText = await aiResponse.text();
            console.error('LLM processing failed:', errorText);
            return res.status(500).json({ error: 'Failed to process voice input' });
        }

        const aiResult = await aiResponse.json();
        const content = aiResult.choices[0]?.message?.content || '{}';

        try {
            const clinicalData = JSON.parse(content);

            // Create visit with extracted data
            const visit = await service.createVisit({
                chiefComplaint: clinicalData.chief_complaint || transcript.substring(0, 200),
                visitNotes: `Voice Input: ${transcript}`,
                sourceType: 'voice_input',
                facilityName: clinicalData.facility_name || 'Voice Consultation',
                department: clinicalData.department || 'General',
                providerName: clinicalData.doctor_name || 'AI Assistant',
                confidenceScore: 85,
                criticality: clinicalData.criticality || 'Stable',
                criticalityReason: clinicalData.criticality_reason,
                summary: clinicalData.clinical_summary
            });

            // Add symptoms
            if (clinicalData.symptoms && clinicalData.symptoms.length > 0) {
                await service.addSymptoms(visit.id, clinicalData.symptoms.map(s => ({
                    text: s.text,
                    confidenceScore: s.confidenceScore || 75,
                    severity: s.severity || 'moderate',
                    duration: s.duration || 'not specified',
                    onset: s.onset || 'not specified',
                    source: 'voice_llm',
                    rawText: s.text
                })));
            }

            res.json({
                visit,
                clinicalData,
                symptomsAdded: clinicalData.symptoms?.length || 0
            });
        } catch (parseError) {
            console.error('Failed to parse LLM response:', parseError);
            res.status(500).json({ error: 'Failed to parse AI response' });
        }
    } catch (error) {
        console.error('Voice processing error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Patient Intake - AI Chatbot Conversation
router.post('/patient-intake', async (req, res) => {
    try {
        const { messages, currentData } = req.body;

        const llmApiKey = process.env.LLM_API_KEY;
        const llmBaseUrl = process.env.LLM_BASE_URL || 'https://api.cerebras.ai/v1';
        const llmModel = process.env.LLM_MODEL || 'llama-3.3-70b';

        if (!llmApiKey) {
            return res.status(500).json({ error: 'LLM API key not configured' });
        }

        // System prompt for patient intake
        const systemPrompt = `You are a friendly AI health assistant conducting a patient intake interview. Your goal is to collect the following information:

1. Patient's full name
2. Age
3. Gender
4. Chief complaint (main reason for visit)
5. Current symptoms (detailed description)
6. Medical history (past illnesses, surgeries)
7. Current medications
8. Allergies

Guidelines:
- Ask ONE question at a time
- Be warm, empathetic, and professional
- Use simple, clear language
- If patient mentions symptoms, ask follow-up questions (severity, duration, onset)
- Extract and structure the information as you go
- When you have all information, say "Thank you! I have all the information needed. You can now submit this to your doctor."

Current collected data: ${JSON.stringify(currentData)}

Based on what's missing, ask the next appropriate question. Be conversational and natural.`;

        const aiResponse = await fetch(`${llmBaseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${llmApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: llmModel,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages.map(m => ({ role: m.role, content: m.content }))
                ]
            })
        });

        if (!aiResponse.ok) {
            throw new Error('LLM API failed');
        }

        const aiResult = await aiResponse.json();
        const response = aiResult.choices[0]?.message?.content || 'I apologize, could you please repeat that?';

        // Extract patient data from conversation
        const lastUserMessage = messages[messages.length - 1]?.content || '';
        const updatedData = { ...currentData };

        // Simple extraction logic (can be enhanced with NLP)
        if (!updatedData.name && lastUserMessage.match(/my name is|i am|i'm/i)) {
            const nameMatch = lastUserMessage.match(/(?:my name is|i am|i'm)\s+([a-z\s]+)/i);
            if (nameMatch) updatedData.name = nameMatch[1].trim();
        }

        if (!updatedData.age && lastUserMessage.match(/\d+\s*(?:years?|yrs?)/i)) {
            const ageMatch = lastUserMessage.match(/(\d+)\s*(?:years?|yrs?)/i);
            if (ageMatch) updatedData.age = parseInt(ageMatch[1]);
        }

        if (!updatedData.gender && lastUserMessage.match(/male|female|other/i)) {
            const genderMatch = lastUserMessage.match(/(male|female|other)/i);
            if (genderMatch) updatedData.gender = genderMatch[1].toLowerCase();
        }

        // Check if intake is complete
        const isComplete = response.toLowerCase().includes('submit this to your doctor') ||
            response.toLowerCase().includes('all the information needed');

        res.json({
            response,
            patientData: updatedData,
            isComplete
        });

    } catch (error) {
        console.error('Patient intake error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Submit Patient Intake to Doctor
router.post('/patient-intake/submit', async (req, res) => {
    try {
        const { patientData, conversation } = req.body;

        // Generate summary from conversation
        const conversationText = conversation
            .map(m => `${m.role === 'user' ? 'Patient' : 'AI'}: ${m.content}`)
            .join('\n');

        // Extract symptoms from conversation
        const symptoms = [];
        conversation.forEach(msg => {
            if (msg.role === 'user') {
                const content = msg.content.toLowerCase();
                // Simple symptom detection
                const symptomKeywords = ['pain', 'fever', 'cough', 'headache', 'nausea', 'dizzy', 'fatigue', 'ache'];
                symptomKeywords.forEach(keyword => {
                    if (content.includes(keyword) && !symptoms.includes(keyword)) {
                        symptoms.push(keyword);
                    }
                });
            }
        });

        // Create visit
        const visit = await service.createVisit({
            facilityName: 'Patient Self-Intake',
            department: 'General',
            providerName: 'Awaiting Assignment',
            chiefComplaint: patientData.chiefComplaint || symptoms.join(', ') || 'Patient intake completed',
            visitNotes: `Patient Self-Intake Summary:\n\nName: ${patientData.name || 'Not provided'}\nAge: ${patientData.age || 'Not provided'}\nGender: ${patientData.gender || 'Not provided'}\n\nConversation:\n${conversationText}`,
            sourceType: 'patient_intake',
            confidenceScore: 90,
            summary: `Patient ${patientData.name || 'Unknown'} completed self-intake. Chief complaint: ${patientData.chiefComplaint || symptoms.join(', ')}`
        });

        // Add symptoms
        if (symptoms.length > 0) {
            await service.addSymptoms(visit.id, symptoms.map(s => ({
                text: s,
                confidenceScore: 75,
                severity: 'moderate',
                duration: 'not specified',
                source: 'patient_intake'
            })));
        }

        res.json({
            success: true,
            visitId: visit.id,
            message: 'Patient intake submitted successfully'
        });

    } catch (error) {
        console.error('Submit intake error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// CLASSIFICATION ROUTES (ICD/SNOMED)
// ==========================================

// Get classifications for a visit
router.get('/classifications/:visitId', async (req, res) => {
    try {
        const classifications = await service.getClassifications(req.params.visitId);
        res.json(classifications);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Generate classifications for a visit using AI
router.post('/classifications/generate/:visitId', async (req, res) => {
    try {
        const classifications = await service.generateClassifications(req.params.visitId);
        res.json(classifications);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Create a manual classification
router.post('/classifications', async (req, res) => {
    try {
        const classification = await service.createClassification(req.body);
        res.json(classification);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ==========================================
// FEEDBACK ROUTES
// ==========================================

// Submit feedback
router.post('/feedback', async (req, res) => {
    try {
        const feedback = await service.createFeedback(req.body);
        res.json(feedback);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get feedback for a specific target
router.get('/feedback/:targetId', async (req, res) => {
    try {
        const feedback = await service.getFeedback(req.params.targetId);
        res.json(feedback);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get feedback statistics
router.get('/feedback-stats', async (req, res) => {
    try {
        const stats = await service.getFeedbackStats();
        res.json(stats);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ==========================================
// SYMPTOM HISTORY ROUTES
// ==========================================

// Get symptom history for a visit
router.get('/symptom-history/:visitId', async (req, res) => {
    try {
        const history = await service.getSymptomHistory(req.params.visitId);
        res.json(history);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Add symptom history entry
router.post('/symptom-history', async (req, res) => {
    try {
        const history = await service.createSymptomHistory(req.body);
        res.json(history);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ==========================================
// PUBLIC HEALTH SURVEILLANCE ROUTES
// ==========================================

// Get surveillance data (trends, top symptoms, etc.)
router.get('/surveillance/data', async (req, res) => {
    try {
        const data = await service.getSurveillanceData();
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get outbreak detection alerts
router.get('/surveillance/outbreaks', async (req, res) => {
    try {
        const outbreaks = await service.detectOutbreaks();
        res.json(outbreaks);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
