import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
    Siren,
    Activity,
    HeartPulse,
    Thermometer,
    Wind,
    Brain,
    Timer,
    AlertTriangle,
    AlertOctagon,
    Stethoscope,
    Users,
    Clock,
    CheckCircle2
} from "lucide-react";

interface TriageResult {
    level: 'Red' | 'Orange' | 'Yellow' | 'Green' | 'Blue';
    priority: number;
    description: string;
    action: string;
    estimatedWait: string;
    reason?: string;
}

interface QueueItem {
    id: string;
    name: string;
    age: string;
    sex: string;
    chiefComplaint: string;
    level: TriageResult;
    timestamp: string;
    vitals: any;
}

export default function Triage() {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState("intake");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<TriageResult | null>(null);
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [massCasualtyMode, setMassCasualtyMode] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({
        name: "",
        age: "",
        sex: "",
        chiefComplaint: "",
        hr: "",
        bpSystolic: "",
        bpDiastolic: "",
        rr: "",
        spo2: "",
        temp: "",
        gcs: "15",
        painScore: "0",
        consciousness: "Alert"
    });

    // Checkboxes
    const [checks, setChecks] = useState({
        intubation: false,
        pulseless: false,
        unresponsive: false,
        respiratoryDistress: false,
        highRiskGutFeeling: false
    });

    // Resources
    const [resources, setResources] = useState({
        labs: false,
        imaging: false,
        ivFluids: false,
        ivMeds: false,
        consult: false,
        procedure: false
    });

    // Override
    const [overrideLevel, setOverrideLevel] = useState<string | null>(null);

    useEffect(() => {
        loadQueue();
        const interval = setInterval(loadQueue, 30000); // Refresh queue every 30s
        return () => clearInterval(interval);
    }, []);

    const loadQueue = async () => {
        try {
            const res = await fetch('http://192.168.1.6:3003/api/triage/queue');
            if (res.ok) {
                const data = await res.json();
                setQueue(data);
            }
        } catch (e) {
            console.error("Failed to load queue", e);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const calculateESI = () => {
        // Level 1 Checks (Red)
        if (checks.intubation || checks.pulseless || checks.unresponsive || checks.respiratoryDistress) {
            return {
                level: 'Red',
                priority: 1,
                description: 'Resuscitation',
                action: 'Immediate life-saving intervention needed.',
                estimatedWait: '0 mins',
                reason: 'Critical Life Threat (Level 1 Criteria Met)'
            } as TriageResult;
        }

        // Level 2 Checks (Orange)
        const hr = parseInt(formData.hr) || 80;
        const rr = parseInt(formData.rr) || 16;
        const spo2 = parseInt(formData.spo2) || 98;
        const pain = parseInt(formData.painScore) || 0;
        const age = parseInt(formData.age) || 30;
        const temp = parseFloat(formData.temp) || 37.0;

        // Danger Zone Vitals Logic
        let dangerZone = false;
        // Pediatric Danger Zones (Simplified)
        if (age < 1 && (hr > 160 || rr > 60)) dangerZone = true;
        if (age >= 1 && age <= 8 && (hr > 140 || rr > 40)) dangerZone = true;
        if (age > 8 && (hr > 100 || rr > 20)) dangerZone = true; // Adult Tachycardia/Tachypnea
        if (spo2 < 92) dangerZone = true;
        if (formData.consciousness !== 'Alert') dangerZone = true;
        if (pain > 7) dangerZone = true;
        if (checks.highRiskGutFeeling) dangerZone = true;

        // Fever in infants < 3 months
        if (age < 1 && temp > 38.0) dangerZone = true;

        if (dangerZone) {
            return {
                level: 'Orange',
                priority: 2,
                description: 'Emergent',
                action: 'High risk. Rapid intervention required.',
                estimatedWait: '< 10 mins',
                reason: 'High Risk / Abnormal Vitals / Severe Pain'
            } as TriageResult;
        }

        // Level 3, 4, 5 (Resource Prediction)
        const resourceCount = Object.values(resources).filter(Boolean).length;

        if (resourceCount >= 2) {
            // Check vitals for Level 3 stability
            // If vitals are dangerous but not Level 2, it might still be Level 3
            if (hr > 100 || rr > 20 || spo2 < 95) {
                // Could be up-triaged to 2, but standard ESI keeps stable resource-heavy patients at 3
            }
            return {
                level: 'Yellow',
                priority: 3,
                description: 'Urgent',
                action: 'Stable. Needs 2+ resources.',
                estimatedWait: '< 60 mins',
                reason: `Needs ${resourceCount} resources`
            } as TriageResult;
        } else if (resourceCount === 1) {
            return {
                level: 'Green',
                priority: 4,
                description: 'Less Urgent',
                action: 'Stable. Needs 1 resource.',
                estimatedWait: '1-2 hours',
                reason: 'Needs 1 resource'
            } as TriageResult;
        } else {
            return {
                level: 'Blue',
                priority: 5,
                description: 'Non-Urgent',
                action: 'Stable. No resources needed.',
                estimatedWait: '2-4 hours',
                reason: 'No resources needed'
            } as TriageResult;
        }
    };

    const handleSubmit = async () => {
        setLoading(true);

        // Calculate ESI
        let triageResult = calculateESI();

        // Handle Override
        if (overrideLevel) {
            const levels: Record<string, TriageResult> = {
                '1': { level: 'Red', priority: 1, description: 'Resuscitation', action: 'Immediate', estimatedWait: '0 mins', reason: 'Nurse Override' },
                '2': { level: 'Orange', priority: 2, description: 'Emergent', action: 'Rapid', estimatedWait: '< 10 mins', reason: 'Nurse Override' },
                '3': { level: 'Yellow', priority: 3, description: 'Urgent', action: 'Stable', estimatedWait: '< 60 mins', reason: 'Nurse Override' },
                '4': { level: 'Green', priority: 4, description: 'Less Urgent', action: 'Stable', estimatedWait: '1-2 hours', reason: 'Nurse Override' },
                '5': { level: 'Blue', priority: 5, description: 'Non-Urgent', action: 'Stable', estimatedWait: '2-4 hours', reason: 'Nurse Override' }
            };
            triageResult = levels[overrideLevel];
        }

        setResult(triageResult);

        // Save to Backend
        try {
            await fetch('http://192.168.1.6:3003/api/triage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    level: triageResult,
                    vitals: {
                        hr: formData.hr,
                        bp: `${formData.bpSystolic}/${formData.bpDiastolic}`,
                        rr: formData.rr,
                        spo2: formData.spo2,
                        temp: formData.temp
                    }
                })
            });

            toast({
                title: "Triage Complete",
                description: `Patient assigned to Level ${triageResult.priority} (${triageResult.level})`,
            });

            loadQueue(); // Refresh queue

        } catch (e) {
            toast({ title: "Error saving triage", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const getLevelColor = (level: string) => {
        switch (level) {
            case 'Red': return 'bg-red-500 text-white border-red-600 shadow-red-500/50';
            case 'Orange': return 'bg-orange-500 text-white border-orange-600 shadow-orange-500/50';
            case 'Yellow': return 'bg-yellow-500 text-black border-yellow-600 shadow-yellow-500/50';
            case 'Green': return 'bg-green-500 text-white border-green-600 shadow-green-500/50';
            case 'Blue': return 'bg-blue-500 text-white border-blue-600 shadow-blue-500/50';
            default: return 'bg-gray-500';
        }
    };

    const getWaitTimeColor = (minutes: number, level: number) => {
        const limits = { 1: 0, 2: 10, 3: 60, 4: 120, 5: 240 };
        // @ts-ignore
        return minutes > limits[level] ? "text-red-500 animate-pulse font-bold" : "text-green-500";
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-red-500/5 py-8">
            <div className="container mx-auto px-6 max-w-7xl">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-500/10 rounded-xl">
                            <Siren className="w-8 h-8 text-red-500 animate-pulse" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">Emergency Triage</h1>
                            <p className="text-muted-foreground">ESI Standard Clinical Decision Support</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Label>Mass Casualty Mode</Label>
                            <Checkbox
                                checked={massCasualtyMode}
                                onCheckedChange={(c) => setMassCasualtyMode(!!c)}
                            />
                        </div>
                        <Button
                            variant={activeTab === "queue" ? "default" : "outline"}
                            onClick={() => setActiveTab("queue")}
                        >
                            <Users className="w-4 h-4 mr-2" />
                            Live Queue
                        </Button>
                        <Button
                            variant={activeTab === "intake" ? "default" : "outline"}
                            onClick={() => setActiveTab("intake")}
                        >
                            <Stethoscope className="w-4 h-4 mr-2" />
                            New Patient
                        </Button>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsContent value="intake">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            {/* Input Form */}
                            <div className="lg:col-span-7 space-y-6">
                                <Card className="glass-card p-6 border-t-4 border-t-primary">
                                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                                        <Activity className="w-5 h-5 text-primary" />
                                        Nurse Intake Form
                                    </h2>

                                    {/* Patient Demographics */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-muted/30 rounded-lg">
                                        <div className="space-y-2">
                                            <Label>Patient Name</Label>
                                            <Input name="name" value={formData.name} onChange={handleInputChange} placeholder="John Doe" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-2">
                                                <Label>Age</Label>
                                                <Input name="age" value={formData.age} onChange={handleInputChange} placeholder="45" type="number" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Sex</Label>
                                                <Select onValueChange={(v) => setFormData({ ...formData, sex: v })}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="M">Male</SelectItem>
                                                        <SelectItem value="F">Female</SelectItem>
                                                        <SelectItem value="O">Other</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="col-span-2 space-y-2">
                                            <Label>Chief Complaint</Label>
                                            <Input name="chiefComplaint" value={formData.chiefComplaint} onChange={handleInputChange} placeholder="e.g. Chest Pain" />
                                        </div>
                                    </div>

                                    {/* Section A: Killer Questions */}
                                    <div className="mb-6 p-4 border border-red-500/20 bg-red-500/5 rounded-lg">
                                        <h3 className="font-bold text-red-500 mb-3 flex items-center">
                                            <AlertTriangle className="w-4 h-4 mr-2" />
                                            Section A: Immediate Life Threat?
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {[
                                                { id: 'intubation', label: 'Requires Intubation / Apnea' },
                                                { id: 'pulseless', label: 'Pulseless / Cardiac Arrest' },
                                                { id: 'unresponsive', label: 'Unresponsive (AVPU = U)' },
                                                { id: 'respiratoryDistress', label: 'Severe Respiratory Distress' }
                                            ].map((item) => (
                                                <div key={item.id} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={item.id}
                                                        // @ts-ignore
                                                        checked={checks[item.id]}
                                                        // @ts-ignore
                                                        onCheckedChange={(c) => setChecks({ ...checks, [item.id]: !!c })}
                                                    />
                                                    <Label htmlFor={item.id} className="font-medium">{item.label}</Label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Section B: High Risk & Vitals */}
                                    <div className="mb-6 p-4 border border-orange-500/20 bg-orange-500/5 rounded-lg">
                                        <h3 className="font-bold text-orange-500 mb-3 flex items-center">
                                            <Activity className="w-4 h-4 mr-2" />
                                            Section B: High Risk Assessment
                                        </h3>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                            <div className="space-y-2">
                                                <Label>HR (bpm)</Label>
                                                <Input name="hr" value={formData.hr} onChange={handleInputChange} placeholder="80" type="number" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>SpO2 (%)</Label>
                                                <Input name="spo2" value={formData.spo2} onChange={handleInputChange} placeholder="98" type="number" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>RR (/min)</Label>
                                                <Input name="rr" value={formData.rr} onChange={handleInputChange} placeholder="16" type="number" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Temp (°C)</Label>
                                                <Input name="temp" value={formData.temp} onChange={handleInputChange} placeholder="37.0" type="number" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            <div className="space-y-2">
                                                <Label>Pain Score (0-10)</Label>
                                                <div className="flex items-center gap-4">
                                                    <Input name="painScore" value={formData.painScore} onChange={handleInputChange} type="range" min="0" max="10" className="flex-1" />
                                                    <span className="font-bold w-8">{formData.painScore}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Consciousness</Label>
                                                <Select onValueChange={(v) => setFormData({ ...formData, consciousness: v })}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Alert" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Alert">Alert</SelectItem>
                                                        <SelectItem value="Verbal">Verbal</SelectItem>
                                                        <SelectItem value="Pain">Pain</SelectItem>
                                                        <SelectItem value="Unresponsive">Unresponsive</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-2 pt-2">
                                            <Checkbox
                                                id="highRisk"
                                                checked={checks.highRiskGutFeeling}
                                                onCheckedChange={(c) => setChecks({ ...checks, highRiskGutFeeling: !!c })}
                                            />
                                            <Label htmlFor="highRisk" className="font-bold text-orange-600">Nurse Gut Feeling: High Risk Situation?</Label>
                                        </div>
                                    </div>

                                    {/* Section C: Resources */}
                                    <div className="mb-6 p-4 border border-yellow-500/20 bg-yellow-500/5 rounded-lg">
                                        <h3 className="font-bold text-yellow-600 mb-3 flex items-center">
                                            <Stethoscope className="w-4 h-4 mr-2" />
                                            Section C: Predicted Resources
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {[
                                                { id: 'labs', label: 'Lab Tests (Blood/Urine)' },
                                                { id: 'imaging', label: 'ECG / X-Ray / CT Scan' },
                                                { id: 'ivFluids', label: 'IV Fluids (Hydration)' },
                                                { id: 'ivMeds', label: 'IV/IM Medication' },
                                                { id: 'consult', label: 'Specialty Consultation' },
                                                { id: 'procedure', label: 'Simple Procedure (Sutures/Foley)' }
                                            ].map((item) => (
                                                <div key={item.id} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={item.id}
                                                        // @ts-ignore
                                                        checked={resources[item.id]}
                                                        // @ts-ignore
                                                        onCheckedChange={(c) => setResources({ ...resources, [item.id]: !!c })}
                                                    />
                                                    <Label htmlFor={item.id}>{item.label}</Label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Override */}
                                    <div className="flex items-center justify-end gap-4 pt-4 border-t">
                                        <div className="flex items-center gap-2">
                                            <Label className="text-muted-foreground">Manual Override:</Label>
                                            <Select onValueChange={setOverrideLevel}>
                                                <SelectTrigger className="w-[180px]">
                                                    <SelectValue placeholder="No Override" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="1">Level 1 (Red)</SelectItem>
                                                    <SelectItem value="2">Level 2 (Orange)</SelectItem>
                                                    <SelectItem value="3">Level 3 (Yellow)</SelectItem>
                                                    <SelectItem value="4">Level 4 (Green)</SelectItem>
                                                    <SelectItem value="5">Level 5 (Blue)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <Button
                                            onClick={handleSubmit}
                                            className="bg-primary hover:bg-primary/90 text-white min-w-[150px]"
                                            disabled={loading}
                                        >
                                            {loading ? "Processing..." : "Assign Priority"}
                                        </Button>
                                    </div>
                                </Card>
                            </div>

                            {/* Results Panel */}
                            <div className="lg:col-span-5 space-y-6">
                                {result ? (
                                    <Card className={`p-8 border-2 shadow-2xl transition-all duration-500 animate-in fade-in slide-in-from-right-8 ${getLevelColor(result.level)}`}>
                                        <div className="text-center mb-6">
                                            <h3 className="text-sm uppercase tracking-widest opacity-90 mb-2">ESI Triage Level</h3>
                                            <div className="text-8xl font-black mb-2">{result.priority}</div>
                                            <div className="text-3xl font-bold opacity-90">{result.level}</div>
                                            <div className="text-lg opacity-80 mt-1">{result.description}</div>
                                        </div>

                                        <div className="space-y-4 bg-black/20 rounded-xl p-6 backdrop-blur-sm">
                                            <div className="flex items-start gap-3">
                                                <Timer className="w-6 h-6 mt-1" />
                                                <div>
                                                    <div className="font-semibold">Target Wait Time</div>
                                                    <div className="text-sm opacity-90">{result.estimatedWait}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <Activity className="w-6 h-6 mt-1" />
                                                <div>
                                                    <div className="font-semibold">Recommended Action</div>
                                                    <div className="text-sm opacity-90">{result.action}</div>
                                                </div>
                                            </div>
                                            {result.reason && (
                                                <div className="flex items-start gap-3 pt-2 border-t border-white/10">
                                                    <CheckCircle2 className="w-6 h-6 mt-1" />
                                                    <div>
                                                        <div className="font-semibold">Reason</div>
                                                        <div className="text-sm opacity-90">{result.reason}</div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-6 flex gap-2">
                                            <Button variant="secondary" className="w-full" onClick={() => setActiveTab("queue")}>
                                                View Queue
                                            </Button>
                                            <Button variant="outline" className="w-full bg-transparent border-white/30 hover:bg-white/10 text-white" onClick={() => setResult(null)}>
                                                Next Patient
                                            </Button>
                                        </div>
                                    </Card>
                                ) : (
                                    <Card className="h-full min-h-[400px] flex flex-col items-center justify-center p-8 text-center text-muted-foreground border-dashed">
                                        <Siren className="w-16 h-16 mb-4 opacity-20" />
                                        <h3 className="text-xl font-semibold mb-2">Ready for Assessment</h3>
                                        <p>Complete the form to generate ESI priority level.</p>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="queue">
                        <Card className="glass-card p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold flex items-center gap-2">
                                    <Users className="w-6 h-6" />
                                    Live Triage Queue
                                </h2>
                                <div className="flex gap-2">
                                    <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                                        Level 1: {queue.filter(q => q.level.priority === 1).length}
                                    </Badge>
                                    <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20">
                                        Level 2: {queue.filter(q => q.level.priority === 2).length}
                                    </Badge>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {queue.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                        <p>Queue is empty</p>
                                    </div>
                                ) : (
                                    queue.map((patient) => {
                                        const waitTime = Math.floor((Date.now() - new Date(patient.timestamp).getTime()) / 60000);

                                        return (
                                            <div
                                                key={patient.id}
                                                className={`flex items-center p-4 rounded-xl border transition-all hover:shadow-md ${patient.level.priority === 1 ? 'bg-red-500/5 border-red-500/30' :
                                                        patient.level.priority === 2 ? 'bg-orange-500/5 border-orange-500/30' :
                                                            'bg-card border-border'
                                                    }`}
                                            >
                                                {/* Priority Badge */}
                                                <div className={`w-16 h-16 rounded-lg flex flex-col items-center justify-center mr-4 font-bold text-white shadow-lg ${patient.level.priority === 1 ? 'bg-red-500' :
                                                        patient.level.priority === 2 ? 'bg-orange-500' :
                                                            patient.level.priority === 3 ? 'bg-yellow-500 text-black' :
                                                                patient.level.priority === 4 ? 'bg-green-500' :
                                                                    'bg-blue-500'
                                                    }`}>
                                                    <span className="text-xs uppercase">Level</span>
                                                    <span className="text-2xl">{patient.level.priority}</span>
                                                </div>

                                                {/* Patient Info */}
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <h3 className="font-bold text-lg">{patient.name} <span className="text-sm font-normal text-muted-foreground">({patient.age} / {patient.sex})</span></h3>
                                                        <div className="flex items-center gap-2 font-mono text-sm">
                                                            <Clock className="w-4 h-4" />
                                                            <span className={getWaitTimeColor(waitTime, patient.level.priority)}>
                                                                {waitTime} min
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="text-sm font-medium mb-2">{patient.chiefComplaint}</div>

                                                    {/* Vitals Summary */}
                                                    <div className="flex gap-2 text-xs">
                                                        {patient.vitals.hr > 100 && (
                                                            <Badge variant="destructive" className="h-5">HR: {patient.vitals.hr}</Badge>
                                                        )}
                                                        {patient.vitals.spo2 < 95 && (
                                                            <Badge variant="destructive" className="h-5">SpO2: {patient.vitals.spo2}%</Badge>
                                                        )}
                                                        {patient.vitals.temp > 38 && (
                                                            <Badge variant="destructive" className="h-5">Temp: {patient.vitals.temp}°C</Badge>
                                                        )}
                                                        <span className="text-muted-foreground ml-auto">
                                                            Reason: {patient.level.reason || 'Standard Triage'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Action */}
                                                <div className="ml-4 pl-4 border-l">
                                                    <Button size="sm">Assign Bed</Button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
