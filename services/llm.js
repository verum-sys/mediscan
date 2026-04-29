// Unified LLM helper with cascading fallback:
//   1. Gemini Pro   (gemini-3.1-pro-preview, via Vertex AI)
//   2. Gemini Flash (gemini-3.1-flash-lite-preview, via Vertex AI)
//   3. Llama via Cerebras (the existing LLM_API_KEY / LLM_BASE_URL config)
//
// Each tier falls through to the next on auth failure, network error,
// 5xx, or persistent 429 — so a missing GCP setup degrades gracefully
// to the Cerebras Llama API that was previously hard-wired.

import { callGemini, GEMINI_PRO_MODEL, GEMINI_FLASH_MODEL } from './gemini.js';

const LLAMA_BASE_URL = process.env.LLM_BASE_URL || 'https://api.cerebras.ai/v1';
const LLAMA_MODEL = process.env.LLM_MODEL || 'llama3.1-8b';

async function callLlama({ system, messages, jsonMode }) {
    const apiKey = process.env.LLM_API_KEY;
    if (!apiKey) throw new Error('LLM_API_KEY not configured');

    const fullMessages = system
        ? [{ role: 'system', content: system }, ...messages.filter(m => m.role !== 'system')]
        : messages;

    const body = {
        model: LLAMA_MODEL,
        messages: fullMessages.map(m => ({ role: m.role, content: m.content })),
    };
    if (jsonMode) body.response_format = { type: 'json_object' };

    const res = await fetch(`${LLAMA_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Llama API ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('Empty Llama response');
    return text;
}

/**
 * Try Gemini Pro → Gemini Flash → Llama, returning the first successful text reply.
 * @param {Object} args
 * @param {string} [args.system]   System instruction (mapped to systemInstruction for Gemini)
 * @param {Array<{role:string,content:string}>} args.messages
 * @param {boolean} [args.jsonMode]
 * @returns {Promise<{text:string, provider:string, model:string}>}
 */
export async function callLLM({ system, messages, jsonMode = false }) {
    const errors = [];

    // 1. Gemini Pro
    try {
        const text = await callGemini({ model: GEMINI_PRO_MODEL, system, messages, jsonMode });
        return { text, provider: 'gemini', model: GEMINI_PRO_MODEL };
    } catch (e) {
        const msg = e?.message || String(e);
        console.warn(`[llm] Gemini Pro failed: ${msg.slice(0, 200)}`);
        errors.push(`gemini-pro: ${msg}`);
    }

    // 2. Gemini Flash
    try {
        const text = await callGemini({ model: GEMINI_FLASH_MODEL, system, messages, jsonMode });
        return { text, provider: 'gemini', model: GEMINI_FLASH_MODEL };
    } catch (e) {
        const msg = e?.message || String(e);
        console.warn(`[llm] Gemini Flash failed: ${msg.slice(0, 200)}`);
        errors.push(`gemini-flash: ${msg}`);
    }

    // 3. Llama (Cerebras) — last-resort fallback
    try {
        const text = await callLlama({ system, messages, jsonMode });
        return { text, provider: 'llama', model: LLAMA_MODEL };
    } catch (e) {
        const msg = e?.message || String(e);
        console.error(`[llm] Llama fallback failed: ${msg.slice(0, 200)}`);
        errors.push(`llama: ${msg}`);
    }

    throw new Error(`All LLM providers failed. ${errors.join(' | ')}`);
}
