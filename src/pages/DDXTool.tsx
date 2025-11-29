import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
    Activity,
    Brain,
    Stethoscope,
    Microscope,
    AlertTriangle,
    FileText,
    Send,
    Plus,
    X,
    Search,
    ArrowLeft,
    MessageSquare,
    Bot
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export default function DDXTool() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [symptoms, setSymptoms] = useState<string[]>([]);
    const [medications, setMedications] = useState<string[]>([]);
    const [history, setHistory] = useState<string[]>([]);
    const [newSymptom, setNewSymptom] = useState("");
    const [generating, setGenerating] = useState(false);
    const [differentials, setDifferentials] = useState<any[]>([]);
    const [generatedVisitId, setGeneratedVisitId] = useState<string | null>(null);
    const [doctorName, setDoctorName] = useState("");

    // Chat State
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'assistant', content: 'Hello, I am your Clinical Assistant. How can I help you with this case?' }
    ]);
    const [chatInput, setChatInput] = useState("");
    const [chatLoading, setChatLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Auto-trigger AI follow-up when symptoms change (debounce to avoid spam)
    useEffect(() => {
        if (symptoms.length > 0) {
            const timer = setTimeout(() => {
                triggerSymptomAnalysis();
            }, 1500); // Wait 1.5s after last symptom add
            return () => clearTimeout(timer);
        }
    }, [symptoms]);

    const triggerSymptomAnalysis = async () => {
        // Don't trigger if the last message was already an analysis of these exact symptoms
        // (Simple check to avoid loops, can be improved)
        const lastMsg = messages[messages.length - 1];
        if (lastMsg?.role === 'assistant' && lastMsg.content.includes("Based on the symptoms")) return;

        setChatLoading(true);
        try {
            const response = await fetch('http://192.168.1.6:3003/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        ...messages,
                        {
                            role: 'system',
                            content: `Context Update: The user has updated the symptom list. Current Symptoms: ${symptoms.join(', ')}.`
                        }
                    ]
                })
            });

            if (response.ok) {
                const data = await response.json();
                const aiMessage = data.response?.message || data.response;
                setMessages(prev => [...prev, { role: 'assistant', content: aiMessage }]);
            }
        } catch (e) {
            console.error("Auto-analysis failed", e);
        } finally {
            setChatLoading(false);
        }
    };

    const addSymptom = () => {
        if (newSymptom.trim()) {
            setSymptoms([...symptoms, newSymptom.trim()]);
            setNewSymptom("");
        }
    };

    const removeSymptom = (index: number) => {
        setSymptoms(symptoms.filter((_, i) => i !== index));
    };

    const generateDifferentials = async (
        symptomsOverride?: string[],
        medsOverride?: string[],
        historyOverride?: string[]
    ) => {
        const currentSymptoms = symptomsOverride || symptoms;
        const currentMeds = medsOverride || medications;
        const currentHistory = historyOverride || history;

        if (currentSymptoms.length === 0) {
            toast({
                title: "No Symptoms",
                description: "Please add at least one symptom",
                variant: "destructive"
            });
            return null;
        }

        setGenerating(true);
        try {
            // Construct rich context for the visit
            const contextNotes = `
                Patient History: ${currentHistory.join(', ') || 'None'}
                Current Medications: ${currentMeds.join(', ') || 'None'}
                Interview Context: Generated via Clinical Assistant
            `.trim();

            // Create a temporary visit
            const visitResponse = await fetch('http://192.168.1.6:3003/api/visits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    facilityName: "DDX Tool",
                    department: "Clinical Decision Support",
                    providerName: doctorName || "System", // Use entered name or default
                    chiefComplaint: currentSymptoms.join(", "),
                    visitNotes: contextNotes, // Pass the extra info here
                    sourceType: "ddx_tool",
                    confidenceScore: 95
                })
            });

            if (!visitResponse.ok) throw new Error('Failed to create visit');
            const visit = await visitResponse.json();

            // Add symptoms
            const symptomsData = currentSymptoms.map(s => ({
                text: s,
                confidenceScore: 90,
                source: 'manual'
            }));

            await fetch(`http://192.168.1.6:3003/api/visits/${visit.id}/symptoms`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symptoms: symptomsData })
            });

            // Generate differentials
            const ddxResponse = await fetch(`http://192.168.1.6:3003/api/visits/${visit.id}/differentials`, {
                method: 'POST'
            });

            if (!ddxResponse.ok) throw new Error('Failed to generate differentials');
            const ddxData = await ddxResponse.json();

            setDifferentials(ddxData);

            toast({
                title: "DDX Generated",
                description: `Generated ${ddxData.length} differential diagnoses`
            });

            // Store visit ID to allow manual navigation
            setGeneratedVisitId(visit.id);
            return visit.id; // Return ID for chaining

        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to generate differentials",
                variant: "destructive"
            });
            return null;
        } finally {
            setGenerating(false);
        }
    };

    const handleChatSubmit = async () => {
        // ... (rest of function)
        if (!chatInput.trim()) return;

        // Include current symptoms context if it's the first user message or if explicitly relevant
        let contextMessage = chatInput;
        if (symptoms.length > 0) {
            contextMessage = `[Current Symptoms Context: ${symptoms.join(', ')}]\n\n${chatInput}`;
        }

        const userMsg: ChatMessage = { role: 'user', content: chatInput }; // Display original input to user
        const apiMsg: ChatMessage = { role: 'user', content: contextMessage }; // Send context to API

        setMessages(prev => [...prev, userMsg]);
        setChatInput("");
        setChatLoading(true);

        try {
            const response = await fetch('http://192.168.1.6:3003/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, apiMsg]
                })
            });

            if (response.ok) {
                const data = await response.json();
                // Handle JSON response from backend
                const aiMessage = data.response?.message || data.response; // Fallback if not JSON
                const newSymptoms = data.response?.new_symptoms || [];
                const newMedications = data.response?.new_medications || [];
                const newHistory = data.response?.new_history || [];

                setMessages(prev => [...prev, { role: 'assistant', content: aiMessage }]);

                // Add new symptoms if found
                let currentSymptoms = [...symptoms];
                if (newSymptoms.length > 0) {
                    const uniqueNew = newSymptoms.filter((s: string) => !symptoms.includes(s));
                    if (uniqueNew.length > 0) {
                        currentSymptoms = [...symptoms, ...uniqueNew];
                        setSymptoms(currentSymptoms);

                        toast({
                            title: "Info Added",
                            description: `Added symptoms: ${uniqueNew.join(', ')}`,
                        });
                    }
                }

                // Add medications
                let currentMedications = [...medications];
                if (newMedications.length > 0) {
                    const uniqueMeds = newMedications.filter((m: string) => !medications.includes(m));
                    if (uniqueMeds.length > 0) {
                        currentMedications = [...medications, ...uniqueMeds];
                        setMedications(currentMedications);
                    }
                }

                // Add history
                let currentHistory = [...history];
                if (newHistory.length > 0) {
                    const uniqueHist = newHistory.filter((h: string) => !history.includes(h));
                    if (uniqueHist.length > 0) {
                        currentHistory = [...history, ...uniqueHist];
                        setHistory(currentHistory);
                    }
                }

                // Check if chat should end (e.g. AI says "I have enough information")
                if (aiMessage.includes("Generate Differentials") || aiMessage.includes("enough information")) {
                    toast({
                        title: "Interview Complete",
                        description: "Generating full report...",
                        duration: 3000
                    });

                    // Auto-trigger generation and redirect
                    generateDifferentials(currentSymptoms, currentMedications, currentHistory).then((vid) => {
                        if (vid) {
                            setTimeout(() => {
                                navigate(`/visit/${vid}`);
                            }, 1500);
                        }
                    });
                }
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to get response from AI",
                variant: "destructive"
            });
        } finally {
            setChatLoading(false);
        }
    };

    const getConfidenceColor = (score: number) => {
        if (score >= 80) return "text-green-500";
        if (score >= 50) return "text-yellow-500";
        return "text-red-500";
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-8">
            <div className="container mx-auto px-6 max-w-6xl">
                <div className="flex items-center gap-4 mb-6">
                    <Button variant="ghost" onClick={() => navigate("/")}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold">Differential Diagnosis Tool</h1>
                        <p className="text-muted-foreground">Enter symptoms to generate differential diagnoses</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Input Section (Left - 4 cols) */}
                    <div className="lg:col-span-4 space-y-6">
                        <Card className="glass-card p-6">
                            <h2 className="text-xl font-semibold mb-4">Symptoms</h2>

                            <div className="space-y-3 mb-4">
                                {symptoms.map((symptom, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                                    >
                                        <span>{symptom}</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeSymptom(index)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Quick Patient Search..."
                                        className="pl-9"
                                        value={newSymptom}
                                        onChange={(e) => setNewSymptom(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addSymptom()}
                                    />
                                </div>    <Button onClick={addSymptom}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="mb-4">
                                <label className="text-sm font-medium mb-1 block">Doctor Name</label>
                                <Input
                                    value={doctorName}
                                    onChange={(e) => setDoctorName(e.target.value)}
                                    placeholder="e.g. Dr. Smith"
                                />
                            </div>

                            <Button
                                onClick={() => generateDifferentials()}
                                disabled={generating || symptoms.length === 0}
                                className="w-full bg-primary hover:bg-primary/90 text-white"
                            >
                                <Stethoscope className="h-4 w-4 mr-2" />
                                {generating ? "Generating..." : "Generate Differentials"}
                            </Button>

                            {generatedVisitId && (
                                <Button
                                    onClick={() => navigate(`/visit/${generatedVisitId}`)}
                                    className="w-full mt-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                                >
                                    <FileText className="h-4 w-4 mr-2" />
                                    View Full Clinical Report
                                </Button>
                            )}
                        </Card>

                        <Card className="glass-card p-4 bg-blue-500/5 border-blue-500/20">
                            <p className="text-sm text-muted-foreground">
                                <strong>Example symptoms:</strong> High fever, Headache, Body ache, Low platelet count
                            </p>
                        </Card>
                    </div>

                    {/* Results/Chat Section (Right - 8 cols) */}
                    <div className="lg:col-span-8">
                        <Tabs defaultValue="results" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-4">
                                <TabsTrigger value="results">DDX Results</TabsTrigger>
                                <TabsTrigger value="chat">Clinical Assistant</TabsTrigger>
                            </TabsList>

                            <TabsContent value="results">
                                <Card className="glass-card p-6 min-h-[600px]">
                                    <h2 className="text-xl font-semibold mb-4">Differential Diagnoses</h2>

                                    {differentials.length === 0 ? (
                                        <div className="text-center py-12 text-muted-foreground">
                                            <Stethoscope className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                            <p>No differentials generated yet</p>
                                            <p className="text-sm mt-2">Add symptoms and click "Generate"</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {differentials.map((diff, index) => (
                                                <div key={diff.id} className="p-4 rounded-lg border bg-muted/30">
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <Badge className="bg-primary">{diff.rank}</Badge>
                                                            <h3 className="font-semibold">{diff.condition_name}</h3>
                                                            {diff.icd10_code && (
                                                                <Badge variant="outline" className="text-xs">
                                                                    {diff.icd10_code}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <Badge variant="outline" className={getConfidenceColor(diff.confidence_score)}>
                                                            {diff.confidence_score}%
                                                        </Badge>
                                                    </div>

                                                    <p className="text-sm text-muted-foreground mb-3">
                                                        {diff.rationale}
                                                    </p>

                                                    {diff.suggested_investigations && diff.suggested_investigations.length > 0 && (
                                                        <div>
                                                            <p className="text-xs font-medium mb-2">Suggested Tests:</p>
                                                            <div className="flex flex-wrap gap-1">
                                                                {diff.suggested_investigations.map((test: string, idx: number) => (
                                                                    <Badge key={idx} variant="secondary" className="text-xs">
                                                                        {test}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </Card>
                            </TabsContent>

                            <TabsContent value="chat">
                                <Card className="glass-card flex flex-col h-[600px]">
                                    {/* Chat Header */}
                                    <div className="p-4 border-b flex items-center gap-2">
                                        <Bot className="h-5 w-5 text-primary" />
                                        <h2 className="font-semibold">Clinical Assistant</h2>
                                    </div>

                                    {/* Chat Messages */}
                                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                        {messages.map((msg, idx) => (
                                            <div
                                                key={idx}
                                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div
                                                    className={`max-w-[80%] p-3 rounded-lg text-sm ${msg.role === 'user'
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'bg-muted'
                                                        }`}
                                                >
                                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                                </div>
                                            </div>
                                        ))}
                                        {chatLoading && (
                                            <div className="flex justify-start">
                                                <div className="bg-muted p-3 rounded-lg text-sm flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" />
                                                    <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce delay-75" />
                                                    <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce delay-150" />
                                                </div>
                                            </div>
                                        )}
                                        <div ref={chatEndRef} />
                                    </div>

                                    {/* Chat Input */}
                                    <div className="p-4 border-t">
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="Type patient details (e.g., 45M with severe chest pain...)"
                                                value={chatInput}
                                                onChange={(e) => setChatInput(e.target.value)}
                                                onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit()}
                                                disabled={chatLoading}
                                            />
                                            <Button onClick={handleChatSubmit} disabled={chatLoading || !chatInput.trim()}>
                                                <Send className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>
        </div>
    );
}
