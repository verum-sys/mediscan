import { docClient, scanTable } from './services/dynamo/client.js';
import fs from 'fs';

async function extractAllData() {
    console.log("Extracting all available data for recovered records...");

    // 1. Get all recovered visits
    const visits = await scanTable('Visits');
    const recoveredVisits = visits.filter(v => v.source_type === 'recovered');

    console.log(`Found ${recoveredVisits.length} recovered visits in the database.`);

    // 2. Load all other tables
    const allSymptoms = await scanTable('Symptoms');
    const allDifferentials = await scanTable('Differentials');
    const allMedications = await scanTable('Medications');
    const allDocuments = await scanTable('Documents');

    const extractionReport = [];

    for (const v of recoveredVisits) {
        const visitId = v.id;

        const symptoms = allSymptoms.filter(s => s.visit_id === visitId);
        const differentials = allDifferentials.filter(d => d.visit_id === visitId);
        const medications = allMedications.filter(m => m.visit_id === visitId);
        const documents = allDocuments.filter(d => d.visit_id === visitId);

        const record = {
            visitId,
            visitNumber: v.visit_number,
            currentChiefComplaint: v.chief_complaint,
            createdAt: v.created_at,
            extractedSymptoms: symptoms,
            extractedDifferentials: differentials,
            extractedMedications: medications,
            extractedDocuments: documents
        };

        extractionReport.push(record);
    }

    fs.writeFileSync('extracted_recovered_data.json', JSON.stringify(extractionReport, null, 2));

    console.log("Extraction complete. Results saved to 'extracted_recovered_data.json'.");

    // Analyze how many had actual symptoms vs empty
    const withSymptoms = extractionReport.filter(r => r.extractedSymptoms.length > 0);
    const withDifferentials = extractionReport.filter(r => r.extractedDifferentials.length > 0);

    console.log(`\nAnalysis:`);
    console.log(`- Total Recovered Records: ${extractionReport.length}`);
    console.log(`- Records with surviving Symptoms: ${withSymptoms.length}`);
    console.log(`- Records with surviving Differentials: ${withDifferentials.length}`);
}

extractAllData();
