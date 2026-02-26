import { docClient } from './services/dynamo/client.js';
import { ScanCommand } from "@aws-sdk/lib-dynamodb";

async function test() {
    const data = await docClient.send(new ScanCommand({ TableName: 'Visits' }));
    for (let i = 0; i < Math.min(3, data.Items.length); i++) {
        console.log("Visit ID:", data.Items[i].id);
        console.log("Clinical Analysis:", JSON.stringify(data.Items[i].clinical_analysis, null, 2));
    }
}
test();
