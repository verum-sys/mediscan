import fetch from 'node-fetch';

async function test() {
    try {
        console.log("Fetching queue from http://localhost:3000/api/queue");
        const res = await fetch("http://localhost:3000/api/queue");
        const queue = await res.json();
        if (queue.length > 0) {
            const id = queue[0].id;
            console.log("Testing API analysis endpoint for visit id:", id);
            const analysisRes = await fetch(`http://localhost:3000/api/visits/${id}/analysis`, { method: "POST" });
            const data = await analysisRes.json();
            console.log("Analysis returned medications:", JSON.stringify(data.medications));
            console.log("Analysis returned investigations:", JSON.stringify(data.investigative_suggestions));
        } else {
            console.log("Queue is empty, cannot test API.");
        }
    } catch (e) { console.error("Error:", e); }
}
test();
