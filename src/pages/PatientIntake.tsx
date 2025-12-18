
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

// Language options
const LANGUAGES = [
    { code: 'en-US', name: 'English', flag: '🇺🇸' },
    { code: 'hi-IN', name: 'हिन्दी (Hindi)', flag: '🇮🇳' },
    { code: 'bn-IN', name: 'বাংলা (Bengali)', flag: '🇮🇳' },
    { code: 'te-IN', name: 'తెలుగు (Telugu)', flag: '🇮🇳' },
    { code: 'mr-IN', name: 'मराठी (Marathi)', flag: '🇮🇳' },
    { code: 'ta-IN', name: 'தமிழ் (Tamil)', flag: '🇮🇳' },
    { code: 'gu-IN', name: 'ગુજરાતી (Gujarati)', flag: '🇮🇳' },
    { code: 'kn-IN', name: 'ಕನ್ನಡ (Kannada)', flag: '🇮🇳' },
    { code: 'ml-IN', name: 'മലയാളം (Malayalam)', flag: '🇮🇳' },
    { code: 'pa-IN', name: 'ਪੰਜਾਬੀ (Punjabi)', flag: '🇮🇳' },
    { code: 'es-ES', name: 'Español (Spanish)', flag: '🇪🇸' },
    { code: 'fr-FR', name: 'Français (French)', flag: '🇫🇷' },
    { code: 'de-DE', name: 'Deutsch (German)', flag: '🇩🇪' },
    { code: 'ar-SA', name: 'العربية (Arabic)', flag: '🇸🇦' },
    { code: 'ja-JP', name: '日本語 (Japanese)', flag: '🇯🇵' },
    { code: 'zh-CN', name: '中文 (Chinese)', flag: '🇨🇳' },
];

const GREETINGS: Record<string, string> = {
    'en-US': "Hello! I'm your AI health assistant. To begin, could you please tell me your Name, Age, Gender, and Residential Area?",
    'hi-IN': "नमस्ते! मैं आपका एआई स्वास्थ्य सहायक हूं। कृपया अपना नाम, उम्र, लिंग और आवासीय क्षेत्र बताएं।",
    'bn-IN': "হ্যালো! আমি আপনার এআই স্বাস্থ্য সহকারী। শুরু করতে, দয়া করে আপনার নাম, বয়স, লিঙ্গ এবং আবাসিক এলাকা বলুন।",
    'te-IN': "హలో! నేను మీ AI హెల్త్ అసిస్టెంట్‌ని. ప్రారంభించడానికి, దయచేసి మీ పేరు, వయస్సు, లింగం మరియు నివాస ప్రాంతాన్ని నాకు చెప్పగలరా?",
    'mr-IN': "नमस्कार! मी तुमचा एआय आरोग्य सहाय्यक आहे. सुरू करण्यासाठी, कृपया मला तुमचे नाव, वय, लिंग आणि निवासी क्षेत्र सांगू शकाल का?",
    'ta-IN': "வணக்கம்! நான் உங்கள் AI சுகாதார உதவியாளர். தொடங்குவதற்கு, உங்கள் பெயர், வயது, பாலினம் மற்றும் வசிப்பிடத்தைச் சொல்ல முடியுமா?",
    'gu-IN': "નમસ્તે! હું તમારો AI સ્વાસ્થ્ય સહાયક છું. શરૂ કરવા માટે, કૃપા કરીને મને તમારું નામ, ઉંમર, જાતિ અને રહેણાંક વિસ્તાર જણાવી શકશો?",
    'kn-IN': "ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ AI ಆರೋಗ್ಯ ಸಹಾಯಕ. ಪ್ರಾರಂಭಿಸಲು, ದಯವಿಟ್ಟು ನಿಮ್ಮ ಹೆಸರು, ವಯಸ್ಸು, ಲಿಂಗ ಮತ್ತು ವಾಸಸ್ಥಳವನ್ನು ಹೇಳಬಲ್ಲಿರಾ?",
    'ml-IN': "ഹലോ! ഞാൻ നിങ്ങളുടെ AI ഹെൽത്ത് അസിസ്റ്റന്റാണ്. തുടങ്ങുന്നതിനായി, നിങ്ങളുടെ പേര്, പ്രായം, ലിംഗഭേദം, താമസസ്ഥലം എന്നിവ പറയാമോ?",
    'pa-IN': "ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਤੁਹਾਡਾ AI ਸਿਹਤ ਸਹਾਇਕ ਹਾਂ। ਸ਼ੁਰੂ ਕਰਨ ਲਈ, ਕੀ ਤੁਸੀਂ ਮੈਨੂੰ ਆਪਣਾ ਨਾਮ, ਉਮਰ, ਲਿੰਗ ਅਤੇ ਰਿਹਾਇਸ਼ੀ ਖੇਤਰ ਦੱਸ ਸਕਦੇ ਹੋ?",
    'es-ES': "¡Hola! Soy tu asistente de salud IA. Para comenzar, ¿podrías decirme tu Nombre, Edad, Género y Área Residencial?",
    'fr-FR': "Bonjour! Je suis votre assistant de santé IA. Pour commencer, pourriez-vous me dire votre Nom, Âge, Sexe et Zone Résidentielle?",
    'de-DE': "Hallo! Ich bin Ihr KI-Gesundheitsassistent. Könnten Sie mir bitte Ihren Namen, Ihr Alter, Ihr Geschlecht und Wohnort nennen?",
    'ar-SA': "مرحبًا! أنا مساعدك الصحي بالذكاء الاصطناعي. للبدء، هل يمكنك إخباري باسمك، وعمرك، وجنسك، ومنطقتك السكنية؟",
    'ja-JP': "こんにちは！私はあなたのAIヘルスアシスタントです。始めに、お名前、年齢、性別、居住地域を教えていただけますか？",
    'zh-CN': "你好！我是你的AI健康助手。首先，请告诉我你的姓名、年龄、性别和居住地区？"
};

export default function PatientIntake() {
    const navigate = useNavigate();
    const { toast } = useToast();

    // Language state
    const [hasSelectedLanguage, setHasSelectedLanguage] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState('en-US');

    // Generate PID once on mount
    const [pid] = useState(`PID-${Math.floor(1000 + Math.random() * 9000)}`);

    // Chat state
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Voice state
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    const recognitionRef = useRef<any>(null);
    const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const messagesRef = useRef<Message[]>(messages);

    // Patient data
    const [patientData, setPatientData] = useState<PatientData>({
        symptoms: [],
        medicalHistory: [],
        currentMedications: [],
        allergies: []
    });
    const [isComplete, setIsComplete] = useState(false);

    // Sync messagesRef
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    // Auto-submit when complete
    // Auto-submit when complete
    useEffect(() => {
        if (isComplete) {
            toast({
                title: "Interview Complete",
                description: "Redirecting to your clinical report in 25 seconds...",
                duration: 25000
            });
            const timer = setTimeout(() => submitToDoctor(), 25000);
            return () => clearTimeout(timer);
        }
    }, [isComplete]);

    // Initialize speech recognition and voices
    useEffect(() => {
        // Preload voices
        const loadVoices = () => window.speechSynthesis.getVoices();
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;

        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            setVoiceEnabled(false);
            return;
        }
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = selectedLanguage;

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInputText(transcript);
            handleSubmit(transcript);
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);
        };
        recognition.onend = () => setIsListening(false);
        recognitionRef.current = recognition;

        return () => {
            recognitionRef.current?.stop();
            window.speechSynthesis.cancel();
        };
    }, [selectedLanguage]);

    // Auto-scroll
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Enhanced speak function with fallback
    const speak = (text: string, languageOverride?: string, fallbackText?: string) => {
        if (!voiceEnabled) return;

        let targetLang = languageOverride || selectedLanguage;
        let textToSpeak = text;

        const voices = window.speechSynthesis.getVoices();
        // Try strict match first, then loose match (e.g. 'bn-IN' matches 'bn')
        let languageVoice = voices.find(v => v.lang === targetLang) ||
            voices.find(v => v.lang.startsWith(targetLang.split('-')[0]));

        // Debug
        // console.log(`Speaking in ${targetLang}. Found voice: ${languageVoice?.name}`);

        if (!languageVoice) {
            // Special handling for Indian languages falling back to Hindi if available (experimental)
            // But usually safer to fallback to English or silent.

            if (fallbackText) {
                // We have a fallback (e.g. English greeting)
                console.warn(`Voice for ${targetLang} not available. Fallback to English.`);
                textToSpeak = fallbackText;
                targetLang = 'en-US';
                languageVoice = voices.find(v => v.lang.startsWith('en'));

                toast({
                    title: "Language Voice Missing",
                    description: "Native voice not installed. Speaking in English.",
                    variant: "default"
                });
            } else {
                // No fallback available (e.g. dynamic chat response)
                // Do not speak to avoid gibberish
                toast({
                    title: "Voice Not Available",
                    description: `Your device does not support TTS for ${targetLang}.`,
                    variant: "destructive"
                });
                return;
            }
        }

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;
        utterance.lang = targetLang;

        if (languageVoice) utterance.voice = languageVoice;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        synthRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    };

    const toggleListening = () => {
        if (!recognitionRef.current) return;
        if (isListening) {
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    const toggleVoice = () => {
        setVoiceEnabled(!voiceEnabled);
        if (voiceEnabled) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        }
    };

    const handleLanguageSelect = (langCode: string) => {
        setSelectedLanguage(langCode);
        setHasSelectedLanguage(true);

        const greetingText = GREETINGS[langCode] || GREETINGS['en-US'];
        const fallbackGreeting = GREETINGS['en-US'];

        const initialMessage: Message = {
            role: 'assistant',
            content: greetingText,
            timestamp: new Date()
        };

        setMessages([initialMessage]);

        // Pass language explicitly + fallback
        setTimeout(() => speak(greetingText, langCode, fallbackGreeting), 500);
    };

    const handleSubmit = async (text?: string) => {
        const messageText = text || inputText;
        if (!messageText.trim() || isProcessing) return;

        const userMessage: Message = {
            role: 'user',
            content: messageText,
            timestamp: new Date()
        };

        setInputText('');
        setIsProcessing(true);

        try {
            const updatedMessages = [...messagesRef.current, userMessage];
            const response = await fetch(getApiUrl('/api/patient-intake'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: updatedMessages,
                    currentData: patientData,
                    language: selectedLanguage, // Current selected language
                    pid: pid
                })
            });

            if (response.ok) {
                const data = await response.json();
                const assistantMessage: Message = {
                    role: 'assistant',
                    content: data.response,
                    timestamp: new Date()
                };
                setMessages([...updatedMessages, assistantMessage]);
                // Speak response (using current state lang). No fallback for dynamic content yet.
                speak(data.response);
                if (data.patientData) setPatientData(data.patientData);
                if (data.isComplete) setIsComplete(true);
            } else {
                throw new Error('Failed to process message');
            }
        } catch (error) {
            console.error('Error:', error);
            toast({
                title: "Error",
                description: "Failed to process message.",
                variant: "destructive"
            });
            setMessages(prev => [...prev, userMessage]);
        } finally {
            setIsProcessing(false);
        }
    };

    const submitToDoctor = async () => {
        setIsProcessing(true);
        try {
            const response = await fetch(getApiUrl('/api/patient-intake/submit'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patientData,
                    conversation: messages,
                    pid: pid
                })
            });

            if (response.ok) {
                const data = await response.json();
                toast({
                    title: "Submitted Successfully!",
                    description: "Your information has been sent to the doctor.",
                });
                setTimeout(() => {
                    navigate(`/visit/${data.visitId}`);
                }, 2000);
            }
        } catch (error) {
            toast({
                title: "Submission Failed",
                description: "Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsProcessing(false);
        }
    };

    // LANGUAGE SELECTION SCREEN
    if (!hasSelectedLanguage) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-6">
                <Card className="max-w-4xl w-full p-8 glass-card border-none shadow-2xl">
                    <div className="text-center mb-8">
                        <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Globe className="w-8 h-8 text-primary" />
                        </div>
                        <h1 className="text-3xl font-bold mb-2">Select Your Language</h1>
                        <p className="text-muted-foreground">Please choose a language to begin your health assessment</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {LANGUAGES.map((lang) => (
                            <Button
                                key={lang.code}
                                variant="outline"
                                className="h-24 flex flex-col gap-2 hover:border-primary hover:bg-primary/5 transition-all text-lg"
                                onClick={() => handleLanguageSelect(lang.code)}
                            >
                                <span className="text-3xl">{lang.flag}</span>
                                <span className="font-medium">{lang.name.split('(')[0].trim()}</span>
                                <span className="text-xs text-muted-foreground">{lang.name.split('(')[1]?.replace(')', '') || 'English'}</span>
                            </Button>
                        ))}
                    </div>
                </Card>
            </div>
        );
    }

    // MAIN CHAT SCREEN
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
                        <p className="text-muted-foreground">AI-assisted health information collection ({LANGUAGES.find(l => l.code === selectedLanguage)?.name})</p>
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
                    <div className="p-4 border-b flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 flex items-center justify-center">
                                <Sparkles className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h2 className="font-semibold">AI Health Assistant</h2>
                                <p className="text-xs text-muted-foreground">Online • {pid}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleVoice}
                                className={voiceEnabled ? 'text-primary' : 'text-muted-foreground'}
                            >
                                {voiceEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                            </Button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-lg ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                    <p className="text-xs opacity-70 mt-1">{msg.timestamp.toLocaleTimeString()}</p>
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

                    <div className="p-4 border-t">
                        {isComplete ? (
                            <Button
                                onClick={submitToDoctor}
                                disabled={isProcessing}
                                className="w-full bg-green-500 hover:bg-green-600"
                                size="lg"
                            >
                                {isProcessing ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <FileText className="h-5 w-5 mr-2" />}
                                Summarize & Submit
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
                                            className={`absolute right-1 top-1/2 -translate-y-1/2 ${isListening ? 'text-red-500 animate-pulse' : ''}`}
                                        >
                                            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                                        </Button>
                                    )}
                                </div>
                                <Button onClick={() => handleSubmit()} disabled={!inputText.trim() || isProcessing}>
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}
