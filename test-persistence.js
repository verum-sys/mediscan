
import fetch from 'node-fetch';

const API_URL = 'http://localhost:3000/api';

async function testPersistence() {
    try {
        console.log("Starting test against", API_URL);

        // 1. Get Initial Stats
        console.log("--- Initial Stats ---");
        const initialStatsRes = await fetch(`${API_URL}/stats`);
        if (!initialStatsRes.ok) throw new Error(`Stats failed: ${initialStatsRes.status}`);
        const initialStats = await initialStatsRes.json();
        console.log("Total:", initialStats.todayTotal);

        // 2. Simulate Accepting a Patient (Mock ID)
        const mockId = 'mock-q-9';
        console.log(`\n--- Accepting Patient ${mockId} ---`);

        const updateRes = await fetch(`${API_URL}/visits/${mockId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'accepted' })
        });

        if (updateRes.ok) {
            const updatedVisit = await updateRes.json();
            console.log("Update Success.");
            console.log("New Status:", updatedVisit.status);
            console.log("Visit ID:", updatedVisit.id);
        } else {
            console.log("Update Failed:", updateRes.status, await updateRes.text());
        }

        // 3. Get Stats Again
        console.log("\n--- Post-Update Stats ---");
        const finalStatsRes = await fetch(`${API_URL}/stats`);
        const finalStats = await finalStatsRes.json();
        console.log("Total:", finalStats.todayTotal);

        if (finalStats.todayTotal > initialStats.todayTotal) {
            console.log("\n✅ SUCCESS: Total count increased.");
        } else if (finalStats.todayTotal === initialStats.todayTotal && initialStats.todayTotal > 142) {
            console.log("\n⚠️  Count same (maybe already accepted?).");
        } else {
            console.log("\n❌ FAIL: Total count DID NOT increase.");
        }

    } catch (e) {
        console.error("Test failed:", e);
    }
}

testPersistence();
