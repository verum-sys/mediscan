import { docClient, scanTable } from './services/dynamo/client.js';
import { DeleteCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

async function fix() {
    const visits = await scanTable('Visits');
    const recovered = visits.filter(v => v.visit_number && v.visit_number.startsWith('VS-REC-'));
    console.log(`Found ${recovered.length} recovered visits with shell names.`);

    const symptoms = await scanTable('Symptoms');
    
    let updatedCount = 0;
    for (const v of recovered) {
        // Find symptoms for this visit
        const vSymps = symptoms.filter(s => s.visit_id === v.id).map(s => s.symptom_text);
        
        let realComplaint = vSymps.length > 0 ? vSymps.join(', ') : 'Unknown Complaint';
        
        // Find the oldest symptom creation date to act as the true visit created_at date
        const vSympsObjs = symptoms.filter(s => s.visit_id === v.id);
        let realDate = v.created_at;
        if (vSympsObjs.length > 0) {
            vSympsObjs.sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
            realDate = vSympsObjs[0].created_at;
        }

        // We can't know the Patient Name because that was ONLY stored in the Visits table.
        // It was never stored in the Symptoms or Medications tables.
        // But we can update the Chief Complaint to be accurate, and the date to be accurate.
        
        await docClient.send(new UpdateCommand({
            TableName: 'Visits',
            Key: { id: v.id },
            UpdateExpression: "set chief_complaint = :c, created_at = :ca, provider_name = :p, department = :d, facility_name = :f, visit_notes = :n",
            ExpressionAttributeValues: {
                ":c": realComplaint,
                ":ca": realDate,
                ":p": "Historical DDX",
                ":d": "Clinical Decision Support",
                ":f": "Mediscan AI",
                ":n": `Historical data recovered from system logs.`
            }
        }));
        updatedCount++;
    }
    console.log(`Updated ${updatedCount} records to reflect their true medical complaints instead of 'Recovered Data'.`);
    console.log("Note: Patient Names are forever lost because they were physically only written in the Visits table which got deleted, not the child tables.");
}
fix();
