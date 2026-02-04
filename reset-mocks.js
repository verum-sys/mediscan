
import { getQueue } from './services/dynamo/dashboard.js';
import { deleteVisit } from './services/dynamo/visits.js';

async function resetMocks() {
    console.log("Analyzing Queue...");
    try {
        const q = await getQueue();
        const statusCounts = {};
        q.forEach(v => {
            statusCounts[v.status] = (statusCounts[v.status] || 0) + 1;
        });
        console.log("Status Counts:", statusCounts);

        // Identify Mock IDs in DB
        const mockInDb = q.filter(v => v.id.startsWith('mock-'));
        console.log(`Found ${mockInDb.length} materialized mocks.`);

        // Delete them to reset demo state
        console.log("Resetting (Deleting) materialized mocks...");
        for (const v of mockInDb) {
            await deleteVisit(v.id);
            process.stdout.write(".");
        }
        console.log("\nDone.");

    } catch (e) {
        console.error("Error:", e);
    }
}

resetMocks();
