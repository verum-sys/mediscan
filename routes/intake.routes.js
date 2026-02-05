
import express from 'express';
import * as service from '../services/dynamo.service.js';

const router = express.Router();

/**
 * Robustly parses JSON from LLM output, handling markdown code blocks and extra text.
 */
const parseLLMResponse = (content) => {
    try {
        // 1. Try direct parse
        return JSON.parse(content);
    } catch (e) {
        // 2. Try extracting from markdown
        try {
            const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
            if (cleanContent.startsWith('{')) {
                return JSON.parse(cleanContent);
            }
        } catch (e2) { }

        // 3. Try finding first { and last }
        try {
            const start = content.indexOf('{');
            const end = content.lastIndexOf('}');
            if (start !== -1 && end !== -1 && end > start) {
                const jsonStr = content.substring(start, end + 1);
                return JSON.parse(jsonStr);
            }
        } catch (e3) {
            console.error("JSON Parse inner error:", e3.message);
        }
    }
    return null;
};

/**
 * Detects if text contains non-ASCII characters (likely non-English)
 */
const containsNonEnglish = (text) => {
    if (!text || typeof text !== 'string') return false;
    // Check for non-ASCII characters (Hindi, Bengali, Tamil, etc. are outside ASCII range)
    return /[^\x00-\x7F]/.test(text);
};

/**
 * Translates text to English using LLM if it contains non-English characters
 */
const translateToEnglish = async (text, llmApiKey, llmBaseUrl, llmModel) => {
    if (!text || !containsNonEnglish(text)) {
        return text; // Already English or empty
    }

    try {
        const response = await fetch(`${llmBaseUrl}/chat/completions`, {
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
                        content: `You are a medical translator. Translate the following text to English medical terminology. 
                        Output ONLY the English translation, nothing else.
                        If it's already in English, output it as is.
                        Be accurate and use proper medical terms.`
                    },
                    { role: 'user', content: text }
                ]
            })
        });

        if (response.ok) {
            const result = await response.json();
            const translated = result.choices[0]?.message?.content?.trim();
            if (translated) {
                console.log(`Translated "${text}" to "${translated}"`);
                return translated;
            }
        }
    } catch (e) {
        console.error('Translation error:', e);
    }
    return text; // Return original if translation fails
};

/**
 * Translates an array of strings to English
 */
const translateArrayToEnglish = async (arr, llmApiKey, llmBaseUrl, llmModel) => {
    if (!Array.isArray(arr) || arr.length === 0) return arr;

    // Check if any item needs translation
    const needsTranslation = arr.some(item => containsNonEnglish(item));
    if (!needsTranslation) return arr;

    try {
        const response = await fetch(`${llmBaseUrl}/chat/completions`, {
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
                        content: `You are a medical translator. Translate each item in the following list to English medical terminology.
                        Output ONLY a JSON array of translated strings, nothing else.
                        Example input: ["बुखार", "खांसी"]
                        Example output: ["Fever", "Cough"]`
                    },
                    { role: 'user', content: JSON.stringify(arr) }
                ]
            })
        });

        if (response.ok) {
            const result = await response.json();
            const translated = result.choices[0]?.message?.content?.trim();
            if (translated) {
                try {
                    const parsedArr = JSON.parse(translated);
                    if (Array.isArray(parsedArr)) {
                        console.log(`Translated array from ${JSON.stringify(arr)} to ${JSON.stringify(parsedArr)}`);
                        return parsedArr;
                    }
                } catch (parseErr) {
                    console.error('Failed to parse translated array:', parseErr);
                }
            }
        }
    } catch (e) {
        console.error('Array translation error:', e);
    }
    return arr; // Return original if translation fails
};

// Patient Intake Chat Endpoint
router.post('/patient-intake', async (req, res) => {
    try {
        const { messages, currentData, language = 'en-US', pid } = req.body;

        const llmApiKey = process.env.LLM_API_KEY;
        const llmBaseUrl = process.env.LLM_BASE_URL || 'https://api.cerebras.ai/v1';
        const llmModel = process.env.LLM_MODEL || 'llama-3.3-70b';

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
        
        ⚠️ CRITICAL TRANSLATION REQUIREMENT ⚠️
        - ALL medical data fields MUST be translated to standard ENGLISH Medical Terms.
        - This applies to: symptoms, chiefComplaint, medicalHistory, currentMedications, allergies
        - NEVER return Non-English text in 'extracted_data' - ONLY English medical terminology.
        - The patient can speak in ANY language, but you MUST extract in English.
        
        EXAMPLES:
        - User says "मुझे बुखार है" (Hindi) → extract "symptoms": ["Fever"]
        - User says "सीने में दर्द" (Hindi) → extract "chiefComplaint": "Chest Pain"
        - User says "मुझे डायबिटीज है" (Hindi) → extract "medicalHistory": ["Diabetes"]
        - User says "मैं पैरासिटामोल लेता हूं" (Hindi) → extract "currentMedications": ["Paracetamol"]
        - User says "मुझे मूंगफली से एलर्जी है" (Hindi) → extract "allergies": ["Peanuts"]
        
        DATA FIELDS:
        - "name": Patient's name (can be in original language/script)
        - "age": Number only
        - "gender": Male/Female/Other (in English)
        - "symptoms": List distinct symptoms in English medical terms
        - "chiefComplaint": Main complaint in English medical terms
        - "medicalHistory": Past diseases/conditions in English medical terms
        - "currentMedications": Current medications in English (generic or brand names)
        - "allergies": Allergies in English medical terms
        
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
                // response_format: { type: "json_object" }
            })
        });

        if (!aiResponse.ok) {
            const err = await aiResponse.text();
            console.error('LLM Error:', err);
            throw new Error('LLM API failed');
        }

        const aiResult = await aiResponse.json();
        const content = aiResult.choices[0]?.message?.content || '{}';

        // Log RAW content to debug
        // console.log("RAW LLM OUTPUT:", content);

        let parsedResult = parseLLMResponse(content);

        // Fallback if parsing completely fails
        if (!parsedResult) {
            console.error("Failed to parse LLM JSON. Raw content:", content);
            // Try to extract just the "response" field if it's visible in the raw text
            let extractedResponse = 'I apologize, could you please repeat that?';
            try {
                // Attempt to extract response field from malformed JSON
                const responseMatch = content.match(/"response"\s*:\s*"([^"]+)"/);
                if (responseMatch && responseMatch[1]) {
                    extractedResponse = responseMatch[1];
                }
            } catch (e) {
                console.error("Could not extract response from malformed JSON");
            }

            parsedResult = {
                response: extractedResponse,
                extracted_data: {},
                is_complete: false
            };
        }

        const responseText = parsedResult.response || 'I apologize, could you please repeat that?';

        // Additional check: if responseText itself looks like JSON, try to parse it
        let finalResponseText = responseText;
        if (typeof responseText === 'string' && (responseText.trim().startsWith('{') || responseText.trim().startsWith('['))) {
            console.warn("Response field contains JSON string, attempting to extract actual message");
            try {
                const innerParsed = JSON.parse(responseText);
                if (innerParsed.response) {
                    finalResponseText = innerParsed.response;
                    // Also update extracted_data if present
                    if (innerParsed.extracted_data) {
                        parsedResult.extracted_data = innerParsed.extracted_data;
                    }
                    if (innerParsed.is_complete !== undefined) {
                        parsedResult.is_complete = innerParsed.is_complete;
                    }
                }
            } catch (e) {
                console.error("Failed to parse nested JSON in response field");
            }
        }

        // Robust Merging Strategy
        const newData = parsedResult.extracted_data || {};
        const updatedData = { ...currentData };

        if (newData.name) updatedData.name = newData.name;
        if (newData.age) updatedData.age = newData.age;
        if (newData.gender) updatedData.gender = newData.gender;
        if (newData.chiefComplaint) updatedData.chiefComplaint = newData.chiefComplaint;

        // Helper to merge arrays uniquely
        const mergeArrays = (oldArr, newArr) => Array.from(new Set([...(oldArr || []), ...(newArr || [])]));

        if (Array.isArray(newData.symptoms)) updatedData.symptoms = mergeArrays(updatedData.symptoms, newData.symptoms);
        if (Array.isArray(newData.medicalHistory)) updatedData.medicalHistory = mergeArrays(updatedData.medicalHistory, newData.medicalHistory);
        if (Array.isArray(newData.currentMedications)) updatedData.currentMedications = mergeArrays(updatedData.currentMedications, newData.currentMedications);
        if (Array.isArray(newData.allergies)) updatedData.allergies = mergeArrays(updatedData.allergies, newData.allergies);

        res.json({
            response: finalResponseText,
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
                            Even if the conversation is in Hindi, Spanish, or ANY other language, the output summary MUST be in ENGLISH.
                            Do not use the original language in the summary. Translate everything.
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

        // 2. TRANSLATE ALL FIELDS to English before storing
        let chiefComplaint = patientData.chiefComplaint || patientData.symptoms?.[0] || 'Checkup';
        let symptoms = patientData.symptoms || [];
        let medicalHistory = patientData.medicalHistory || [];
        let currentMedications = patientData.currentMedications || [];
        let allergies = patientData.allergies || [];

        // Translate chiefComplaint if it contains non-English text
        chiefComplaint = await translateToEnglish(chiefComplaint, llmApiKey, llmBaseUrl, llmModel);
        console.log(`Chief Complaint after translation: ${chiefComplaint}`);

        // Translate symptoms array if any item contains non-English text
        symptoms = await translateArrayToEnglish(symptoms, llmApiKey, llmBaseUrl, llmModel);
        console.log(`Symptoms after translation: ${JSON.stringify(symptoms)}`);

        // Translate medical history
        medicalHistory = await translateArrayToEnglish(medicalHistory, llmApiKey, llmBaseUrl, llmModel);
        console.log(`Medical History after translation: ${JSON.stringify(medicalHistory)}`);

        // Translate current medications
        currentMedications = await translateArrayToEnglish(currentMedications, llmApiKey, llmBaseUrl, llmModel);
        console.log(`Current Medications after translation: ${JSON.stringify(currentMedications)}`);

        // Translate allergies
        allergies = await translateArrayToEnglish(allergies, llmApiKey, llmBaseUrl, llmModel);
        console.log(`Allergies after translation: ${JSON.stringify(allergies)}`);

        // 3. Create Visit Record with translated data
        const visitData = {
            id: pid,
            visit_number: pid,
            patientName: patientData.name || 'Unknown',
            age: patientData.age || 0,
            gender: patientData.gender || 'Unknown',
            contactNumber: 'N/A',
            chiefComplaint: chiefComplaint,
            department: 'General Medicine',
            triagePriority: 'Routine', // Default, could be upgraded by AI analysis
            assignedDoctorId: 'doc-123', // Default
            status: 'waiting',
            symptoms: symptoms,
            medicalHistory: medicalHistory,
            currentMedications: currentMedications,
            allergies: allergies,
            notes: summaryText,
            aiSummary: summaryText
        };

        const newVisit = await service.createVisit(visitData);

        // 4. Persist Symptoms to DynamoDB (already translated)
        if (symptoms && symptoms.length > 0) {
            await service.addSymptoms(newVisit.id, symptoms.map(s => ({
                text: s,
                confidenceScore: 90,
                severity: 'Moderate',
                duration: 'Not specified',
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
