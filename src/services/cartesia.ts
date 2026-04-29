
export const CARTESIA_API_KEY = import.meta.env.VITE_CARTESIA_API_KEY;
export const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;

export const DEFAULT_VOICE_ID = "3b554273-4299-48b9-9aaf-eefd438e3941"; // Cartesia: Indian Lady

const ELEVENLABS_VOICES: Record<string, string> = {
    male: "pNInz6obpgDQGcFmaJgB",   // Adam
    female: "EXAVITQu4vr4xnSDxMaL", // Sarah
    guest: "JBFqnCBsd6RMkjVDRZzb"   // George
};

/**
 * Unified Text-to-Speech Service
 * Implements cascading fallback: Cartesia -> ElevenLabs -> Browser (Edge TTS)
 */
export async function speakText(text: string, language: string = "hi", voiceId: string = DEFAULT_VOICE_ID): Promise<HTMLAudioElement | null> {

    // 1. Try Cartesia (Primary)
    if (CARTESIA_API_KEY) {
        try {
            const langCode = language.split('-')[0] || 'en'; // Cartesia expects 'hi', 'en'

            const response = await fetch("https://api.cartesia.ai/tts/bytes", {
                method: "POST",
                headers: {
                    "X-API-Key": CARTESIA_API_KEY,
                    "Cartesia-Version": "2024-06-10",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model_id: "sonic-multilingual",
                    transcript: text,
                    voice: { mode: "id", id: voiceId },
                    language: langCode,
                    output_format: { container: "mp3", bit_rate: 64000, sample_rate: 44100 }
                })
            });

            if (!response.ok) {
                // Throw on 402 or other errors to trigger fallback
                throw new Error(`Cartesia Status: ${response.status} ${response.statusText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const blob = new Blob([arrayBuffer], { type: "audio/mpeg" });
            return new Audio(URL.createObjectURL(blob));

        } catch (error) {
            console.warn("⚠️ Cartesia TTS failed, switching to fallback:", error);
            // Fall through to next strategy
        }
    }

    // 2. Try ElevenLabs (Fallback #1)
    if (ELEVENLABS_API_KEY) {
        try {
            console.log("🔊 Using ElevenLabs Fallback...");
            const elVoiceId = ELEVENLABS_VOICES.female; // Default to Sarah

            const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${elVoiceId}`, {
                method: "POST",
                headers: {
                    "xi-api-key": ELEVENLABS_API_KEY,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    text: text,
                    model_id: "eleven_turbo_v2_5", // Fast multilingual model
                    voice_settings: { stability: 0.5, similarity_boost: 0.75 }
                })
            });

            if (!response.ok) throw new Error(`ElevenLabs Status: ${response.status}`);

            const arrayBuffer = await response.arrayBuffer();
            const blob = new Blob([arrayBuffer], { type: "audio/mpeg" });
            return new Audio(URL.createObjectURL(blob));
        } catch (error) {
            console.warn("⚠️ ElevenLabs Fallback failed:", error);
        }
    }

    // 3. Resemble AI / Chatterbox
    // Not implemented: Requires project_id or backend proxy. Skipping to final fallback.

    // 4. Fallback to Browser / Edge TTS (Final)
    console.log("🔊 Fallback to Browser Native TTS");
    return new Promise((resolve) => {
        if (!window.speechSynthesis) {
            console.error("Browser TTS not supported");
            resolve(null);
            return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language; // Pass full code (e.g. hi-IN)
        utterance.rate = 0.9;

        // getVoices() is async — voices may not be populated on first call.
        // Wait for the voiceschanged event if the list is empty.
        const buildAndSpeak = (voices: SpeechSynthesisVoice[]) => {
            const baseLang = language.split('-')[0];

            // Priority: Exact Match -> Base Lang + (Google/Edge/Natural) -> Base Lang
            let preferredVoice = voices.find(v => v.lang === language) ||
                voices.find(v => v.lang.startsWith(baseLang) && (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Edge")));

            if (!preferredVoice) {
                preferredVoice = voices.find(v => v.lang.startsWith(baseLang));
            }

            if (preferredVoice) {
                utterance.voice = preferredVoice;
                console.log(`🎙️ Using voice: ${preferredVoice.name}`);
            }

            // Return Mock Audio Element interface for compatibility
            const mockAudio = {
                play: async () => {
                    window.speechSynthesis.cancel();
                    window.speechSynthesis.speak(utterance);
                },
                set onended(callback: (() => void) | null) {
                    utterance.onend = callback ? () => callback() : null;
                },
                pause: () => window.speechSynthesis.cancel(),
                currentTime: 0,
                duration: 0
            };

            resolve(mockAudio as unknown as HTMLAudioElement);
        };

        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            buildAndSpeak(voices);
        } else {
            // Voices not yet loaded — wait for the event then proceed
            window.speechSynthesis.onvoiceschanged = () => {
                window.speechSynthesis.onvoiceschanged = null;
                buildAndSpeak(window.speechSynthesis.getVoices());
            };
        }
    });
}
