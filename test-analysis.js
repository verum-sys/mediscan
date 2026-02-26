import { generateClinicalAnalysis } from './services/dynamo/clinical.js';

async function test() {
    try {
        const id = 'c96cecf4-f4a7-4564-8fa0-5d7f8baf22c3';
        console.log("Generating for visit:", id);
        const res = await generateClinicalAnalysis(id);
        console.log("Result:", JSON.stringify(res, null, 2));
    } catch (e) {
        console.error(e);
    }
}
test();
