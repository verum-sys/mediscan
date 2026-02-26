import { DynamoDBClient, UpdateContinuousBackupsCommand } from "@aws-sdk/client-dynamodb";
import dotenv from 'dotenv';
dotenv.config();

const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    } : undefined
});

async function enablePITR() {
    try {
        const response = await client.send(new UpdateContinuousBackupsCommand({
            TableName: 'Visits',
            PointInTimeRecoverySpecification: {
                PointInTimeRecoveryEnabled: true
            }
        }));
        console.log("Successfully ENABLED Point-in-Time Recovery for table 'Visits'.");
    } catch (e) {
        console.error("Error:", e);
    }
}
enablePITR();
