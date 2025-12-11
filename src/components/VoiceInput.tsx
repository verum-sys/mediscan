import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoiceInputProps {
    onTranscript: (text: string) => void;
    onProcessing?: (isProcessing: boolean) => void;
    autoSubmit?: boolean;
    className?: string;
}

export default function VoiceInput({
    onTranscript,
    onProcessing,
    autoSubmit = false,
    className = ''
}: VoiceInputProps) {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const recognitionRef = useRef<any>(null);
    const { toast } = useToast();

    useEffect(() => {
        // Check if browser supports Web Speech API
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            toast({
                title: "Voice Input Not Supported",
                description: "Your browser doesn't support voice input. Please use Chrome, Edge, or Safari.",
                variant: "destructive"
            });
            return;
        }

        // Initialize Speech Recognition
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setIsListening(true);
            toast({
                title: "Listening...",
                description: "Speak now. I'm listening to your input.",
            });
        };

        recognition.onresult = (event: any) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcriptPiece = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcriptPiece + ' ';
                } else {
                    interimTranscript += transcriptPiece;
                }
            }

            // Update transcript in real-time
            const fullTranscript = (transcript + finalTranscript).trim();
            setTranscript(fullTranscript);

            // Send interim results to parent
            if (interimTranscript) {
                onTranscript(fullTranscript + ' ' + interimTranscript);
            } else if (finalTranscript) {
                onTranscript(fullTranscript);
            }
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);

            if (event.error === 'no-speech') {
                toast({
                    title: "No Speech Detected",
                    description: "Please try again and speak clearly.",
                    variant: "destructive"
                });
            } else if (event.error === 'not-allowed') {
                toast({
                    title: "Microphone Access Denied",
                    description: "Please allow microphone access in your browser settings.",
                    variant: "destructive"
                });
            } else {
                toast({
                    title: "Voice Input Error",
                    description: `Error: ${event.error}`,
                    variant: "destructive"
                });
            }
        };

        recognition.onend = () => {
            setIsListening(false);

            // Auto-submit if enabled and we have transcript
            if (autoSubmit && transcript.trim()) {
                handleAutoSubmit();
            }
        };

        recognitionRef.current = recognition;

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [transcript, autoSubmit]);

    const handleAutoSubmit = async () => {
        if (!transcript.trim()) return;

        setIsProcessing(true);
        if (onProcessing) onProcessing(true);

        toast({
            title: "Processing Voice Input",
            description: "Analyzing your dictation with AI...",
        });

        // The transcript has already been sent via onTranscript
        // This is just for UI feedback
        setTimeout(() => {
            setIsProcessing(false);
            if (onProcessing) onProcessing(false);
            setTranscript('');
        }, 1000);
    };

    const toggleListening = () => {
        if (!recognitionRef.current) return;

        if (isListening) {
            recognitionRef.current.stop();
            toast({
                title: "Stopped Listening",
                description: transcript ? "Voice input captured successfully." : "No input detected.",
            });
        } else {
            setTranscript('');
            recognitionRef.current.start();
        }
    };

    return (
        <Button
            type="button"
            variant={isListening ? "destructive" : "outline"}
            size="icon"
            onClick={toggleListening}
            disabled={isProcessing}
            className={`${className} ${isListening ? 'animate-pulse' : ''}`}
            title={isListening ? "Stop listening" : "Start voice input"}
        >
            {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : isListening ? (
                <MicOff className="h-4 w-4" />
            ) : (
                <Mic className="h-4 w-4" />
            )}
        </Button>
    );
}
