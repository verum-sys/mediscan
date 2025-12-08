
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

export default router;
