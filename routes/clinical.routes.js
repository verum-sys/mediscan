
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

export default router;
