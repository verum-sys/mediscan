import { docClient, scanTable } from './services/dynamo/client.js';
import { DeleteCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

async function fix() {
    const visits = await scanTable('Visits');
    const recovered = visits.filter(v => v.visit_number && v.visit_number.startsWith('VS-REC-'));
    
    let updatedCount = 0;
    for (const v of recovered) {
        await docClient.send(new UpdateCommand({
            TableName: 'Visits',
            Key: { id: v.id },
            UpdateExpression: "set patient_name = :p",
            ExpressionAttributeValues: {
                ":p": `Unknown Patient (${v.id.substring(v.id.length-4)})`
            }
        }));
        updatedCount++;
    }
    console.log(`Updated names to ID-based Unknowns`);
}
fix();
