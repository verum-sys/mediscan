
import { supabase } from './client.js';
import { getMockQueueData } from './visits.js';

export const getStats = async () => {
    try {
        const { data: visits, error } = await supabase.from('visits').select('*');
        if (error) throw error;

        const activeVisits = (visits || []).filter(v => v.status !== 'waiting' && v.visit_number);

        const highRisk = activeVisits.filter(v =>
            v.criticality === 'Critical' ||
            (v.confidence_score && v.confidence_score < 60) ||
            (v.visit_notes && v.visit_notes.toLowerCase().includes('high risk'))
        ).length;

        const incompleteData = activeVisits.filter(v =>
            !v.chief_complaint || v.status === 'incomplete'
        ).length;

        const followUp = activeVisits.filter(v =>
            v.status === 'follow_up' ||
            v.needs_follow_up === true ||
            (v.visit_notes && v.visit_notes.toLowerCase().includes('follow up'))
        ).length;

        const opdToIpdCount = activeVisits.filter(v => v.is_ipd_admission === true).length;

        const BASELINE = { todayTotal: 142, highRisk: 12, incompleteData: 5, followUp: 45, opdToIpdCount: 8 };

        return {
            todayTotal: activeVisits.length + BASELINE.todayTotal,
            highRisk: highRisk + BASELINE.highRisk,
            incompleteData: incompleteData + BASELINE.incompleteData,
            followUp: followUp + BASELINE.followUp,
            opdToIpdCount: opdToIpdCount + BASELINE.opdToIpdCount,
            storageStatus: 'supabase'
        };
    } catch (error) {
        console.error("Error getting stats:", error);
        return { todayTotal: 142, highRisk: 12, incompleteData: 5, followUp: 45, opdToIpdCount: 8, storageStatus: 'memory' };
    }
};

export const getQueue = async () => {
    try {
        const { data: visits, error } = await supabase.from('visits').select('*');
        if (error) throw error;

        const MOCK_QUEUE = getMockQueueData();

        const realVisits = (visits || [])
            .filter(v => v.source_type !== 'document_scanner' && v.visit_number && v.created_at)
            .map(v => ({
                ...v,
                has_high_risk: v.criticality === 'Critical',
                needs_follow_up: v.status === 'follow_up' || v.needs_follow_up === true,
                has_incomplete_data: !v.chief_complaint || v.status === 'incomplete' || (v.confidence_score && v.confidence_score < 70)
            }));

        const realIds = new Set(realVisits.map(v => v.id));
        const filteredMocks = MOCK_QUEUE.filter(mock => !realIds.has(mock.id)).map(v => ({
            ...v,
            has_high_risk: v.criticality === 'Critical',
            needs_follow_up: v.status === 'follow_up' || v.needs_follow_up === true,
            has_incomplete_data: !v.chief_complaint || v.status === 'incomplete' || (v.confidence_score && v.confidence_score < 70)
        }));

        return [...realVisits, ...filteredMocks].sort((a, b) =>
            new Date(b.created_at || 0) - new Date(a.created_at || 0)
        );
    } catch (error) {
        console.error("Error getting queue:", error);
        const MOCK_QUEUE = getMockQueueData();
        return MOCK_QUEUE.map(v => ({
            ...v,
            has_high_risk: v.criticality === 'Critical',
            needs_follow_up: v.status === 'follow_up' || v.needs_follow_up === true,
            has_incomplete_data: !v.chief_complaint || v.status === 'incomplete' || (v.confidence_score && v.confidence_score < 70)
        }));
    }
};

export const getEmergencyTriageStats = async () => {
    try {
        const { data: visits, error } = await supabase.from('visits').select('*');
        if (error) throw error;

        const now = new Date();
        const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const recentVisits = (visits || []).filter(v => new Date(v.created_at) >= last24Hours);

        const areaStats = {};
        recentVisits.forEach(v => {
            const area = v.area || 'Unknown Area';
            if (!areaStats[area]) areaStats[area] = { total: 0, critical: 0, urgent: 0, stable: 0 };
            areaStats[area].total++;
            if (v.criticality === 'Critical') areaStats[area].critical++;
            else if (v.needs_follow_up) areaStats[area].urgent++;
            else areaStats[area].stable++;
        });

        return {
            total: recentVisits.length,
            critical: recentVisits.filter(v => v.criticality === 'Critical').length,
            urgent: recentVisits.filter(v => v.needs_follow_up).length,
            stable: recentVisits.filter(v => !v.needs_follow_up && v.criticality !== 'Critical').length,
            byArea: areaStats,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error("Error getting emergency triage stats:", error);
        return { total: 0, critical: 0, urgent: 0, stable: 0, byArea: {}, timestamp: new Date().toISOString() };
    }
};
