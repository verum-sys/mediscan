import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
    ArrowLeft,
    Edit,
    Trash2,
    Plus,
    RefreshCw,
    ExternalLink,
    CheckCircle2,
    AlertTriangle,
    Upload,
    Package,
    Users,
    Activity,
    Bandage,
    History,
    Calendar,
    ChevronDown,
    ChevronUp,
    FileText,
    Clock,
    Mic,
    Bed,
    ThumbsUp,
    ThumbsDown
} from "lucide-react";


import { getApiUrl } from "@/config";

interface PatientHistory {
    summary: string;
    journey: Array<{
        date: string;
        title: string;
        dept: string;
        details: string;
        reports?: string[];
        prescriptions?: string[];
        vitals?: string;
    }>;
}

// ... existing code ...



interface Visit {
    id: string;
    visit_number: string;
    facility_name: string;
    department: string;
    provider_name: string;
    chief_complaint: string;
    status: string;
    confidence_score: number;
    created_at: string;
    visit_notes?: string;
    criticality?: 'Critical' | 'Stable';
    criticality_reason?: string;
    is_ipd_admission?: boolean;
    needs_follow_up?: boolean;
}

interface Symptom {
    id: string;
    symptom_text: string;
    confidence: string;
    confidence_score: number;
    severity: string;
    onset: string;
    duration: string;
    source: string;
}

interface Differential {
    id: string;
    condition_name: string;
    icd10_code: string;
    rank: number;
    confidence_score: number;
    rationale: string;
    supporting_symptoms: string[];
    reference_links: any[];
    suggested_investigations: string[];
    generated_by: string;
}

interface Alert {
    id: string;
    severity: string;
    title: string;
    message: string;
    explanation: string;
    created_at: string;
}

interface Medication {
    id: string;
    medication_name: string;
    date_prescribed: string;
    source: string;
}

export default function VisitDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [visit, setVisit] = useState<Visit | null>(null);
    const [symptoms, setSymptoms] = useState<Symptom[]>([]);
    const [medications, setMedications] = useState<Medication[]>([]);
    const [differentials, setDifferentials] = useState<Differential[]>([]);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingSymptom, setEditingSymptom] = useState<string | null>(null);
    const [newSymptom, setNewSymptom] = useState("");
    const [newMedName, setNewMedName] = useState("");
    const [newMedDays, setNewMedDays] = useState(1);
    const [clinicalAnalysis, setClinicalAnalysis] = useState<any>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [isEditingHeader, setIsEditingHeader] = useState(false);
    const [editedVisitNumber, setEditedVisitNumber] = useState("");
    const [editedDepartment, setEditedDepartment] = useState("");
    const [editedProviderName, setEditedProviderName] = useState("");
    const [patientHistory, setPatientHistory] = useState<PatientHistory | null>(null);
    const [isHistoryExpanded, setIsHistoryExpanded] = useState(true);
    const [feedback, setFeedback] = useState<Record<string, 'up' | 'down'>>({});

    const handleFeedback = (id: string, type: 'up' | 'down') => {
        setFeedback(prev => ({
            ...prev,
            [id]: prev[id] === type ? undefined : type // Toggle
        } as any));

        toast({
            title: "Feedback Recorded",
            description: `You marked this diagnosis as ${type === 'up' ? 'Helpful' : 'Not Helpful'}`,
            duration: 2000
        });
    };

    const departments = [
        "General Medicine",
        "Cardiology",
        "Neurology",
        "Orthopedics",
        "Pediatrics",
        "Emergency",
        "Dermatology",
        "Clinical Decision Support"
    ];

    const generateAnalysis = async () => {
        setAnalyzing(true);
        try {
            const response = await fetch(getApiUrl(`/api/visits/${id}/analysis`), {
                method: 'POST'
            });

            if (response.ok) {
                const data = await response.json();
                setClinicalAnalysis(data);
                toast({ title: "Analysis generated successfully" });
                loadVisit(); // Reload to fetch the newly generated summary
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to generate analysis",
                variant: "destructive"
            });
        } finally {
            setAnalyzing(false);
        }
    };

    useEffect(() => {
        if (id) {
            loadVisit();
        }
    }, [id]);

    const loadVisit = async () => {
        try {
            const response = await fetch(getApiUrl(`/api/visits/${id}`));
            if (response.ok) {
                const data = await response.json();
                setVisit(data.visit);
                setSymptoms(data.symptoms);
                setMedications(data.medications || []);
                setDifferentials(data.differentials);
                setAlerts(data.alerts);
                console.log("Patient history received:", data.patient_history);
                setPatientHistory(data.patient_history || null);
                if (data.clinical_analysis) {
                    setClinicalAnalysis(data.clinical_analysis);
                }

                // Initialize edit state
                setEditedVisitNumber(data.visit.visit_number);
                setEditedDepartment(data.visit.department);
                setEditedProviderName(data.visit.provider_name);
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to load visit details",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const generateDifferentials = async () => {
        try {
            const response = await fetch(getApiUrl(`/api/visits/${id}/differentials`), {
                method: 'POST'
            });

            if (response.ok) {
                toast({
                    title: "Success",
                    description: "Differential diagnoses generated successfully"
                });
                loadVisit();
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to generate differentials",
                variant: "destructive"
            });
        }
    };

    const deleteSymptom = async (symptomId: string) => {
        try {
            const response = await fetch(getApiUrl(`/api/symptoms/${symptomId}`), {
                method: 'DELETE'
            });

            if (response.ok) {
                toast({ title: "Symptom deleted" });
                loadVisit();
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to delete symptom",
                variant: "destructive"
            });
        }
    };

    const addSymptom = async () => {
        if (!newSymptom.trim()) return;
        try {
            const response = await fetch(getApiUrl(`/api/visits/${id}/symptoms`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symptoms: [{
                        text: newSymptom,
                        confidenceScore: 100,
                        source: 'manual',
                        rawText: newSymptom
                    }]
                })
            });

            if (response.ok) {
                const added = await response.json();
                setSymptoms([...symptoms, ...added]);
                setNewSymptom("");
                toast({ title: "Symptom added" });
            }
        } catch (error) {
            toast({ title: "Error adding symptom", variant: "destructive" });
        }
    };

    const handleAddMedication = async () => {
        if (!newMedName.trim()) return;
        try {
            const response = await fetch(getApiUrl(`/api/visits/${id}/medications`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    medications: [{
                        name: newMedName,
                        date: newMedDays.toString(), // Store days as string in date field for now
                        source: 'manual'
                    }]
                })
            });

            if (response.ok) {
                const added = await response.json();
                setMedications([...medications, ...added]);
                setNewMedName("");
                setNewMedDays(1);
                toast({ title: "Medication added" });
            }
        } catch (error) {
            toast({ title: "Error adding medication", variant: "destructive" });
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        // Pass the current visit ID to link/update this specific visit
        formData.append('visitId', id || '');

        setLoading(true);
        try {
            const response = await fetch(getApiUrl('/process-document'), {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                toast({
                    title: "Document Processed",
                    description: "Clinical report updated successfully."
                });
                loadVisit(); // Reload to show new notes
            } else {
                throw new Error('Upload failed');
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to process document",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveHeader = async () => {
        try {
            const response = await fetch(getApiUrl(`/api/visits/${id}`), {
                method: 'PATCH', // Assuming PATCH is supported for updates
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    visit_number: editedVisitNumber,
                    department: editedDepartment,
                    provider_name: editedProviderName
                })
            });

            if (response.ok) {
                const updatedVisit = await response.json();
                setVisit(prev => prev ? {
                    ...prev,
                    visit_number: editedVisitNumber,
                    department: editedDepartment,
                    provider_name: editedProviderName
                } : null);
                setIsEditingHeader(false);
                toast({ title: "Visit details updated" });
            } else {
                throw new Error("Failed to update");
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to update visit details",
                variant: "destructive"
            });
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-8 flex items-center justify-center">
                <p className="text-muted-foreground">Loading visit details...</p>
            </div>
        );
    }

    if (!visit) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-8 flex items-center justify-center">
                <Card className="glass-card p-8 text-center">
                    <p className="text-muted-foreground mb-4">Visit not found</p>
                    <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
                </Card>
            </div>
        );
    }

    const getConfidenceColor = (score: number) => {
        if (score >= 80) return "text-green-500";
        if (score >= 50) return "text-yellow-500";
        return "text-red-500";
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-8">
            <div className="container mx-auto px-6 max-w-7xl">
                {/* Header */}
                {/* Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <Button variant="ghost" size="icon" className="-ml-3 md:ml-0" onClick={() => navigate("/dashboard")}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div className="flex-1">
                            {isEditingHeader ? (
                                <div className="flex flex-col gap-2 max-w-md">
                                    <Input
                                        value={editedVisitNumber}
                                        onChange={(e) => setEditedVisitNumber(e.target.value)}
                                        placeholder="Visit #"
                                        className="text-lg font-bold h-9"
                                    />
                                    <div className="flex gap-2">
                                        <Input
                                            value={editedProviderName}
                                            onChange={(e) => setEditedProviderName(e.target.value)}
                                            placeholder="Provider"
                                            className="w-1/2 h-8 text-sm"
                                        />
                                        <Select value={editedDepartment} onValueChange={setEditedDepartment}>
                                            <SelectTrigger className="w-1/2 h-8 text-sm">
                                                <SelectValue placeholder="Dept" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {departments.map(dept => (
                                                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex gap-2 mt-1">
                                        <Button size="sm" className="h-7 text-xs" onClick={handleSaveHeader}>Save</Button>
                                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setIsEditingHeader(false)}>Cancel</Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="group cursor-pointer" onClick={() => setIsEditingHeader(true)}>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h1 className="text-2xl md:text-3xl font-bold group-hover:text-primary transition-colors tracking-tight">
                                            {visit.visit_number}
                                        </h1>
                                        <Edit className="h-4 w-4 opacity-0 group-hover:opacity-50" />
                                        <div className="flex gap-2 md:hidden">
                                            {visit.criticality === 'Critical' && (
                                                <Badge variant="destructive" className="h-5 px-1.5 text-[10px] animate-pulse">Critical</Badge>
                                            )}
                                            <Badge variant={visit.status === 'completed' ? 'default' : 'secondary'} className="h-5 px-1.5 text-[10px]">
                                                {visit.status}
                                            </Badge>
                                        </div>
                                    </div>
                                    <p className="text-sm md:text-base text-muted-foreground line-clamp-1">
                                        {visit.provider_name} • {visit.department}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end pl-10 md:pl-0">
                        <div className="flex items-center gap-3 hidden md:flex">
                            {visit.criticality === 'Critical' && (
                                <Badge variant="destructive" className="animate-pulse">Critical</Badge>
                            )}
                            <Badge variant={visit.status === 'completed' ? 'default' : 'secondary'}>
                                {visit.status}
                            </Badge>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className={`text-lg font-bold ${getConfidenceColor(visit.confidence_score)}`}>
                                {visit.confidence_score}%
                            </div>

                            {visit.is_ipd_admission ? (
                                <Badge className="bg-purple-600 hover:bg-purple-700 h-8 md:h-9 px-3">
                                    Admitted to IPD
                                </Badge>
                            ) : (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="h-8 md:h-9 bg-purple-100 text-purple-700 hover:bg-purple-200"
                                    onClick={async () => {
                                        if (confirm("Confirm admission to IPD?")) {
                                            try {
                                                const res = await fetch(getApiUrl(`/api/visits/${id}`), {
                                                    method: 'PATCH',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({
                                                        is_ipd_admission: true,
                                                        status: 'admitted_to_ipd'
                                                    })
                                                });
                                                if (res.ok) {
                                                    toast({ title: "Patient Admitted to IPD" });
                                                    setVisit(prev => prev ? { ...prev, is_ipd_admission: true, status: 'admitted_to_ipd' } : null);
                                                }
                                            } catch (e) { toast({ title: "Error", variant: "destructive" }); }
                                        }
                                    }}
                                >
                                    Admit to IPD
                                </Button>
                            )}

                            <Button
                                variant="destructive"
                                size="sm"
                                className="h-8 md:h-9"
                                onClick={async () => {
                                    if (confirm("Are you sure? This cannot be undone.")) {
                                        try {
                                            const res = await fetch(getApiUrl(`/api/visits/${id}`), { method: 'DELETE' });
                                            if (res.ok) { toast({ title: "Deleted" }); navigate("/dashboard"); }
                                        } catch (e) { toast({ title: "Error", variant: "destructive" }); }
                                    }
                                }}
                            >
                                <Trash2 className="h-4 w-4 md:mr-2" />
                                <span className="hidden md:inline">Delete Record</span>
                                <span className="md:hidden">Delete</span>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Alerts */}
                {alerts.length > 0 && (
                    <Card className="glass-card p-4 mb-6 border-red-500/20 bg-red-500/5">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                            <div className="flex-1">
                                {alerts.map((alert) => (
                                    <div key={alert.id} className="mb-2">
                                        <h3 className="font-semibold text-red-500">{alert.title}</h3>
                                        <p className="text-sm text-muted-foreground">{alert.message}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>
                )}



                {/* Chief Complaint */}
                <Card className="glass-card p-4 md:p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-3">Chief Complaint</h2>
                    <p className="text-lg">{visit.chief_complaint || "Not specified"}</p>
                    <div className="mt-4 text-sm text-muted-foreground">
                        Provider: {visit.provider_name || "N/A"} • {new Date(visit.created_at).toLocaleString()}
                    </div>
                </Card>

                {/* Patient Summary & Previous Visits (Returns for recurring, Summary for new) */}
                {patientHistory && (patientHistory.summary || (patientHistory.journey && patientHistory.journey.length > 0)) && (
                    <Card className="glass-card p-4 md:p-6 mb-6">
                        <div
                            className="flex items-center justify-between cursor-pointer"
                            onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                        >
                            <div className="flex items-center gap-2">
                                <History className="h-5 w-5 text-primary" />
                                <h2 className="text-xl font-semibold">Patient Summary & Previous Visits</h2>
                            </div>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                {isHistoryExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                        </div>

                        {isHistoryExpanded && (
                            <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="bg-muted/30 p-4 rounded-lg mb-4 text-sm leading-relaxed border-l-4 border-primary">
                                    <span className="font-semibold text-primary mr-2">Clinical Summary:</span>
                                    {patientHistory.summary || "No summary available."}
                                </div>

                                {patientHistory.journey && patientHistory.journey.length > 0 ? (
                                    <>
                                        <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Previous Visits Timeline</h3>
                                        <div className="space-y-6 relative pl-4 border-l-2 border-muted/50 ml-2">
                                            {patientHistory.journey.map((event, idx) => (
                                                <div key={idx} className="relative">
                                                    <div className="absolute -left-[21px] top-1.5 h-3 w-3 rounded-full bg-muted-foreground/30 border-2 border-background ring-offset-background"></div>
                                                    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
                                                        <div className="w-24 shrink-0 text-xs font-medium text-muted-foreground flex items-center gap-1">
                                                            <Calendar className="h-3 w-3" />
                                                            {event.date}
                                                        </div>
                                                        <div className="flex-1 pb-2">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="font-semibold text-sm">{event.title}</span>
                                                                <Badge variant="outline" className="text-[10px] h-4 px-1">{event.dept}</Badge>
                                                            </div>
                                                            <p className="text-xs text-muted-foreground mb-2">{event.details}</p>

                                                            {/* Rich Context Added: Reports, Rx, Vitals */}
                                                            <div className="flex flex-wrap gap-4 mt-2">
                                                                {event.vitals && event.vitals !== "N/A" && (
                                                                    <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">
                                                                        <Activity className="h-3 w-3" />
                                                                        <span className="font-medium">{event.vitals}</span>
                                                                    </div>
                                                                )}

                                                                {event.reports && event.reports.length > 0 && (
                                                                    <div className="flex flex-col gap-1">
                                                                        {event.reports.map((report, rIdx) => (
                                                                            <div key={rIdx} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary cursor-pointer transition-colors">
                                                                                <FileText className="h-3 w-3" />
                                                                                <span className="underline decoration-dotted">{report}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}

                                                                {event.prescriptions && event.prescriptions.length > 0 && (
                                                                    <div className="flex flex-col gap-1">
                                                                        <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                                                                            <Bandage className="h-3 w-3" />
                                                                            <span>Prescribed:</span>
                                                                        </div>
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {event.prescriptions.map((rx, rxIdx) => (
                                                                                <Badge key={rxIdx} variant="secondary" className="text-[10px] h-4 px-1 bg-emerald-50 text-emerald-700 border-emerald-100">
                                                                                    {rx}
                                                                                </Badge>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-sm text-muted-foreground italic pl-2 border-l-2 border-muted/30">
                                        No previous visit history available.
                                    </div>
                                )}
                            </div>
                        )}
                    </Card>
                )}

                {/* Symptoms Panel */}
                <Card className="glass-card p-4 md:p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold">Symptoms</h2>
                        <Badge variant="outline">{symptoms.length} symptoms</Badge>
                    </div>

                    <div className="space-y-3 mb-4">
                        {symptoms.map((symptom) => (
                            <div
                                key={symptom.id}
                                className={`p-3 md:p-4 rounded-lg border ${symptom.confidence === 'low' ? 'bg-yellow-500/5 border-yellow-500/20' :
                                    symptom.confidence === 'high' ? 'bg-green-500/5 border-green-500/20' :
                                        'bg-muted/50'
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                        <p className="font-medium text-sm md:text-base">{symptom.symptom_text}</p>
                                        <div className="flex flex-wrap gap-2 md:gap-4 mt-2 text-xs md:text-sm text-muted-foreground">
                                            {symptom.severity && <span>Severity: {symptom.severity}</span>}
                                            {symptom.onset && <span>Onset: {symptom.onset}</span>}
                                            {symptom.duration && <span>Duration: {symptom.duration}</span>}
                                        </div>
                                    </div>
                                    <div className="flex flex-col md:flex-row items-end md:items-center gap-2">
                                        <Badge variant="outline" className="text-[10px] md:text-xs h-5 md:h-6">
                                            {symptom.confidence_score}%
                                        </Badge>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                            onClick={() => deleteSymptom(symptom.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Add Symptom */}
                    <div className="flex gap-2">
                        <Input
                            placeholder="Add new symptom..."
                            value={newSymptom}
                            onChange={(e) => setNewSymptom(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && addSymptom()}
                            className="flex-1"
                        />
                        <Button onClick={addSymptom} size="icon" className="shrink-0">
                            <Plus className="h-5 w-5" />
                        </Button>
                    </div>
                </Card>

                {/* Medications Panel */}
                <Card className="glass-card p-4 md:p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold">Medications</h2>
                        <Badge variant="outline">{medications.length} records</Badge>
                    </div>

                    <div className="space-y-3 mb-4">
                        {medications.length === 0 ? (
                            <p className="text-muted-foreground text-sm">No medical history recorded.</p>
                        ) : (
                            medications.map((med) => (
                                <div key={med.id} className="p-3 rounded-lg border bg-muted/30 flex justify-between items-center">
                                    <div>
                                        <p className="font-medium text-sm md:text-base">{med.medication_name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Duration: {med.date_prescribed} days • Source: {med.source}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Add Medication */}
                    <div className="flex flex-col md:flex-row gap-3 items-end">
                        <div className="flex-1 w-full">
                            <label className="text-xs text-muted-foreground mb-1 block">Medication Name</label>
                            <Input
                                placeholder="e.g. Metformin 500mg"
                                value={newMedName}
                                onChange={(e) => setNewMedName(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <div className="w-1/2 md:w-32">
                                <label className="text-xs text-muted-foreground mb-1 block">Days</label>
                                <div className="flex items-center">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-10 w-8 rounded-r-none"
                                        onClick={() => setNewMedDays(prev => Math.max(1, prev - 1))}
                                    >
                                        -
                                    </Button>
                                    <div className="h-10 flex-1 flex items-center justify-center border-y border-input bg-background text-sm">
                                        {newMedDays}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-10 w-8 rounded-l-none"
                                        onClick={() => setNewMedDays(prev => prev + 1)}
                                    >
                                        +
                                    </Button>
                                </div>
                            </div>
                            <Button onClick={handleAddMedication} className="mb-0 mt-auto flex-1 md:flex-none">
                                <Plus className="h-4 w-4 md:mr-2" />
                                <span className="md:inline">Add</span>
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* Differentials Panel */}
                <Card className="glass-card p-4 md:p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold">Differential Diagnoses</h2>
                        <Button onClick={generateDifferentials} variant="outline" size="sm">
                            <RefreshCw className="h-4 w-4 md:mr-2" />
                            <span className="hidden md:inline">{differentials.length > 0 ? 'Re-generate' : 'Generate DDX'}</span>
                            <span className="md:hidden">Generate</span>
                        </Button>
                    </div>

                    {differentials.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <p>No differentials generated yet</p>
                            <p className="text-sm mt-2">Click "Generate" to analyze symptoms</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {differentials.filter(diff => diff.condition_name && diff.condition_name.trim() !== "").map((diff) => (
                                <div key={diff.id} className="p-4 rounded-lg border bg-muted/30">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Badge className="bg-primary">{diff.rank}</Badge>
                                                <h3 className="font-semibold text-lg">{diff.condition_name}</h3>
                                                {diff.icd10_code && (
                                                    <Badge variant="outline" className="text-xs">{diff.icd10_code}</Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-1">{diff.rationale}</p>
                                        </div>
                                        <Badge variant="outline" className={getConfidenceColor(diff.confidence_score)}>
                                            {diff.confidence_score}%
                                        </Badge>
                                    </div>

                                    {diff.suggested_investigations && diff.suggested_investigations.length > 0 && (
                                        <div className="mt-3">
                                            <p className="text-sm font-medium mb-2">Suggested Investigations:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {diff.suggested_investigations.map((test, idx) => (
                                                    <Badge key={idx} variant="secondary" className="text-xs">
                                                        {test}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {diff.reference_links && diff.reference_links.length > 0 && (
                                        <div className="mt-3 flex gap-2">
                                            {diff.reference_links.map((ref: any, idx: number) => (
                                                <a
                                                    key={idx}
                                                    href={ref.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-primary hover:underline flex items-center gap-1"
                                                >
                                                    {ref.title}
                                                    <ExternalLink className="h-3 w-3" />
                                                </a>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                                        <div className="text-xs text-muted-foreground">
                                            Generated by: {diff.generated_by}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground mr-1">Feedback:</span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className={`h-8 w-8 p-0 ${feedback[diff.id] === 'up' ? 'text-green-600 bg-green-100' : 'hover:text-green-600'}`}
                                                onClick={() => handleFeedback(diff.id, 'up')}
                                            >
                                                <ThumbsUp className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className={`h-8 w-8 p-0 ${feedback[diff.id] === 'down' ? 'text-red-600 bg-red-100' : 'hover:text-red-600'}`}
                                                onClick={() => handleFeedback(diff.id, 'down')}
                                            >
                                                <ThumbsDown className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                {/* Full Clinical Report (Extracted Text) */}
                <Card className="glass-card p-4 md:p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold">Full Clinical Report</h2>
                        <div className="flex items-center gap-2">
                            <input
                                type="file"
                                id="report-upload"
                                className="hidden"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={handleFileUpload}
                            />
                            <Button variant="outline" size="sm" onClick={() => document.getElementById('report-upload')?.click()}>
                                <Upload className="h-4 w-4 md:mr-2" />
                                <span className="hidden md:inline">Upload Document</span>
                                <span className="md:hidden">Upload</span>
                            </Button>
                        </div>
                    </div>
                    <div className="bg-muted/30 p-4 md:p-6 rounded-lg font-mono text-xs md:text-sm whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto">
                        {visit.visit_notes || "No report text available."}
                    </div>
                </Card>

                {/* AI Clinical Analysis */}
                <Card className="glass-card p-4 md:p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold">AI Clinical Analysis</h2>
                        <Button onClick={generateAnalysis} disabled={analyzing}>
                            {analyzing ? (
                                <>
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <FileText className="h-4 w-4 mr-2" />
                                    {clinicalAnalysis ? "Regenerate Analysis" : "Generate Analysis"}
                                </>
                            )}
                        </Button>
                    </div>

                    {clinicalAnalysis && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Patient Analysis Table */}
                            <div>
                                <h3 className="text-lg font-medium mb-3">Patient Analysis</h3>
                                <div className="overflow-x-auto rounded-lg border">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                                            <tr>
                                                <th className="px-4 py-3">Age/Sex</th>
                                                <th className="px-4 py-3">Chief Complaint</th>
                                                <th className="px-4 py-3">Symptoms</th>
                                                <th className="px-4 py-3">Treatment Plan</th>
                                                <th className="px-4 py-3">Effectiveness</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            <tr className="bg-background">
                                                <td className="px-4 py-3 font-medium">
                                                    {clinicalAnalysis.patient_analysis.Age}/{clinicalAnalysis.patient_analysis.Sex}
                                                </td>
                                                <td className="px-4 py-3">{clinicalAnalysis.patient_analysis.Chief_Complaint}</td>
                                                <td className="px-4 py-3">
                                                    {Array.isArray(clinicalAnalysis.patient_analysis.Symptoms)
                                                        ? clinicalAnalysis.patient_analysis.Symptoms.join(', ')
                                                        : clinicalAnalysis.patient_analysis.Symptoms}
                                                </td>
                                                <td className="px-4 py-3">{clinicalAnalysis.patient_analysis.Treatment_Plan}</td>
                                                <td className="px-4 py-3">
                                                    <Badge variant="outline">{clinicalAnalysis.patient_analysis.Effectiveness_Prediction}</Badge>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                    Note: {clinicalAnalysis.patient_analysis.Notes}
                                </p>
                            </div>

                            {/* Medication Recommendations */}
                            {/* Medication Recommendations */}
                            <div>
                                <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                                    <Bandage className="w-5 h-5 text-primary" />
                                    Medication Plan & Inventory
                                </h3>

                                {(!clinicalAnalysis.medications || clinicalAnalysis.medications.length === 0) ? (
                                    <div className="p-6 border rounded-lg bg-muted/10 border-dashed text-center">
                                        <p className="text-muted-foreground text-sm">No specific medications recommended in this analysis.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto rounded-lg border shadow-sm">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                                                <tr>
                                                    <th className="px-4 py-3">Drug & Dosage</th>
                                                    <th className="px-4 py-3">Active Salt</th>
                                                    <th className="px-4 py-3">Stock Status</th>
                                                    <th className="px-4 py-3">Substitutes</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {clinicalAnalysis.medications.map((item: any, idx: number) => (
                                                    <tr key={idx} className="bg-background hover:bg-muted/50 transition-colors">
                                                        <td className="px-4 py-3">
                                                            <div className="font-medium text-purple-600">{item.Name}</div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {item.Dosage} • {item.Frequency} • {item.Duration}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                                                            {item.logistics?.salt_composition || "Unknown"}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {item.logistics && (
                                                                <div className="flex flex-col gap-1">
                                                                    <Badge variant={item.logistics.stock_status === 'Available' ? 'outline' : 'destructive'}
                                                                        className={item.logistics.stock_status === 'Available' ? 'text-green-600 border-green-200 bg-green-50 w-fit' : 'w-fit'}>
                                                                        {item.logistics.stock_status}
                                                                    </Badge>
                                                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                                        <Package className="w-3 h-3" />
                                                                        {item.logistics.current_stock}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {item.logistics?.alternatives?.length > 0 ? (
                                                                <div className="space-y-1">
                                                                    {item.logistics.alternatives.map((alt: any, i: number) => (
                                                                        <div key={i} className="flex justify-between items-center text-xs bg-muted/50 p-1.5 rounded border">
                                                                            <span className="font-medium">{alt.brand_name}</span>
                                                                            <span className="text-green-600 font-bold">{alt.stock}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground">-</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* Investigative Suggestions Table */}
                            <div>
                                <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-primary" />
                                    Investigative Suggestions & Lab Logistics
                                </h3>
                                <div className="overflow-x-auto rounded-lg border shadow-sm">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                                            <tr>
                                                <th className="px-4 py-3">Test Name</th>
                                                <th className="px-4 py-3">Type</th>
                                                <th className="px-4 py-3">Confidence</th>
                                                <th className="px-4 py-3">Lab Queue</th>
                                                <th className="px-4 py-3">Next Slot</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {clinicalAnalysis.investigative_suggestions.map((item: any, idx: number) => (
                                                <tr key={idx} className="bg-background hover:bg-muted/50 transition-colors">
                                                    <td className="px-4 py-3 font-medium">{item.Test_Name}</td>
                                                    <td className="px-4 py-3">
                                                        <Badge variant={item.Type === 'Essential' ? 'default' : 'secondary'}>
                                                            {item.Type}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-primary"
                                                                    style={{ width: `${item.Confidence_Score}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-xs">{item.Confidence_Score}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {item.logistics && (
                                                            <div className="flex items-center gap-2">
                                                                <Users className="w-4 h-4 text-muted-foreground" />
                                                                <span className={`text-xs font-medium ${item.logistics.status === 'High Wait Time' ? 'text-orange-500' : 'text-green-600'}`}>
                                                                    {item.logistics.live_queue}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {item.logistics && (
                                                            <Badge variant="outline" className="font-mono font-normal">
                                                                <Clock className="w-3 h-3 mr-1" />
                                                                {item.logistics.next_available_slot}
                                                            </Badge>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </Card>

                {/* Action Buttons */}
                <div className="flex flex-col md:flex-row gap-4 mb-20 justify-end">
                    <Button
                        variant="outline"
                        size="lg"
                        className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-800"
                        onClick={async () => {
                            if (confirm("Mark treatment as ended? Patient will be removed from follow-up queue.")) {
                                try {
                                    const res = await fetch(getApiUrl(`/api/visits/${id}`), {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            status: 'completed',
                                            needs_follow_up: false
                                        })
                                    });
                                    if (res.ok) {
                                        toast({
                                            title: "Treatment Ended",
                                            description: "Patient removed from follow-up queue."
                                        });
                                        setVisit(prev => prev ? {
                                            ...prev,
                                            status: 'completed',
                                            needs_follow_up: false
                                        } : null);
                                    } else {
                                        throw new Error('Failed to update');
                                    }
                                } catch (e) {
                                    toast({
                                        title: "Error",
                                        description: "Failed to end treatment",
                                        variant: "destructive"
                                    });
                                }
                            }
                        }}
                    >
                        <CheckCircle2 className="mr-2 h-5 w-5" />
                        Treatment Ended
                    </Button>

                    <Button
                        size="lg"
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20"
                        onClick={() => {
                            toast({ title: "Admission Request Sent", description: "Patient added to IPD queue." });
                        }}
                    >
                        <Bed className="mr-2 h-5 w-5" />
                        Admit to IPD
                    </Button>
                </div>
            </div>
        </div>
    );
}
