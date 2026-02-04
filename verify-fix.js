
import fetch from 'node-fetch';

const API_URL = 'http://localhost:3000/api';

async function verifyFix() {
    try {
        console.log("Starting verification...");

        // 1. Initial Stats with Strict Filter
        const initialRes = await fetch(`${API_URL}/stats`);
        const initialStats = await initialRes.json();
        console.log("Initial Total (should be cleaned of partials):", initialStats.todayTotal);

        // 2. Accept mock-q-9 to Repair it (using a distinct mocked ID)
        console.log("\nRepairing mock-q-9...");
        const updateRes = await fetch(`${API_URL}/visits/mock-q-9`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'accepted' })
        });
        const updatedVisit = await updateRes.json();
        console.log("Updated Visit Status:", updatedVisit.status);
        console.log("Updated Visit Number:", updatedVisit.visit_number); // CRITICAL: Should exist now

        if (updatedVisit.visit_number) {
            console.log("✅ REPAIR SUCCESS: Visit materialized properly.");
        } else {
            console.log("❌ REPAIR FAIL: Still partial record.");
        }

        // 3. Final Stats
        const finalRes = await fetch(`${API_URL}/stats`);
        const finalStats = await finalRes.json();
        console.log("\nFinal Total:", finalStats.todayTotal);

        if (finalStats.todayTotal > initialStats.todayTotal) {
            console.log("✅ STATS SUCCESS: Count increased.");
        } else {
            console.log("Stats Observation: diff = " + (finalStats.todayTotal - initialStats.todayTotal));
        }

    } catch (e) {
        console.error("Verify failed:", e);
    }
}

setTimeout(verifyFix, 4000); // Verify after server surely up
