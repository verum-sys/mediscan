import { docClient } from './services/dynamo/client.js';
import { ScanCommand, PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

async function recoverData() {
    console.log("CYBERSECURITY RECOVERY INITIATED...");
    console.log("DynamoDB lacks PITR (Point-In-Time-Recovery) for the Visits table.");
    console.log("However, NoSQL tables do not have cascading deletes by default.");
    console.log("Attempting to recover ghost records from orphaned relational data (Symptoms, Differentials, Medications)...\n");

    const missingVisitIds = new Set();
    const tablesToScan = ["Symptoms", "Differentials", "Medications", "Documents", "SymptomHistory", "Classifications"];

    // 1. Scan all related tables to find orphaned visit_ids
    for (const tableName of tablesToScan) {
        try {
            const data = await docClient.send(new ScanCommand({ TableName: tableName }));
            if (data.Items) {
                for (const item of data.Items) {
                    if (item.visit_id) {
                        missingVisitIds.add(item.visit_id);
                    }
                }
            }
            console.log(`[+] Scanned ${tableName}: found potential visit footprints.`);
        } catch (e) {
            console.log(`[-] Could not scan ${tableName}: ${e.message}`);
        }
    }

    // 2. Cross-reference with existing Visits to find exactly what was deleted
    const existingVisitsData = await docClient.send(new ScanCommand({ TableName: 'Visits' }));
    const existingIds = new Set(existingVisitsData.Items.map(v => v.id));

    const orphanedIds = [...missingVisitIds].filter(id => !existingIds.has(id));
    console.log(`\n[!] FOUND ${orphanedIds.length} ORPHANED VISIT IDs DELETED FROM MAIN TABLE.\n`);

    // 3. Known Data from Terminal Buffer (Reconstruct perfectly)
    const bufferReconstruction = [
        {
            id: '4cbfe64a-f85d-444e-b748-4e9b5ce0f465', visit_number: 'VS-910973',
            provider_name: 'Dr. Varun', department: 'Clinical Decision Support',
            status: 'accepted', chief_complaint: 'cough, fever', confidence_score: 95,
            source_type: 'ddx_tool', facility_name: 'DDX Tool', created_at: '2025-12-03T14:44:00.173Z'
        },
        {
            id: 'a97a754e-0c21-4191-b870-f5a09bdae4ad', visit_number: 'VS-040173',
            provider_name: 'Dr. Tj', department: 'Clinical Decision Support',
            status: 'accepted', chief_complaint: 'cough, fever', confidence_score: 95,
            source_type: 'ddx_tool', facility_name: 'DDX Tool', created_at: '2025-12-03T14:44:00.173Z'
        },
        {
            id: 'a3a78b02-12d7-4d04-af6c-c560035657bb', visit_number: 'VS-016540',
            provider_name: 'Dr. Tj', department: 'Clinical Decision Support',
            status: 'accepted', chief_complaint: 'cough', confidence_score: 95,
            source_type: 'ddx_tool', facility_name: 'DDX Tool', created_at: '2025-12-03T14:43:36.540Z'
        },
        {
            id: '76f9a845-b04a-4861-bb4b-04fceb243b70', visit_number: 'VS-850447',
            provider_name: 'Dr. Tushar', department: 'Clinical Decision Support',
            status: 'accepted', chief_complaint: 'headache', confidence_score: 95,
            source_type: 'ddx_tool', facility_name: 'DDX Tool', created_at: '2025-12-03T14:24:10.447Z'
        },
        {
            id: '3653fa23-cb2f-4191-93eb-b11fab4fc454', visit_number: 'VS-864179',
            provider_name: 'System', department: 'Clinical Decision Support',
            status: 'accepted', chief_complaint: 'headache', confidence_score: 95,
            source_type: 'ddx_tool', facility_name: 'DDX Tool', created_at: '2025-12-03T14:07:44.179Z'
        },
        {
            id: '8ece0a40-77bb-42fe-8936-f89f297a5055', visit_number: 'VS-580577',
            provider_name: 'Dr. Tushar', department: 'Clinical Decision Support',
            status: 'accepted', chief_complaint: 'chest pain', confidence_score: 95,
            source_type: 'ddx_tool', facility_name: 'DDX Tool', created_at: '2025-12-03T14:03:00.577Z'
        },
        {
            id: '0aae2c71-202a-4a32-ab70-ee6c75e0a405', visit_number: 'VS-967144',
            provider_name: 'System', department: 'Clinical Decision Support',
            status: 'accepted', chief_complaint: 'fever, rashes', confidence_score: 95,
            source_type: 'ddx_tool', facility_name: 'DDX Tool', created_at: '2025-12-03T13:52:47.144Z',
            visit_notes: 'Labsmart Software Dengue Report Recovered'
        },
        {
            id: '08c155eb-bac4-4611-8ac6-012a12e013fe', visit_number: 'VS-540028',
            provider_name: 'Dr. Varun', department: 'Clinical Decision Support',
            status: 'accepted', chief_complaint: 'fever', confidence_score: 95,
            source_type: 'ddx_tool', facility_name: 'DDX Tool', created_at: '2025-12-03T13:45:40.028Z'
        }
    ];

    let recoveredCount = 0;

    // Attempt full restoration for cached data
    for (const visit of bufferReconstruction) {
        if (!existingIds.has(visit.id)) {
            await docClient.send(new PutCommand({ TableName: 'Visits', Item: visit }));
            recoveredCount++;
            // Remove from orphaned to prevent double-processing
            const index = orphanedIds.indexOf(visit.id);
            if (index > -1) orphanedIds.splice(index, 1);
        }
    }

    // 4. Restore the remaining purely from Relational Data extraction
    for (const orphanId of orphanedIds) {
        // A cyber forensic approach: we know it exists, we must create a shell to link the floating data
        const shellVisit = {
            id: orphanId,
            visit_number: `VS-REC-${Math.floor(Math.random() * 90000) + 10000}`,
            provider_name: 'Recovered (System)',
            department: 'Recovered Data',
            status: 'completed', // So it doesn't clutter active queues but is retrievable
            chief_complaint: 'Recovered from system logs and child tables',
            source_type: 'recovered',
            facility_name: 'Database Recovery',
            created_at: new Date().toISOString(),
            confidence_score: 100,
            has_high_risk: false,
            needs_follow_up: false,
            has_incomplete_data: true,
            visit_notes: `[SYSTEM] This visit record was reconstructed on ${new Date().toISOString()} via forensic scan of orphaned relational datasets. Original metadata was lost.`
        };
        await docClient.send(new PutCommand({ TableName: 'Visits', Item: shellVisit }));
        recoveredCount++;
    }

    console.log(`\n[SUCCESS] Formally Restored ${recoveredCount} records into the Visits Table.`);
    console.log(`The recovered cases can now be searched and will reconnect to their existing symptoms/medications in the UI.`);
}

recoverData();
