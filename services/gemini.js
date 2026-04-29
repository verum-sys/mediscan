// Vertex AI Gemini client. Mirrors the auth + retry pattern used in
// SupabaseAgent/app/pipeline/gemini.ts. Uses Application Default Credentials
// (GOOGLE_APPLICATION_CREDENTIALS / service-account JSON) to mint OAuth tokens.

import { GoogleAuth } from 'google-auth-library';
import { execSync } from 'child_process';

const GCP_PROJECT = process.env.GOOGLE_PROJECT_ID
    || process.env.DOC_AI_PROJECT_ID
    || 'project-5def41da-b693-4500-a0c';

export const GEMINI_PRO_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-pro-preview';
export const GEMINI_FLASH_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.1-flash-lite-preview';

function urlForModel(model) {
    const isGemini3 = model.startsWith('gemini-3');
    const region = isGemini3 ? 'global' : (process.env.GCP_REGION || 'us-central1');
    const base = isGemini3
        ? `https://aiplatform.googleapis.com/v1/projects/${GCP_PROJECT}/locations/global`
        : `https://${region}-aiplatform.googleapis.com/v1/projects/${GCP_PROJECT}/locations/${region}`;
    return `${base}/publishers/google/models/${model}:generateContent`;
}

let authClient = null;
function getAuth() {
    if (authClient) return authClient;
    const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const credentials = raw ? JSON.parse(raw) : undefined;
    authClient = new GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    return authClient;
}

let cachedToken = null;
async function getAccessToken() {
    if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.token;

    // Try ADC first — works with GOOGLE_APPLICATION_CREDENTIALS / service-account JSON.
    try {
        const client = await getAuth().getClient();
        const res = await client.getAccessToken();
        if (res.token) {
            cachedToken = { token: res.token, expiresAt: Date.now() + 45 * 60_000 };
            return res.token;
        }
    } catch {
        // Fall through to gcloud CLI
    }

    // Local-dev fallback
    const token = execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
    cachedToken = { token, expiresAt: Date.now() + 45 * 60_000 };
    return token;
}

/**
 * Convert OpenAI-style chat messages → Gemini contents + systemInstruction.
 * Gemini uses 'user' / 'model' roles (not 'assistant') and a separate
 * `systemInstruction` field instead of an inline system message.
 */
function toGeminiPayload({ system, messages, jsonMode }) {
    const contents = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
        }));

    const generationConfig = { temperature: 0.2 };
    if (jsonMode) generationConfig.responseMimeType = 'application/json';

    const payload = { contents, generationConfig };
    const sys = system || messages.find(m => m.role === 'system')?.content;
    if (sys) payload.systemInstruction = { parts: [{ text: sys }] };

    return payload;
}

/**
 * Call a single Gemini model with 429/503 retry-with-backoff. Throws on persistent failure.
 */
async function callOneModel(model, payload) {
    const url = urlForModel(model);
    const body = JSON.stringify(payload);

    for (let attempt = 0; attempt < 4; attempt++) {
        const token = await getAccessToken();
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body,
        });

        if (res.status === 429 || res.status === 503) {
            const delay = (attempt + 1) * 4000;
            console.warn(`[gemini:${model}] ${res.status} — retry in ${delay / 1000}s (${attempt + 1}/4)`);
            await new Promise(r => setTimeout(r, delay));
            continue;
        }

        if (!res.ok) throw new Error(`Gemini ${model} ${res.status}: ${(await res.text()).slice(0, 200)}`);

        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error(`Empty Gemini response from ${model}`);
        return text;
    }

    throw new Error(`Gemini ${model} unavailable after retries`);
}

/**
 * Call a Gemini model with the given chat-style payload and return the text reply.
 * @param {Object} args
 * @param {string} args.model
 * @param {string} [args.system]      System instruction
 * @param {Array<{role:string,content:string}>} args.messages
 * @param {boolean} [args.jsonMode]   Request application/json output
 */
export async function callGemini({ model, system, messages, jsonMode = false }) {
    const payload = toGeminiPayload({ system, messages, jsonMode });
    return callOneModel(model, payload);
}
