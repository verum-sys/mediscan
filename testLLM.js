import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const context = `
    Patient Visit Info:
    Chief Complaint: fever and cough
    Notes: high fever for 3 days
    Symptoms: fever, dry cough
    Medical History / Medications: Paracetamol
    `;

async function test() {
    const response = await fetch(`${process.env.LLM_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.LLM_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: process.env.LLM_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: `You are a clinical decision support AI. Analyze the patient data and return a JSON response with:
                        1. patient_analysis: { Age, Sex, Chief_Complaint, Symptoms, Treatment_Plan, Effectiveness_Prediction, Notes }
                        2. medications: [{ Name, Type, Dosage, Duration, Frequency }]
                        3. investigative_suggestions: [{ Test_Name, Type (Essential/Optional), Ruled_Out_Test, Confidence_Score }]
                        
                        Infer missing details like Age/Sex from context if possible, or mark as "Unknown".
                        For 'medications', extract all drugs mentioned in the patient notes, medical history, or recommended in the treatment plan.
                        IMPORTANT: Translate ALL output values to ENGLISH.
                        Return ONLY valid JSON.`
                    },
                    {
                        role: 'user',
                        content: context
                    }
                ],
                response_format: { type: "json_object" }
            })
        });

    const result = await response.json();
    console.log(JSON.stringify(result, null, 2));
}
test();
