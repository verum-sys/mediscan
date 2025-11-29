import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Stethoscope, Plus, X, Send, MessageSquare, Bot } from "lucide-react";
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
    const [newSymptom, setNewSymptom] = useState("");
    const [generating, setGenerating] = useState(false);
    const [differentials, setDifferentials] = useState<any[]>([]);

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

    const addSymptom = () => {
        if (newSymptom.trim()) {
            setSymptoms([...symptoms, newSymptom.trim()]);
            setNewSymptom("");
        }
    };

    const removeSymptom = (index: number) => {
        setSymptoms(symptoms.filter((_, i) => i !== index));
    };

    const generateDDX = async () => {
        if (symptoms.length === 0) {
            toast({
                title: "No Symptoms",
                description: "Please add at least one symptom",
                variant: "destructive"
            });
            return;
        }

        setGenerating(true);
        try {
            // Create a temporary visit
            const visitResponse = await fetch('http://192.168.1.6:3003/api/visits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    facilityName: "DDX Tool",
                    department: "Clinical Decision Support",
                    providerName: "System",
                    chiefComplaint: symptoms.join(", "),
                    sourceType: "ddx_tool",
                    confidenceScore: 95
                })
            });

            if (!visitResponse.ok) throw new Error('Failed to create visit');
            const visit = await visitResponse.json();

            // Add symptoms
            const symptomsData = symptoms.map(s => ({
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
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to generate differentials",
                variant: "destructive"
            });
        } finally {
            setGenerating(false);
        }
    };

    const handleChatSubmit = async () => {
        if (!chatInput.trim()) return;

        const userMsg: ChatMessage = { role: 'user', content: chatInput };
        setMessages(prev => [...prev, userMsg]);
        setChatInput("");
        setChatLoading(true);

        try {
            const response = await fetch('http://192.168.1.6:3003/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMsg]
                })
            });

            if (response.ok) {
                const data = await response.json();
                setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
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
                            </div>

                            <div className="flex gap-2">
                                <Input
                                    placeholder="Enter a symptom..."
                                    value={newSymptom}
                                    onChange={(e) => setNewSymptom(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && addSymptom()}
                                />
                                <Button onClick={addSymptom}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>

                            <Button
                                onClick={generateDDX}
                                className="w-full mt-6"
                                disabled={generating || symptoms.length === 0}
                            >
                                <Stethoscope className="h-4 w-4 mr-2" />
                                {generating ? "Generating..." : "Generate Differentials"}
                            </Button>
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
                                        <Badge variant="outline" className="ml-auto">Clinical Model Large</Badge>
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
