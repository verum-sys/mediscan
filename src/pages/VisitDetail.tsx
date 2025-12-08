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
    Clock,
    Mic,
    FileText,
    Upload
} from "lucide-react";
import { getApiUrl } from "@/config";

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
                    <Button onClick={() => navigate("/")}>Back to Dashboard</Button>
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
                <div className="flex items-center gap-4 mb-6">
                    <Button variant="ghost" onClick={() => navigate("/")}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div className="flex-1">
                        {isEditingHeader ? (
                            <div className="flex flex-col gap-2 max-w-md">
                                <Input
                                    value={editedVisitNumber}
                                    onChange={(e) => setEditedVisitNumber(e.target.value)}
                                    placeholder="Visit Number / Patient ID"
                                    className="text-lg font-bold"
                                />
                                <div className="flex gap-2">
                                    <Input
                                        value={editedProviderName}
                                        onChange={(e) => setEditedProviderName(e.target.value)}
                                        placeholder="Doctor Name"
                                        className="w-1/2"
                                    />
                                    <Select value={editedDepartment} onValueChange={setEditedDepartment}>
                                        <SelectTrigger className="w-1/2">
                                            <SelectValue placeholder="Select Department" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {departments.map(dept => (
                                                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex gap-2 mt-2">
                                    <Button size="sm" onClick={handleSaveHeader}>Save</Button>
                                    <Button size="sm" variant="ghost" onClick={() => setIsEditingHeader(false)}>Cancel</Button>
                                </div>
                            </div>
                        ) : (
                            <div className="group cursor-pointer" onClick={() => setIsEditingHeader(true)}>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-3xl font-bold group-hover:text-primary transition-colors">{visit.visit_number}</h1>
                                    <Edit className="h-4 w-4 opacity-0 group-hover:opacity-50" />
                                </div>
                                <p className="text-muted-foreground">
                                    {visit.provider_name} • {visit.department}
                                </p>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {visit.criticality === 'Critical' && (
                            <Badge variant="destructive" className="animate-pulse">
                                Critical
                            </Badge>
                        )}
                        <Badge variant={visit.status === 'completed' ? 'default' : 'secondary'}>
                            {visit.status}
                        </Badge>
                        <div className={`text-lg font-semibold ${getConfidenceColor(visit.confidence_score)}`}>
                            {visit.confidence_score}%
                        </div>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={async () => {
                                if (confirm("Are you sure you want to delete this patient record? This action cannot be undone.")) {
                                    try {
                                        const res = await fetch(getApiUrl(`/api/visits/${id}`), { method: 'DELETE' });
                                        if (res.ok) {
                                            toast({ title: "Patient record deleted" });
                                            navigate("/");
                                        } else {
                                            throw new Error("Failed to delete");
                                        }
                                    } catch (e) {
                                        toast({ title: "Error deleting record", variant: "destructive" });
                                    }
                                }
                            }}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                        </Button>
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
                <Card className="glass-card p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-3">Chief Complaint</h2>
                    <p className="text-lg">{visit.chief_complaint || "Not specified"}</p>
                    <div className="mt-4 text-sm text-muted-foreground">
                        Provider: {visit.provider_name || "N/A"} • {new Date(visit.created_at).toLocaleString()}
                    </div>
                </Card>

                {/* Symptoms Panel */}
                <Card className="glass-card p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold">Symptoms</h2>
                        <Badge variant="outline">{symptoms.length} symptoms</Badge>
                    </div>

                    <div className="space-y-3 mb-4">
                        {symptoms.map((symptom) => (
                            <div
                                key={symptom.id}
                                className={`p-4 rounded-lg border ${symptom.confidence === 'low' ? 'bg-yellow-500/5 border-yellow-500/20' :
                                    symptom.confidence === 'high' ? 'bg-green-500/5 border-green-500/20' :
                                        'bg-muted/50'
                                    }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <p className="font-medium">{symptom.symptom_text}</p>
                                        <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                                            {symptom.severity && <span>Severity: {symptom.severity}</span>}
                                            {symptom.onset && <span>Onset: {symptom.onset}</span>}
                                            {symptom.duration && <span>Duration: {symptom.duration}</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs">
                                            {symptom.confidence_score}%
                                        </Badge>
                                        <Button
                                            variant="ghost"
                                            size="sm"
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
                        />
                        <Button onClick={addSymptom}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add
                        </Button>
                    </div>
                </Card>

                {/* Medications Panel */}
                <Card className="glass-card p-6 mb-6">
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
                                        <p className="font-medium">{med.medication_name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Duration: {med.date_prescribed} days • Source: {med.source}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Add Medication */}
                    <div className="flex gap-2 items-end">
                        <div className="flex-1">
                            <label className="text-xs text-muted-foreground mb-1 block">Medication Name</label>
                            <Input
                                placeholder="e.g. Metformin 500mg"
                                value={newMedName}
                                onChange={(e) => setNewMedName(e.target.value)}
                            />
                        </div>
                        <div className="w-1/3">
                            <label className="text-xs text-muted-foreground mb-1 block">Duration (Days)</label>
                            <div className="flex items-center">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-10 w-10 rounded-r-none"
                                    onClick={() => setNewMedDays(prev => Math.max(1, prev - 1))}
                                >
                                    -
                                </Button>
                                <div className="h-10 flex-1 flex items-center justify-center border-y border-input bg-background">
                                    {newMedDays}
                                </div>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-10 w-10 rounded-l-none"
                                    onClick={() => setNewMedDays(prev => prev + 1)}
                                >
                                    +
                                </Button>
                            </div>
                        </div>
                        <Button onClick={handleAddMedication}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add
                        </Button>
                    </div>
                </Card>

                {/* Differentials Panel */}
                <Card className="glass-card p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold">Differential Diagnoses</h2>
                        <Button onClick={generateDifferentials} variant="outline">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            {differentials.length > 0 ? 'Re-generate' : 'Generate DDX'}
                        </Button>
                    </div>

                    {differentials.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <p>No differentials generated yet</p>
                            <p className="text-sm mt-2">Click "Generate DDX" to analyze symptoms</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {differentials.map((diff) => (
                                <div key={diff.id} className="p-4 rounded-lg border bg-muted/30">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <div className="flex items-center gap-2">
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

                                    <div className="mt-2 text-xs text-muted-foreground">
                                        Generated by: {diff.generated_by}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                {/* Full Clinical Report (Extracted Text) */}
                <Card className="glass-card p-6 mb-6">
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
                                <Upload className="h-4 w-4 mr-2" />
                                Upload Document
                            </Button>
                        </div>
                    </div>
                    <div className="bg-muted/30 p-6 rounded-lg font-mono text-sm whitespace-pre-wrap leading-relaxed">
                        {visit.visit_notes || "No report text available."}
                    </div>
                </Card>

                {/* AI Clinical Analysis */}
                <Card className="glass-card p-6 mb-6">
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
                                    Generate Analysis
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

                            {/* Investigative Suggestions Table */}
                            <div>
                                <h3 className="text-lg font-medium mb-3">Investigative Suggestions</h3>
                                <div className="overflow-x-auto rounded-lg border">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                                            <tr>
                                                <th className="px-4 py-3">Test Name</th>
                                                <th className="px-4 py-3">Type</th>
                                                <th className="px-4 py-3">Ruled Out</th>
                                                <th className="px-4 py-3">Confidence</th>
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
                                                    <td className="px-4 py-3 text-muted-foreground">{item.Ruled_Out_Test || '-'}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-primary"
                                                                    style={{ width: `${item.Confidence_Score}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-xs">{item.Confidence_Score}%</span>
                                                        </div>
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
            </div>
        </div>
    );
}
