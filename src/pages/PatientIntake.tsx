import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
    Mic,
    MicOff,
    Send,
    User,
    Volume2,
    VolumeX,
    CheckCircle2,
    Loader2,
    ArrowLeft,
    Sparkles,
    Globe,
    FileText
} from 'lucide-react';
import { getApiUrl } from '@/config';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface Message {
    role: 'assistant' | 'user';
    content: string;
    timestamp: Date;
}

interface PatientData {
    name?: string;
    age?: number;
    gender?: string;
    symptoms: string[];
    medicalHistory: string[];
    currentMedications: string[];
    allergies: string[];
    chiefComplaint?: string;
}

// Language options with their speech recognition codes
const LANGUAGES = [
    // English
    { code: 'en-US', name: 'English', flag: '🇺🇸' },

    // Indian Languages (organized alphabetically)
    { code: 'as-IN', name: 'অসমীয়া (Assamese)', flag: '🇮🇳' },
    { code: 'bn-IN', name: 'বাংলা (Bengali)', flag: '🇮🇳' },
    { code: 'gu-IN', name: 'ગુજરાતી (Gujarati)', flag: '🇮🇳' },
    { code: 'hi-IN', name: 'हिन्दी (Hindi)', flag: '🇮🇳' },
    { code: 'kn-IN', name: 'ಕನ್ನಡ (Kannada)', flag: '🇮🇳' },
    { code: 'ml-IN', name: 'മലയാളം (Malayalam)', flag: '🇮🇳' },
    { code: 'mr-IN', name: 'मराठी (Marathi)', flag: '🇮🇳' },
    { code: 'or-IN', name: 'ଓଡ଼ିଆ (Odia)', flag: '🇮🇳' },
    { code: 'pa-IN', name: 'ਪੰਜਾਬੀ (Punjabi)', flag: '🇮🇳' },
    { code: 'ta-IN', name: 'தமிழ் (Tamil)', flag: '🇮🇳' },
    { code: 'te-IN', name: 'తెలుగు (Telugu)', flag: '🇮🇳' },
    { code: 'ur-IN', name: 'اردو (Urdu)', flag: '🇮🇳' },

    // Other major languages
    { code: 'es-ES', name: 'Español (Spanish)', flag: '🇪🇸' },
    { code: 'fr-FR', name: 'Français (French)', flag: '🇫🇷' },
    { code: 'de-DE', name: 'Deutsch (German)', flag: '🇩🇪' },
    { code: 'ar-SA', name: 'العربية (Arabic)', flag: '🇸🇦' },
    { code: 'pt-BR', name: 'Português (Portuguese)', flag: '🇧🇷' },
    { code: 'ru-RU', name: 'Русский (Russian)', flag: '🇷🇺' },
    { code: 'ja-JP', name: '日本語 (Japanese)', flag: '🇯🇵' },
    { code: 'zh-CN', name: '中文 (Chinese)', flag: '🇨🇳' },
];

export default function PatientIntake() {
    const navigate = useNavigate();
    const { toast } = useToast();

    // Language state
    const [selectedLanguage, setSelectedLanguage] = useState('en-US');

    // Generate PID once on mount
    const [pid] = useState(`PID-${Math.floor(1000 + Math.random() * 9000)}`);

    // Chat state
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: 'Hello! I\'m your AI health assistant. To begin, could you please tell me your Name, Age, Gender, and Residential Area?',
            timestamp: new Date()
        }
    ]);
    const [inputText, setInputText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Voice state
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    const recognitionRef = useRef<any>(null);
    const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const messagesRef = useRef<Message[]>(messages); // Track latest messages

    // Patient data
    const [patientData, setPatientData] = useState<PatientData>({
        symptoms: [],
        medicalHistory: [],
        currentMedications: [],
        allergies: []
    });
    const [isComplete, setIsComplete] = useState(false);

    // Keep messagesRef in sync with messages state
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    // Auto-submit and redirect when interview is complete
    useEffect(() => {
        if (isComplete) {
            toast({
                title: "Interview Complete",
                description: "Redirecting to your clinical report in 5 seconds...",
                duration: 5000
            });

            const timer = setTimeout(() => {
                submitToDoctor();
            }, 5000); // 5 second delay to read the final message (Room #, PID)

            return () => clearTimeout(timer);
        }
    }, [isComplete]);

    // Initialize speech recognition
    useEffect(() => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            toast({
                title: "Voice Not Supported",
                description: "Your browser doesn't support voice input. Please use text input.",
                variant: "destructive"
            });
            setVoiceEnabled(false);
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = selectedLanguage; // Use selected language

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInputText(transcript);
            handleSubmit(transcript);
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognitionRef.current = recognition;

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            if (synthRef.current) {
                window.speechSynthesis.cancel();
            }
        };
    }, [selectedLanguage]); // Reinitialize when language changes

    // Speak initial greeting when component loads
    useEffect(() => {
        const initialGreeting = messages[0]?.content;
        if (initialGreeting) {
            // Small delay to ensure speech synthesis is ready
            setTimeout(() => {
                speak(initialGreeting);
            }, 500);
        }
    }, []); // Only run on mount

    // Auto-scroll to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Text-to-speech function
    const speak = (text: string) => {
        if (!voiceEnabled) return;

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;
        utterance.lang = selectedLanguage;

        // Try to find a voice that matches the selected language
        const voices = window.speechSynthesis.getVoices();
        const languageVoice = voices.find(voice => voice.lang.startsWith(selectedLanguage.split('-')[0]));
        if (languageVoice) {
            utterance.voice = languageVoice;
        }

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        synthRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    };

    // Toggle voice listening
    const toggleListening = () => {
        if (!recognitionRef.current) return;

        if (isListening) {
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    // Toggle voice output
    const toggleVoice = () => {
        setVoiceEnabled(!voiceEnabled);
        if (voiceEnabled) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        }
    };

    // Handle message submission
    const handleSubmit = async (text?: string) => {
        const messageText = text || inputText;
        if (!messageText.trim() || isProcessing) return;

        const userMessage: Message = {
            role: 'user',
            content: messageText,
            timestamp: new Date()
        };

        // Clear input immediately
        setInputText('');
        setIsProcessing(true);

        try {
            // ALWAYS use messagesRef.current to get the latest state
            // This prevents closure capture issues when multiple calls happen quickly
            const updatedMessages = [...messagesRef.current, userMessage];

            // Send COMPLETE conversation history to backend
            const response = await fetch(getApiUrl('/api/patient-intake'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: updatedMessages, // Send full conversation including new message
                    currentData: patientData,
                    language: selectedLanguage, // Send selected language to backend
                    pid: pid // Send PID for System Prompt context
                })
            });

            if (response.ok) {
                const data = await response.json();

                const assistantMessage: Message = {
                    role: 'assistant',
                    content: data.response,
                    timestamp: new Date()
                };

                // Update messages with BOTH user and assistant messages at once
                // This prevents race conditions from multiple state updates
                setMessages([...updatedMessages, assistantMessage]);

                // Speak the response
                speak(data.response);

                // Update patient data
                if (data.patientData) {
                    setPatientData(data.patientData);
                }

                // Check if intake is complete
                if (data.isComplete) {
                    setIsComplete(true);
                }
            } else {
                throw new Error('Failed to process message');
            }
        } catch (error) {
            console.error('Error:', error);
            toast({
                title: "Error",
                description: "Failed to process your message. Please try again.",
                variant: "destructive"
            });
            // On error, still add user message to show what was said
            setMessages(prev => [...prev, userMessage]);
        } finally {
            setIsProcessing(false);
        }
    };

    // Submit to doctor
    const submitToDoctor = async () => {
        setIsProcessing(true);
        try {
            const response = await fetch(getApiUrl('/api/patient-intake/submit'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patientData,
                    conversation: messages,
                    pid: pid // Send PID for Visit Creation
                })
            });

            if (response.ok) {
                const data = await response.json();
                toast({
                    title: "Submitted Successfully!",
                    description: "Your information has been sent to the doctor.",
                });

                // Navigate to confirmation or visit page
                setTimeout(() => {
                    navigate(`/visit/${data.visitId}`);
                }, 2000);
            }
        } catch (error) {
            toast({
                title: "Submission Failed",
                description: "Please try again or contact support.",
                variant: "destructive"
            });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-8">
            <div className="container mx-auto px-6 max-w-4xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <User className="h-8 w-8 text-primary" />
                            Patient Intake
                        </h1>
                        <p className="text-muted-foreground">AI-assisted health information collection</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={submitToDoctor}
                            disabled={isProcessing || messages.length < 2}
                            className="bg-primary hover:bg-primary/90"
                        >
                            <FileText className="h-4 w-4 mr-2" />
                            Summarize
                        </Button>
                        <Button variant="ghost" onClick={() => navigate('/')}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Exit
                        </Button>
                    </div>
                </div>

                {/* Main Chat Card */}
                <Card className="glass-card flex flex-col h-[600px]">
                    {/* Chat Header */}
                    <div className="p-4 border-b flex items-center justify-between">
                        <Button
                            variant="ghost"
                            className="h-auto p-2 -ml-2 hover:bg-muted flex items-center gap-2 text-left group"
                            onClick={() => {
                                setIsComplete(true);
                                toast({
                                    title: "Interview Completed",
                                    description: "Please click the 'Submit' button at the bottom.",
                                    duration: 3000
                                });
                            }}
                        >
                            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 flex items-center justify-center group-hover:shadow-md transition-shadow">
                                <Sparkles className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex flex-col items-start">
                                <h2 className="font-semibold text-foreground">AI Health Assistant</h2>
                                <p className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                                    {isComplete ? 'Ready to Submit' : 'Click to Finish Interview'}
                                </p>
                            </div>
                        </Button>

                        <div className="flex items-center gap-2">
                            {/* Language Selector */}
                            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                                <SelectTrigger className="w-[140px] h-9">
                                    <Globe className="h-4 w-4 mr-2" />
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {LANGUAGES.map((lang) => (
                                        <SelectItem key={lang.code} value={lang.code}>
                                            <span className="flex items-center gap-2">
                                                <span>{lang.flag}</span>
                                                <span className="text-sm">{lang.name.split('(')[0].trim()}</span>
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleVoice}
                                className={voiceEnabled ? 'text-primary' : 'text-muted-foreground'}
                            >
                                {voiceEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                            </Button>
                            {isComplete && (
                                <Badge className="bg-green-500">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Ready
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] p-3 rounded-lg ${msg.role === 'user'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted'
                                        }`}
                                >
                                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                    <p className="text-xs opacity-70 mt-1">
                                        {msg.timestamp.toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                        ))}

                        {isProcessing && (
                            <div className="flex justify-start">
                                <div className="bg-muted p-3 rounded-lg flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span className="text-sm">Thinking...</span>
                                </div>
                            </div>
                        )}

                        {isSpeaking && (
                            <div className="flex justify-start">
                                <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg flex items-center gap-2">
                                    <Volume2 className="h-4 w-4 text-blue-500 animate-pulse" />
                                    <span className="text-sm text-blue-500">Speaking...</span>
                                </div>
                            </div>
                        )}

                        <div ref={chatEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 border-t">
                        {isComplete ? (
                            <Button
                                onClick={submitToDoctor}
                                disabled={isProcessing}
                                className="w-full bg-green-500 hover:bg-green-600"
                                size="lg"
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <FileText className="h-5 w-5 mr-2" />
                                        Summarize & Submit
                                    </>
                                )}
                            </Button>
                        ) : (
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Input
                                        placeholder="Type your response or use voice..."
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                                        disabled={isProcessing || isListening}
                                        className="pr-12"
                                    />
                                    {voiceEnabled && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={toggleListening}
                                            disabled={isProcessing}
                                            className={`absolute right-1 top-1/2 -translate-y-1/2 ${isListening ? 'text-red-500 animate-pulse' : ''
                                                }`}
                                        >
                                            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                                        </Button>
                                    )}
                                </div>
                                <Button
                                    onClick={() => handleSubmit()}
                                    disabled={!inputText.trim() || isProcessing}
                                >
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Instructions */}
                <Card className="glass-card p-4 mt-4 bg-blue-500/5 border-blue-500/20">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <Mic className="h-4 w-4" />
                        How to Use Voice Mode
                    </h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Click the microphone icon to speak your response</li>
                        <li>• The AI will ask you questions and respond with voice</li>
                        <li>• You can type or speak - both work!</li>
                        <li>• Click the speaker icon to mute AI voice responses</li>
                        <li>• Complete all questions to submit to your doctor</li>
                    </ul>
                </Card>
            </div>
        </div>
    );
}
