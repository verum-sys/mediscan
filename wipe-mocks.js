import { docClient } from './services/dynamo/client.js';
import { ScanCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

async function purge() {
    console.log("Scanning table...");
    try {
        const data = await docClient.send(new ScanCommand({ TableName: 'Visits' }));
        console.log("Total items:", data.Items.length);
        let deletedCount = 0;
        for (const item of data.Items) {
            console.log("Found:", item.id, item.status, item.source_type);
            if (item.id.startsWith('mock-') || item.source_type === 'ddx_tool' || item.status === 'accepted') {
                await docClient.send(new DeleteCommand({
                    TableName: 'Visits',
                    Key: { id: item.id }
                }));
                deletedCount++;
                console.log("Deleted:", item.id);
            }
        }
        console.log(`Deleted ${deletedCount} items. Queue restored to demo state.`);
    } catch (e) { console.error(e) }
}
purge();
