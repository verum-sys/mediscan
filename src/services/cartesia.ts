
export const CARTESIA_API_KEY = import.meta.env.VITE_CARTESIA_API_KEY;

// Voice ID for "Indian Lady"
export const DEFAULT_VOICE_ID = "3b554273-4299-48b9-9aaf-eefd438e3941";

export async function speakText(text: string, language: string = "hi", voiceId: string = DEFAULT_VOICE_ID): Promise<HTMLAudioElement | null> {
    if (!CARTESIA_API_KEY) {
        console.error("Missing VITE_CARTESIA_API_KEY");
        return null;
    }

    try {
        const response = await fetch("https://api.cartesia.ai/tts/bytes", {
            method: "POST",
            headers: {
                "X-API-Key": CARTESIA_API_KEY,
                "Cartesia-Version": "2024-06-10",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model_id: "sonic-multilingual", // Use multilingual model for correct Hindi pronunciation
                transcript: text,
                voice: {
                    mode: "id",
                    id: voiceId
                },
                language: language,
                output_format: {
                    container: "mp3",
                    bit_rate: 128000,
                    sample_rate: 44100
                }
            })
        });

        if (!response.ok) {
            const err = await response.text();
            console.error("Cartesia API Error:", err);
            return null;
        }

        const arrayBuffer = await response.arrayBuffer();
        const blob = new Blob([arrayBuffer], { type: "audio/mpeg" });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);

        return audio;
    } catch (error) {
        console.error("Failed to speak with Cartesia:", error);
        return null;
    }
}
