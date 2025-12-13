
import { PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';
import { docClient } from './client.js';

export const createDocument = async (docData) => {
    const doc = {
        id: uuidv4(),
        ...docData,
        created_at: new Date().toISOString()
    };
    try {
        await docClient.send(new PutCommand({
            TableName: "Documents",
            Item: doc
        }));
        return doc;
    } catch (error) {
        console.error("Error creating document in DynamoDB:", error);
        throw error;
    }
};

export const getDocument = async (docId) => {
    try {
        const response = await docClient.send(new GetCommand({
            TableName: "Documents",
            Key: { id: docId }
        }));
        if (!response.Item) throw new Error("Document not found");
        return response.Item;
    } catch (error) {
        console.error("Error fetching document from DynamoDB:", error);
        throw error;
    }
};

export const createLLMTask = async (taskData) => {
    const task = {
        id: uuidv4(),
        ...taskData,
        created_at: new Date().toISOString()
    };
    try {
        await docClient.send(new PutCommand({
            TableName: "LLMTasks",
            Item: task
        }));
        return task;
    } catch (error) {
        console.error("Error creating LLM task in DynamoDB:", error);
        return null;
    }
};
