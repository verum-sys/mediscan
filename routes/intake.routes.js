
import express from 'express';
import * as service from '../services/dynamo.service.js';
import { callLLM } from '../services/llm.js';

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
        const { messages, currentData, language = 'en-US', pid } = req.body || {};

        // Validate payload so malformed input can't crash the process.
        if (!Array.isArray(messages)) {
            return res.status(400).json({ error: 'messages must be an array' });
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

        // Count how many times the patient has replied so far. The protocol allows
        // EXACTLY 5 questions; after the 5th user reply we force the conclusion.
        const userReplyCount = Array.isArray(messages) ? messages.filter(m => m.role === 'user').length : 0;
        const mustConclude = userReplyCount >= 5;

        // Map question numbers to their content so we can inject the EXACT next
        // question into the prompt — leaving it to the LLM was unreliable
        // (the model would acknowledge the answer and stop without asking next).
        const questions = {
            1: 'Ask for the patient\'s Name, Age, Gender, and Residential Area (all in this single message).',
            2: 'Ask "What seems to be the problem today?" (the Chief Complaint).',
            3: 'Ask about the Duration and Severity of the complaint, plus any specific characteristics.',
            4: 'Ask about past Medical History — any chronic illnesses, prior surgeries, or hospitalizations.',
            5: 'Ask about Current Medications and any known Allergies.'
        };

        const nextQuestionNumber = userReplyCount + 1;
        const nextQuestion = questions[nextQuestionNumber];

        let stepInstruction;
        if (mustConclude) {
            stepInstruction = `The patient has now answered all 5 questions. YOU MUST DELIVER THE CONCLUSION. Do NOT ask any more questions. Set "is_complete": true.`;
        } else if (userReplyCount === 0) {
            stepInstruction = `This is the first message. Ask QUESTION 1: ${questions[1]} Set "is_complete": false.`;
        } else {
            stepInstruction = `The patient has answered ${userReplyCount} of 5 question(s). Briefly acknowledge their last reply (one short sentence), THEN in the SAME response ask QUESTION ${nextQuestionNumber}: ${nextQuestion} Your response MUST include the next question — never stop on just an acknowledgement. Set "is_complete": false.`;
        }

        const systemPrompt = `You are a friendly AI health assistant conducting a patient intake interview.
        You MUST follow this STRICT Step-by-Step Protocol. Do not deviate. Ask EXACTLY 5 questions, no more, no fewer.

        QUESTION 1: ${questions[1]}
        QUESTION 2: ${questions[2]}
        QUESTION 3: ${questions[3]}
        QUESTION 4: ${questions[4]}
        QUESTION 5: ${questions[5]}
        CONCLUSION (after the patient answers QUESTION 5):
           - Inform the patient: "Your Unique ID is ${pid}. Please proceed to Room 2, Floor 3. Waiting time is approx 10 mins."
           - Then say: "Thank you! I have all the information needed. Generating your summary now."
           - Set "is_complete": true.

        CURRENT TURN INSTRUCTION:
        ${stepInstruction}

        IMPORTANT RULES:
        - Never ask more than 5 questions in total. Never repeat a previous question.
        - After every patient reply (except the 5th), your response MUST end with the next question.
        - Do NOT just confirm or acknowledge an answer without also asking the next question.
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
        - CRITICAL: ALL extracted values (chiefComplaint, symptoms, medicalHistory, currentMedications, allergies, gender) MUST be in standard ENGLISH medical terminology — NEVER in the patient's spoken language. The user may speak Hindi/Bengali/Tamil/etc., but every extracted clinical value MUST be translated to English before being placed in the JSON.
        - Examples:
            "मुझे बुखार है" -> "symptoms": ["Fever"]
            "सूखी खांसी" -> "symptoms": ["Dry Cough"]
            "जुकाम" -> "symptoms": ["Common Cold"]
            "सिरदर्द" -> "symptoms": ["Headache"]
            "पिछले 4 दिनों से खांसी जुकाम और बुखार" -> "chiefComplaint": "Cough, common cold, and fever for 4 days"
            "पुरुष" -> "gender": "Male", "महिला" -> "gender": "Female"
        - "name" should be left in its original script (proper noun).
        - "symptoms": List distinct symptoms mentioned, each translated to its English medical term.
        - "medicalHistory": List past diseases in English.
        - If you cannot find a precise English equivalent, transliterate as a last resort.
        
        Current collected data: ${JSON.stringify(currentData)}`;

        // Try Gemini Pro → Gemini Flash → Llama (Cerebras), in order.
        const llmResult = await callLLM({
            system: systemPrompt,
            messages: messages.map(m => ({ role: m.role, content: m.content })),
            jsonMode: true,
        });
        console.log(`[intake] LLM provider: ${llmResult.provider} (${llmResult.model})`);
        const content = llmResult.text || '{}';

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

        let responseText = parsedResult.response || 'I apologize, could you please repeat that?';

        // Strip PID if the LLM leaked it at the start of the response (before STEP 5)
        if (pid && !parsedResult.is_complete) {
            responseText = responseText.replace(new RegExp(`^\\s*${pid}[,\\s]*`), '');
        }

        // Robust Merging Strategy
        const newData = parsedResult.extracted_data || {};
        const updatedData = { ...currentData };

        // Case-insensitive / Multi-key extraction
        const nameKey = Object.keys(newData).find(k => k.toLowerCase() === 'name');
        if (nameKey && newData[nameKey]) updatedData.name = newData[nameKey]; // Only update if truthy

        const ageKey = Object.keys(newData).find(k => k.toLowerCase() === 'age');
        if (ageKey && newData[ageKey]) updatedData.age = newData[ageKey]; // Only update if truthy

        const genderKey = Object.keys(newData).find(k => k.toLowerCase() === 'gender');
        if (genderKey && newData[genderKey]) updatedData.gender = newData[genderKey]; // Only update if truthy

        const complaintKey = Object.keys(newData).find(k => k.toLowerCase() === 'chiefcomplaint' || k.toLowerCase() === 'complaint');
        if (complaintKey && newData[complaintKey]) {
            // Merge complaints if they are different and meaningful
            if (updatedData.chiefComplaint && updatedData.chiefComplaint !== newData[complaintKey]) {
                if (!updatedData.chiefComplaint.toLowerCase().includes(newData[complaintKey].toLowerCase())) {
                    updatedData.chiefComplaint = `${updatedData.chiefComplaint}, ${newData[complaintKey]}`;
                }
            } else {
                updatedData.chiefComplaint = newData[complaintKey];
            }
        }

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

        // Hard cap: once the patient has answered 5 questions, the interview is over
        // regardless of what the LLM decides. This guarantees the protocol is enforced.
        const isComplete = mustConclude || parsedResult.is_complete || false;

        res.json({
            response: responseText,
            patientData: updatedData,
            isComplete
        });

    } catch (error) {
        console.error('Patient intake error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Submit Patient Intake Endpoint
router.post('/patient-intake/submit', async (req, res) => {
    try {
        const { patientData, conversation, pid } = req.body || {};

        // Validate payload shape so a malformed POST can't crash the process
        // (e.g. `conversation.map` on undefined).
        if (!patientData || typeof patientData !== 'object') {
            return res.status(400).json({ error: 'patientData is required' });
        }
        if (!Array.isArray(conversation)) {
            return res.status(400).json({ error: 'conversation must be an array' });
        }

        // 1. Force every clinical field to English regardless of intake language.
        // The chat-time extraction is asked to translate, but LLMs sometimes
        // preserve the source language when the user is fluent in it. This pass
        // is the load-bearing guarantee that the visit record is in English.
        let translatedData = patientData;
        try {
            const translationResult = await callLLM({
                system: `You are a medical translator. Translate ALL values in the supplied JSON to standard ENGLISH medical terminology, regardless of the input language (Hindi, Bengali, etc.). Keep the JSON structure and field names identical. Do NOT add or remove fields.

Rules:
- "name": leave proper nouns as-is in their original script (do not transliterate names).
- "gender": output "Male" / "Female" / "Other".
- "chiefComplaint": translate to a concise English clinical phrase.
- "symptoms", "medicalHistory", "currentMedications", "allergies": translate each array entry to its standard English medical term (e.g. "खांसी" -> "Cough", "बुखार" -> "Fever", "जुकाम" -> "Common Cold", "सिरदर्द" -> "Headache").
- Numeric fields (age) stay numeric.
- If a value is already English, return it unchanged.

Return ONLY a JSON object with the same shape as the input.`,
                messages: [{ role: 'user', content: JSON.stringify(patientData) }],
                jsonMode: true,
            });
            console.log(`[intake/submit] Translation provider: ${translationResult.provider} (${translationResult.model})`);
            const parsed = parseLLMResponse(translationResult.text);
            if (parsed && typeof parsed === 'object') {
                // Merge over the original so any field the model accidentally
                // dropped still has its prior value as a backstop.
                translatedData = { ...patientData, ...parsed };
            }
        } catch (e) {
            console.error("English translation pass failed; saving original data:", e);
        }

        // 2. Generate High-Quality English Summary via LLM
        let summaryText = `[${new Date().toLocaleDateString()}] Patient completed self-intake.`;

        try {
            const conversationText = conversation.map(m => `${m.role}: ${m.content}`).join('\n');
            const summaryResult = await callLLM({
                system: `Summarize the following medical intake conversation into EXACTLY 2 concise lines in ENGLISH.
                Even if the conversation is in Hindi or another language, the summary MUST be in ENGLISH.
                Include: Name, Age, Gender, Chief Complaint (Translate to English), Symptom specifics, and History/Meds.
                Start directly with the details.`,
                messages: [{ role: 'user', content: conversationText }],
                jsonMode: false,
            });
            console.log(`[intake/submit] Summary provider: ${summaryResult.provider} (${summaryResult.model})`);
            if (summaryResult.text) summaryText = `[${new Date().toLocaleDateString()}] ${summaryResult.text}`;
        } catch (e) {
            console.error("Summary generation failed", e);
        }

        // 3. Create Visit Record using the English-translated data
        const visitData = {
            patientName: translatedData.name || 'Unknown',
            age: translatedData.age || 0,
            gender: translatedData.gender || 'Unknown',
            contactNumber: 'N/A',
            chiefComplaint: translatedData.chiefComplaint || translatedData.symptoms?.[0] || 'Checkup',
            department: 'General Medicine',
            providerName: translatedData.name || 'Self-Intake',
            triagePriority: 'Routine',
            assignedDoctorId: 'doc-123',
            status: 'waiting',
            symptoms: translatedData.symptoms || [],
            notes: summaryText,
            aiSummary: summaryText
        };

        const newVisit = await service.createVisit(visitData);

        // 4. Persist Symptoms (in English) to DB
        if (translatedData.symptoms && translatedData.symptoms.length > 0) {
            await service.addSymptoms(newVisit.id, translatedData.symptoms.map(s => ({
                text: s,
                confidenceScore: 90,
                severity: 'Moderate',
                duration: 'Not specified',
                source: 'patient_intake_ai'
            })));
        }

        // 5. Persist Medications (in English) to DB
        if (translatedData.currentMedications && translatedData.currentMedications.length > 0) {
            await service.addMedications(newVisit.id, translatedData.currentMedications.map(m => ({
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
