import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Send, Mic, Sparkles } from 'lucide-react';
import VoiceInput from '@/components/VoiceInput';
import { useToast } from '@/hooks/use-toast';
import { getApiUrl } from '@/config';

export default function VoiceMode() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [transcript, setTranscript] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<any>(null);

    // Speak initial greeting when component loads
    useEffect(() => {
        const greeting = "Hello! I'm ready to help you record patient symptoms. Please describe the patient's symptoms, medical history, or chief complaint. You can start speaking now.";

        // Small delay to ensure speech synthesis is ready
        setTimeout(() => {
            const utterance = new SpeechSynthesisUtterance(greeting);
            utterance.rate = 0.9;
            utterance.pitch = 1;
            utterance.volume = 1;
            window.speechSynthesis.speak(utterance);
        }, 500);

        return () => {
            window.speechSynthesis.cancel();
        };
    }, []);

    const handleTranscript = (text: string) => {
        setTranscript(text);
    };

    const processVoiceInput = async () => {
        if (!transcript.trim()) {
            toast({
                title: "No Input",
                description: "Please speak or type something first.",
                variant: "destructive"
            });
            return;
        }

        setIsProcessing(true);
        setResult(null);

        try {
            toast({
                title: "Processing Voice Input",
                description: "Extracting symptoms with AI...",
            });

            // Process voice input through LLM (same as PDF processing)
            const response = await fetch(getApiUrl('/api/process-voice'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    transcript: transcript
                })
            });

            if (response.ok) {
                const data = await response.json();

                toast({
                    title: "Success!",
                    description: `Visit created with ${data.symptomsAdded} symptoms extracted`,
                });

                // Navigate to the visit detail page
                setTimeout(() => {
                    navigate(`/visit/${data.visit.id}`);
                }, 1500);
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to process voice input');
            }
        } catch (error: any) {
            console.error('Error processing voice input:', error);
            toast({
                title: "Processing Failed",
                description: error.message || "Could not process your voice input. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-4 md:py-8">
            <div className="container mx-auto px-4 md:px-6 max-w-4xl">
                {/* Header */}
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate('/')}
                            className="bg-background/50 backdrop-blur-sm border border-border/50 shadow-sm rounded-full h-10 w-10 shrink-0"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <span className="text-sm font-medium text-muted-foreground md:hidden">Back to Dashboard</span>
                    </div>

                    <div className="flex-1 mt-2 md:mt-0">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                <Mic className="h-6 w-6" />
                            </div>
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Voice Mode</h1>
                        </div>
                        <p className="text-sm md:text-base text-muted-foreground ml-1">Dictate patient symptoms and let AI analyze</p>
                    </div>
                </div>

                {/* Voice Input Card */}
                <Card className="glass-card p-4 md:p-6 mb-6">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Patient Symptoms</h2>
                            <Badge variant="outline" className="gap-1">
                                <Sparkles className="h-3 w-3" />
                                AI-Powered
                            </Badge>
                        </div>

                        <div className="relative">
                            <Textarea
                                placeholder="Click the microphone to start speaking, or type here manually..."
                                value={transcript}
                                onChange={(e) => setTranscript(e.target.value)}
                                className="min-h-[150px] md:min-h-[200px] pr-14 text-base"
                                disabled={isProcessing}
                            />
                            <div className="absolute bottom-3 right-3">
                                <VoiceInput
                                    onTranscript={handleTranscript}
                                    onProcessing={setIsProcessing}
                                    autoSubmit={false}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                <span>Real-time transcription active</span>
                            </div>
                            <span>{transcript.length} characters</span>
                        </div>

                        <Button
                            onClick={processVoiceInput}
                            disabled={!transcript.trim() || isProcessing}
                            className="w-full"
                            size="lg"
                        >
                            {isProcessing ? (
                                <>
                                    <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                                    Processing with AI...
                                </>
                            ) : (
                                <>
                                    <Send className="h-4 w-4 mr-2" />
                                    Analyze with AI
                                </>
                            )}
                        </Button>
                    </div>
                </Card>

                {/* Instructions */}
                <Card className="glass-card p-4 md:p-6 bg-primary/5 border-primary/20">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Mic className="h-4 w-4" />
                        How to Use Voice Mode
                    </h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                            <span className="text-primary font-bold">1.</span>
                            <span>Click the microphone button to start recording</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-primary font-bold">2.</span>
                            <span>Speak clearly about the patient's symptoms, medical history, or complaints</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-primary font-bold">3.</span>
                            <span>Watch as your speech is transcribed in real-time</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-primary font-bold">4.</span>
                            <span>Click "Analyze with AI" to process the input and generate clinical insights</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-primary font-bold">5.</span>
                            <span>You can also edit the transcribed text manually before submitting</span>
                        </li>
                    </ul>
                </Card>

                {/* Example Prompts */}
                <Card className="glass-card p-4 md:p-6 mt-6 pb-24 md:pb-6">
                    <h3 className="font-semibold mb-3">Example Voice Inputs</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                            "Patient complains of severe chest pain radiating to left arm, started 2 hours ago",
                            "45-year-old male with persistent dry cough and fever for 3 days",
                            "Female patient with migraine, photophobia, and nausea since this morning",
                            "Elderly patient with difficulty breathing, wheezing, and chest tightness"
                        ].map((example, idx) => (
                            <button
                                key={idx}
                                onClick={() => setTranscript(example)}
                                className="text-left p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-sm"
                            >
                                <span className="text-muted-foreground">"{example}"</span>
                            </button>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
}
