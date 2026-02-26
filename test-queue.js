import { getQueue } from './services/dynamo/dashboard.js';

async function test() {
    const q = await getQueue();
    console.log("Total Queue length:", q.length);
    console.log("Not accepted (visible):", q.filter(x => x.status !== 'accepted').length);
}
test();
