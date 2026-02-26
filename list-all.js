import { docClient } from './services/dynamo/client.js';
import { ScanCommand } from "@aws-sdk/lib-dynamodb";

async function list() {
    const data = await docClient.send(new ScanCommand({ TableName: 'Visits' }));
    console.log(`Total items in DB: ${data.Items.length}`);
    for (const i of data.Items) {
        console.log(`ID: ${i.id}, source_type: ${i.source_type}, status: ${i.status}`);
    }
}
list();
