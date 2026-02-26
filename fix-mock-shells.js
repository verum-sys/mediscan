import { docClient, scanTable } from './services/dynamo/client.js';
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";

async function resyncMocks() {
    console.log("Identifying garbage shell records blocking the Mock queue...");

    const visits = await scanTable('Visits');
    const mockInDb = visits.filter(v => v.id.startsWith('mock-'));

    console.log(`Found ${mockInDb.length} mock shell records currently in the database.`);

    let deletedCount = 0;
    for (const v of mockInDb) {
        await docClient.send(new DeleteCommand({
            TableName: 'Visits',
            Key: { id: v.id }
        }));
        deletedCount++;
    }

    console.log(`\nSuccessfully deleted ${deletedCount} garbage shell records.`);
    console.log("The frontend will now automatically instantly re-materialize the perfect mock cases (with pristine names and complaints) straight from the source file!");
}

resyncMocks();
