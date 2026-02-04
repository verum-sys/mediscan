
import { getQueue } from './services/dynamo/dashboard.js';

async function test() {
    console.log("Fetching queue...");
    try {
        const q = await getQueue();
        console.log("Queue Length:", q.length);
        console.log("First Item:", q[0]);
    } catch (e) {
        console.error("Queue Error:", e);
    }
}

test();
