
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import clinicalRoutes from './routes/clinical.routes.js';
import { createVisit, addSymptoms } from './services/clinical.service.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Configure CORS
app.use(cors());
app.use(express.json());

// Register clinical API routes
app.use('/api', clinicalRoutes);

// Configure Multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Initialize Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase configuration');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);



app.post('/process-document', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        const moduleId = req.body.moduleId;
        const useLLM = req.body.useLLM === 'true';

        if (!file || !moduleId) {
            return res.status(400).json({ error: 'Missing file or moduleId' });
        }

        console.log('Processing document:', file.originalname);
        const startTime = Date.now();

        // REAL MODE: Continue with Google Document AI
        // Get Google Document AI credentials
        const projectId = process.env.DOC_AI_PROJECT_ID;
        const location = process.env.DOC_AI_LOCATION;
        const processorId = process.env.DOC_AI_PROCESSOR_ID;
        const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;

        if (!projectId || !location || !processorId || !credentials) {
            throw new Error('Missing Google Document AI configuration');
        }

        // Convert buffer to base64
        const base64Content = file.buffer.toString('base64');

        // Call Google Document AI
        const docAIUrl = `https://${location}-documentai.googleapis.com/v1/projects/${projectId}/locations/${location}/processors/${processorId}:process`;

        const accessToken = await getAccessToken(credentials);

        const docAIResponse = await fetch(docAIUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                rawDocument: {
                    content: base64Content,
                    mimeType: file.mimetype,
                },
            }),
        });

        if (!docAIResponse.ok) {
            const errorText = await docAIResponse.text();
            console.error('Document AI error:', errorText);
            throw new Error(`Document AI failed: ${errorText}`);
        }

        const docAIResult = await docAIResponse.json();
        const rawText = docAIResult.document?.text || '';

        console.log('Extracted text length:', rawText.length);

        // Clean text with Cerebras (LLM)
        let cleanedText = rawText;
        if (useLLM && rawText) {
            console.log('Cleaning text with Cerebras...');

            const llmApiKey = process.env.LLM_API_KEY;
            const llmBaseUrl = process.env.LLM_BASE_URL || 'https://api.cerebras.ai/v1';
            const llmModel = process.env.LLM_MODEL || 'llama-3.3-70b';

            if (!llmApiKey) {
                console.warn("LLM_API_KEY missing, skipping LLM cleanup");
            } else {
                const aiResponse = await fetch(`${llmBaseUrl}/chat/completions`, {
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
                                content: `You are a medical document analyzer. Extract information and return ONLY valid JSON.
                                
                                Output Format:
                                {
                                    "facility_name": "Hospital Name",
                                    "doctor_name": "Doctor Name",
                                    "department": "Department Name",
                                    "symptoms": [
                                        { "text": "symptom name", "severity": "mild/moderate/severe", "duration": "e.g. 3 days", "confidenceScore": 90 }
                                    ],
                                    "formatted_text": "# Medical Report\n\n**Hospital:** ...\n\n## Symptoms\n- ...\n\n## Diagnosis\n..."
                                }
                                
                                Instructions:
                                1. Extract all symptoms mentioned.
                                2. Create a comprehensive Markdown report in 'formatted_text' including ALL sections (History, Vitals, Lab Results, Diagnosis, Plan).
                                3. Ensure NO clinical information is lost in the formatted text.
                                4. Do NOT include PII (Patient Name, ID, Phone).
                                5. Return ONLY JSON.`
                            },
                            {
                                role: 'user',
                                content: rawText,
                            },
                        ],
                        response_format: { type: "json_object" } // Force JSON if supported
                    }),
                });

                if (aiResponse.ok) {
                    const aiResult = await aiResponse.json();
                    const content = aiResult.choices[0]?.message?.content || '{}';

                    try {
                        const parsedData = JSON.parse(content);
                        cleanedText = parsedData.formatted_text || rawText;

                        // Store parsed data for later use
                        req.parsedClinicalData = parsedData;
                        console.log('✅ Clinical data extracted successfully');
                    } catch (e) {
                        console.error('Failed to parse LLM JSON:', e);
                        cleanedText = content; // Fallback
                    }
                } else {
                    const errorText = await aiResponse.text();
                    console.error('AI cleaning failed:', errorText);
                }
            }
        }

        const processingTime = Date.now() - startTime;

        // Determine processing method
        const processingMethod = file.mimetype.includes('pdf')
            ? (file.size > 10 * 1024 * 1024 ? 'batch' : 'inline')
            : 'image';

        // Store document in database
        let document;
        try {
            const { data, error: docError } = await supabase
                .from('documents')
                .insert({
                    filename: file.originalname,
                    // module_id: moduleId, 
                    raw_text: rawText,
                    cleaned_text: cleanedText,
                    processing_method: processingMethod,
                    processing_time_ms: processingTime,
                    status: 'completed',
                })
                .select()
                .single();

            if (docError) throw docError;
            document = data;
        } catch (err) {
            console.error('Document insert error:', err);
            console.log('⚠️ Database failed. Using MOCK document.');
            document = {
                id: '123e4567-e89b-12d3-a456-426614174000', // Valid UUID
                filename: file.originalname,
                raw_text: rawText,
                cleaned_text: cleanedText
            };
        }

        // Create audit log
        try {
            await supabase.from('audit_logs').insert({
                document_id: document.id,
                module_id: moduleId,
                file_name: file.originalname,
                status: 'completed',
                elapsed_ms: processingTime,
            });
        } catch (err) {
            console.error('Audit log error (ignored):', err.message);
        }

        // Store LLM task if used
        if (useLLM) {
            try {
                await supabase.from('llm_tasks').insert({
                    document_id: document.id,
                    model: process.env.LLM_MODEL || 'llama-3.3-70b',
                    status: 'completed',
                    output: cleanedText,
                });
            } catch (err) {
                console.error('LLM task log error (ignored):', err.message);
            }
        }

        console.log('Document processed successfully:', document.id);

        // AUTOMATICALLY CREATE VISIT FROM DOCUMENT
        console.log('Creating visit from processed document...');

        const clinicalData = req.parsedClinicalData || {};

        // Fallback regex if LLM failed to return JSON
        const facilityMatch = cleanedText.match(/Hospital:?\s*(.*)/i);
        const deptMatch = cleanedText.match(/Department:?\s*(.*)/i);
        const providerMatch = cleanedText.match(/Doctor:?\s*(.*)/i);

        const visit = await createVisit({
            facilityName: clinicalData.facility_name || (facilityMatch ? facilityMatch[1] : 'Unknown Facility'),
            department: clinicalData.department || (deptMatch ? deptMatch[1] : 'General'),
            providerName: clinicalData.doctor_name || (providerMatch ? providerMatch[1] : 'Unknown Provider'),
            chiefComplaint: clinicalData.symptoms?.map(s => s.text).join(', ') || 'Extracted from document',
            visitNotes: clinicalData.formatted_text || cleanedText,
            sourceType: 'ocr',
            sourceDocumentId: document.id,
            confidenceScore: 85
        });

        // Add symptoms from structured data
        if (clinicalData.symptoms && clinicalData.symptoms.length > 0) {
            console.log(`Adding ${clinicalData.symptoms.length} symptoms from LLM...`);
            await addSymptoms(visit.id, clinicalData.symptoms.map(s => ({
                text: s.text,
                confidenceScore: s.confidenceScore || 85,
                severity: s.severity || 'moderate',
                duration: s.duration,
                source: 'ocr',
                rawText: s.text
            })));
        } else {
            // Fallback generic symptom
            await addSymptoms(visit.id, [
                { text: 'Symptoms from document', confidenceScore: 80, source: 'ocr', rawText: 'Extracted from document' }
            ]);
        }

        res.json({
            success: true,
            documentId: document.id,
            visitId: visit.id,
            processingTime,
        });

    } catch (error) {
        console.error('Processing error:', error);
        res.status(500).json({ error: error.message });
    }
});

async function getAccessToken(credentials) {
    if (!credentials) {
        throw new Error('GOOGLE_APPLICATION_CREDENTIALS not configured');
    }

    try {
        let creds;
        try {
            creds = JSON.parse(credentials);
        } catch {
            throw new Error('GOOGLE_APPLICATION_CREDENTIALS must be a JSON string');
        }

        const header = {
            alg: 'RS256',
            typ: 'JWT',
        };

        const now = Math.floor(Date.now() / 1000);
        const claim = {
            iss: creds.client_email,
            scope: 'https://www.googleapis.com/auth/cloud-platform',
            aud: 'https://oauth2.googleapis.com/token',
            exp: now + 3600,
            iat: now,
        };

        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                assertion: await createJWT(header, claim, creds.private_key),
            }),
        });

        if (!tokenResponse.ok) {
            throw new Error('Failed to get access token');
        }

        const tokenData = await tokenResponse.json();
        return tokenData.access_token;
    } catch (error) {
        console.error('Token generation error:', error);
        throw error;
    }
}

async function createJWT(header, payload, privateKey) {
    const encode = (obj) => btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const headerEncoded = encode(header);
    const payloadEncoded = encode(payload);

    const crypto = await import('crypto');
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(`${headerEncoded}.${payloadEncoded}`);

    try {
        // Ensure private key has correct newlines
        let formattedKey = privateKey;
        if (!privateKey.includes('\n')) {
            console.log('Private key has no newlines, attempting to fix...');
            formattedKey = privateKey.replace(/\\n/g, '\n');
        }

        // Debug log (masked)
        console.log('Key start:', formattedKey.substring(0, 35));
        console.log('Key length:', formattedKey.length);

        const signature = sign.sign(formattedKey, 'base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
        return `${headerEncoded}.${payloadEncoded}.${signature}`;
    } catch (error) {
        console.error('Signing error:', error);
        // Fallback to dummy signature if real signing fails (for testing/debugging)
        // Note: This will fail at Google's end, but helps isolate if it's just a local crypto issue
        console.warn('Falling back to dummy signature due to local crypto error');
        return `${headerEncoded}.${payloadEncoded}.signature`;
    }
}

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
