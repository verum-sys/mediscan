
import express from 'express';
import * as service from '../services/dynamo.service.js';

const router = express.Router();

/**
 * Robustly parses JSON from LLM output, handling markdown code blocks and extra text.
 */
/**
 * Robustly parses JSON from LLM output, handling markdown code blocks, trailing commas, and extra text.
 */
const parseLLMResponse = (content) => {
    if (!content) return null;

    let cleanContent = content.trim();

    // 1. Remove Markdown code blocks if present
    if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '').trim();
    }

    // 2. Try identifying the JSON object if there's surrounding text
    if (!cleanContent.startsWith('{')) {
        const start = cleanContent.indexOf('{');
        const end = cleanContent.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
            cleanContent = cleanContent.substring(start, end + 1);
        }
    }

    // 3. Robust parsing helper
    const robustParse = (str) => {
        try {
            // Standard parse
            return JSON.parse(str);
        } catch (e) {
            try {
                // Remove trailing commas and try again
                const noTrailingCommas = str.replace(/,\s*([\]}])/g, '$1');
                return JSON.parse(noTrailingCommas);
            } catch (e2) {
                return null;
            }
        }
    };

    return robustParse(cleanContent);
};

// Patient Intake Chat Endpoint
router.post('/patient-intake', async (req, res) => {
    try {
        const { messages, currentData, language = 'en-US', pid } = req.body;

        const llmApiKey = process.env.LLM_API_KEY;
        const llmBaseUrl = process.env.LLM_BASE_URL || 'https://api.cerebras.ai/v1';
        const llmModel = process.env.LLM_MODEL || 'llama3.1-8b';

        if (!llmApiKey) {
            return res.status(500).json({ error: 'LLM API key not configured' });
        }

        const languageNames = {
            'en-US': 'English',
            'hi-IN': 'Hindi (हिन्दी)',
            'bn-IN': 'Bengali (বাংলা)',
            'te-IN': 'Telugu (తెలుగు)',
            'mr-IN': 'Marathi (मराठी)',
            'ta-IN': 'Tamil (தமிழ்)',
            'gu-IN': 'Gujarati (ગુજરાતી)',
            'kn-IN': 'Kannada (ಕನ್ನಡ)',
            'ml-IN': 'Malayalam (മലയാളം)',
            'pa-IN': 'Punjabi (ਪੰਜਾਬੀ)',
            'es-ES': 'Spanish (Español)',
            'fr-FR': 'French (Français)',
            'de-DE': 'German (Deutsch)',
            'ar-SA': 'Arabic (العربية)',
            'ja-JP': 'Japanese (日本語)',
            'zh-CN': 'Chinese (中文)'
        };

        const selectedLanguageName = languageNames[language] || 'English';

        const systemPrompt = `You are a friendly AI health assistant conducting a patient intake interview. 
        You MUST follow this STRICT Step-by-Step Protocol. Do not deviate.

        STEP 1: Ask for Patient's Name, Age, Gender, and Residential Area (All in the first message).
        STEP 2: Ask "What seems to be the problem today?" (Chief Complaint).
        STEP 3: Ask for In-depth details about the problem (Duration, Severity, specific characteristics).
        STEP 4: Ask about Medical History and Current Medications.
        STEP 5: CONCLUSION. 
           - Inform the patient: "Your Unique ID is ${pid}. Please proceed to Room 2, Floor 3. Waiting time is approx 10 mins."
           - Then say: "Thank you! I have all the information needed. You can now submit this to your doctor."

        IMPORTANT RULES:
        - Analyze the "Current collected data" and conversation history to determine which STEP you are on.
        - Move to the next step only after the current step is answered completely.
        - Respond ONLY in ${selectedLanguageName}.
        - Be warm and professional.

        OUTPUT FORMAT:
        You MUST respond with a VALID JSON object in this format. Do NOT output any introductory text.
        {
          "response": "Your message to the patient in ${selectedLanguageName}",
          "extracted_data": { 
              "name": "string or null", 
              "age": "number or null", 
              "gender": "string or null", 
              "symptoms": ["array", "of", "strings (in English)"],
              "chiefComplaint": "string or null (in English)",
              "medicalHistory": ["array", "of", "strings (in English)"],
              "currentMedications": ["array", "of", "strings (in English)"],
              "allergies": ["array", "of", "strings (in English)"]
          },
          "is_complete": boolean (true ONLY if you have reached STEP 5 and delivered the conclusion message)
        }
        
        INSTRUCTIONS FOR DATA EXTRACTION:
        - Extract new information from the user's latest message.
        - Merge it with the known "Current collected data".
        - CRITICAL: All extracted values (symptoms, history, etc.) MUST be translated to standard ENGLISH Medical Terms.
        - Example: If user says "मुझे बुखार है" (Hindi), extract "symptoms": ["Fever"].
        - Example: If user says "सूखी खांसी" (Hindi), extract "symptoms": ["Dry Cough"].
        - "symptoms": List distinct symptoms mentioned.
        - "medicalHistory": List past diseases.
        
        Current collected data: ${JSON.stringify(currentData)}`;

        const aiResponse = await fetch(`${llmBaseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${llmApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: llmModel,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages.map(m => ({ role: m.role, content: m.content }))
                ],
                response_format: { type: "json_object" }
            })
        });

        if (!aiResponse.ok) {
            const errText = await aiResponse.text();
            console.error('LLM API Error Detail:', {
                status: aiResponse.status,
                body: errText,
                model: llmModel,
                url: llmBaseUrl
            });
            throw new Error(`LLM API failed (${aiResponse.status}): ${errText.substring(0, 100)}`);
        }

        const aiResult = await aiResponse.json();
        const content = aiResult.choices[0]?.message?.content || '{}';

        // Log RAW content to debug
        // console.log("RAW LLM OUTPUT:", content);

        let parsedResult = parseLLMResponse(content);

        // Fallback if parsing completely fails
        if (!parsedResult) {
            console.error("Failed to parse LLM JSON:", content);
            parsedResult = {
                response: content, // This might be raw JSON text, but better than crashing
                extracted_data: {},
                is_complete: false
            };
        }

        const responseText = parsedResult.response || 'I apologize, could you please repeat that?';

        // Robust Merging Strategy
        const newData = parsedResult.extracted_data || {};
        const updatedData = { ...currentData };

        // Case-insensitive / Multi-key extraction
        const nameKey = Object.keys(newData).find(k => k.toLowerCase() === 'name');
        if (nameKey) updatedData.name = newData[nameKey];

        const ageKey = Object.keys(newData).find(k => k.toLowerCase() === 'age');
        if (ageKey) updatedData.age = newData[ageKey];

        const genderKey = Object.keys(newData).find(k => k.toLowerCase() === 'gender');
        if (genderKey) updatedData.gender = newData[genderKey];

        const complaintKey = Object.keys(newData).find(k => k.toLowerCase() === 'chiefcomplaint' || k.toLowerCase() === 'complaint');
        if (complaintKey) updatedData.chiefComplaint = newData[complaintKey];

        // Helper to merge arrays uniquely
        const mergeArrays = (oldArr, newArr) => Array.from(new Set([...(oldArr || []), ...(newArr || [])]));

        const symptomsKey = Object.keys(newData).find(k => k.toLowerCase() === 'symptoms');
        if (symptomsKey && Array.isArray(newData[symptomsKey])) {
            updatedData.symptoms = mergeArrays(updatedData.symptoms, newData[symptomsKey]);
        }

        const historyKey = Object.keys(newData).find(k => k.toLowerCase() === 'medicalhistory' || k.toLowerCase() === 'history');
        if (historyKey && Array.isArray(newData[historyKey])) {
            updatedData.medicalHistory = mergeArrays(updatedData.medicalHistory, newData[historyKey]);
        }

        const medsKey = Object.keys(newData).find(k => k.toLowerCase() === 'currentmedications' || k.toLowerCase() === 'medications');
        if (medsKey && Array.isArray(newData[medsKey])) {
            updatedData.currentMedications = mergeArrays(updatedData.currentMedications, newData[medsKey]);
        }

        const allergiesKey = Object.keys(newData).find(k => k.toLowerCase() === 'allergies');
        if (allergiesKey && Array.isArray(newData[allergiesKey])) {
            updatedData.allergies = mergeArrays(updatedData.allergies, newData[allergiesKey]);
        }

        res.json({
            response: responseText,
            patientData: updatedData,
            isComplete: parsedResult.is_complete || false
        });

    } catch (error) {
        console.error('Patient intake error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Submit Patient Intake Endpoint
router.post('/patient-intake/submit', async (req, res) => {
    try {
        const { patientData, conversation, pid } = req.body;

        const llmApiKey = process.env.LLM_API_KEY;
        const llmBaseUrl = process.env.LLM_BASE_URL || 'https://api.cerebras.ai/v1';
        const llmModel = process.env.LLM_MODEL || 'llama-3.3-70b';

        // 1. Generate High-Quality Summary via LLM
        let summaryText = `[${new Date().toLocaleDateString()}] Patient completed self-intake.`;

        try {
            const conversationText = conversation.map(m => `${m.role}: ${m.content}`).join('\n');
            const summaryResponse = await fetch(`${llmBaseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${llmApiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: llmModel,
                    messages: [
                        {
                            role: 'system',
                            content: `Summarize the following medical intake conversation into EXACTLY 2 concise lines in ENGLISH. 
                            Even if the conversation is in Hindi or another language, the summary MUST be in ENGLISH.
                            Include: Name, Age, Gender, Chief Complaint (Translate to English), Symptom specifics, and History/Meds. 
                            Start directly with the details.`
                        },
                        { role: 'user', content: conversationText }
                    ]
                })
            });

            if (summaryResponse.ok) {
                const summaryData = await summaryResponse.json();
                const aiSummary = summaryData.choices[0]?.message?.content;
                if (aiSummary) summaryText = `[${new Date().toLocaleDateString()}] ${aiSummary}`;
            }
        } catch (e) {
            console.error("Summary generation failed", e);
        }

        // 2. Create Visit Record
        const visitData = {
            patientName: patientData.name || 'Unknown',
            age: patientData.age || 0,
            gender: patientData.gender || 'Unknown',
            contactNumber: 'N/A',
            chiefComplaint: patientData.chiefComplaint || patientData.symptoms?.[0] || 'Checkup',
            department: 'General Medicine',
            providerName: 'AI Triage Assistant', // Fix: Added missing provider name
            triagePriority: 'Routine',
            assignedDoctorId: 'doc-123',
            status: 'waiting',
            symptoms: patientData.symptoms || [],
            notes: summaryText,
            aiSummary: summaryText
        };

        const newVisit = await service.createVisit(visitData);

        // 3. Persist Symptoms to DynamoDB
        if (patientData.symptoms && patientData.symptoms.length > 0) {
            await service.addSymptoms(newVisit.id, patientData.symptoms.map(s => ({
                text: s,
                confidenceScore: 90,
                severity: 'Moderate',
                duration: 'Not specified',
                source: 'patient_intake_ai'
            })));
        }

        // 4. Persist Medications to DynamoDB (Fix: Was missing)
        if (patientData.currentMedications && patientData.currentMedications.length > 0) {
            await service.addMedications(newVisit.id, patientData.currentMedications.map(m => ({
                name: m,
                date: new Date().toLocaleDateString(),
                source: 'patient_intake_ai'
            })));
        }

        res.json({ success: true, visitId: newVisit.id });

    } catch (error) {
        console.error('Submission error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
