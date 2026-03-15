
import { v4 as uuidv4 } from 'uuid';
import { supabase } from './client.js';

export const createFeedback = async (feedbackData) => {
    const feedback = {
        id: uuidv4(),
        target_type: feedbackData.targetType,
        target_id: feedbackData.targetId,
        rating: feedbackData.rating,
        comment: feedbackData.comment || '',
        user_id: feedbackData.userId || 'anonymous',
        created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('feedback').insert(feedback);
    if (error) { console.error("Error creating feedback:", error); throw error; }
    return feedback;
};

export const getFeedback = async (targetId) => {
    const { data, error } = await supabase.from('feedback').select('*').eq('target_id', targetId);
    if (error) { console.error("Error getting feedback:", error); return []; }
    return data || [];
};

export const getFeedbackStats = async () => {
    try {
        const { data: allFeedback, error } = await supabase.from('feedback').select('*');
        if (error) throw error;

        const all = allFeedback || [];
        const stats = {
            total: all.length,
            thumbsUp: all.filter(f => f.rating === 'thumbs_up').length,
            thumbsDown: all.filter(f => f.rating === 'thumbs_down').length,
            byType: {}
        };

        ['differential', 'classification', 'clinical_analysis'].forEach(type => {
            const typeData = all.filter(f => f.target_type === type);
            stats.byType[type] = {
                total: typeData.length,
                thumbsUp: typeData.filter(f => f.rating === 'thumbs_up').length,
                thumbsDown: typeData.filter(f => f.rating === 'thumbs_down').length
            };
        });

        return stats;
    } catch (error) {
        console.error("Error getting feedback stats:", error);
        return { total: 0, thumbsUp: 0, thumbsDown: 0, byType: {} };
    }
};
