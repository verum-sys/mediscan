import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from './client.js';

const resetMocks = async () => {
    const mockIds = [
        'mock-q-1', 'mock-q-2', 'mock-q-3', 'mock-q-4', 'mock-q-5',
        'mock-q-6', 'mock-q-7', 'mock-q-8', 'mock-q-9', 'mock-q-10'
    ];

    console.log("Resetting mock data statuses...");

    for (const id of mockIds) {
        try {
            await docClient.send(new DeleteCommand({
                TableName: "Visits",
                Key: { id: id }
            }));
            console.log(`Deleted ${id}`);
        } catch (error) {
            console.error(`Failed to delete ${id}`, error);
        }
    }
    console.log("Mock data reset complete. They will now reappear from local definitions.");
};

resetMocks();
