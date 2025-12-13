
import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';
import { docClient, scanTable } from './client.js';

export const createFeedback = async (feedbackData) => {
    const feedback = {
        id: uuidv4(),
        target_type: feedbackData.targetType, // 'differential', 'classification', 'clinical_analysis'
        target_id: feedbackData.targetId,
        rating: feedbackData.rating, // 'thumbs_up' or 'thumbs_down'
        comment: feedbackData.comment || '',
        user_id: feedbackData.userId || 'anonymous',
        created_at: new Date().toISOString()
    };

    try {
        await docClient.send(new PutCommand({
            TableName: "Feedback",
            Item: feedback
        }));
        return feedback;
    } catch (error) {
        console.error("Error creating feedback:", error);
        throw error;
    }
};

export const getFeedback = async (targetId) => {
    try {
        const response = await docClient.send(new QueryCommand({
            TableName: "Feedback",
            IndexName: "TargetIndex",
            KeyConditionExpression: "target_id = :tid",
            ExpressionAttributeValues: { ":tid": targetId }
        }));
        return response.Items || [];
    } catch (error) {
        console.error("Error getting feedback:", error);
        return [];
    }
};

export const getFeedbackStats = async () => {
    try {
        const allFeedback = await scanTable("Feedback");

        const stats = {
            total: allFeedback.length,
            thumbsUp: allFeedback.filter(f => f.rating === 'thumbs_up').length,
            thumbsDown: allFeedback.filter(f => f.rating === 'thumbs_down').length,
            byType: {}
        };

        // Group by target type
        ['differential', 'classification', 'clinical_analysis'].forEach(type => {
            const typeData = allFeedback.filter(f => f.target_type === type);
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
