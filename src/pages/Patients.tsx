import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Search,
    Filter,
    UserPlus,
    MoreHorizontal,
    FileText,
    Activity,
    AlertCircle,
    Clock,
    Users,
    ChevronRight,
    Phone,
    Mail
} from "lucide-react";

// Mock data to demonstrate the UI
const MOCK_PATIENTS = [
    {
        id: "PID-2024-001",
        name: "Rajesh Kumar",
        age: 45,
        gender: "M",
        contact: "+91 98765 43210",
        lastVisit: "Today, 10:30 AM",
        diagnosis: "Acute Hypertension",
        risk: "High",
        department: "Cardiology",
        vitals: { bp: "160/100", hr: "92", spo2: "98%" }
    },
    {
        id: "PID-2024-002",
        name: "Priya Sharma",
        age: 32,
        gender: "F",
        contact: "+91 98765 12345",
        lastVisit: "Yesterday",
        diagnosis: "Viral Fever",
        risk: "Low",
        department: "General Medicine",
        vitals: { bp: "120/80", hr: "78", spo2: "99%" }
    },
    {
        id: "PID-2024-003",
        name: "Amit Patel",
        age: 58,
        gender: "M",
        contact: "+91 98765 67890",
        lastVisit: "2 days ago",
        diagnosis: "Type 2 Diabetes",
        risk: "Moderate",
        department: "Endocrinology",
        vitals: { bp: "130/85", hr: "80", spo2: "97%" }
    },
    {
        id: "PID-2024-004",
        name: "Sunita Gupta",
        age: 65,
        gender: "F",
        contact: "+91 98765 98765",
        lastVisit: "1 week ago",
        diagnosis: "Osteoarthritis",
        risk: "Low",
        department: "Orthopedics",
        vitals: { bp: "125/80", hr: "72", spo2: "98%" }
    },
    {
        id: "PID-2024-005",
        name: "Vikram Singh",
        age: 28,
        gender: "M",
        contact: "+91 98765 54321",
        lastVisit: "Today, 09:15 AM",
        diagnosis: "Acute Abdominal Pain",
        risk: "Critical",
        department: "Emergency",
        vitals: { bp: "110/70", hr: "105", spo2: "96%" }
    }
];

export default function Patients() {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState("");
    const [filterRisk, setFilterRisk] = useState("All");

    const filteredPatients = MOCK_PATIENTS.filter(patient => {
        const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            patient.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRisk = filterRisk === "All" || patient.risk === filterRisk;
        return matchesSearch && matchesRisk;
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-8">
            <div className="container mx-auto px-6 max-w-7xl">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                            Patient Registry
                        </h1>
                        <p className="text-muted-foreground mt-1">Manage patient records and clinical history</p>
                    </div>
                    <Button onClick={() => navigate("/patient-intake")} className="gap-2 shadow-lg shadow-primary/20">
                        <UserPlus className="w-4 h-4" />
                        Register New Patient
                    </Button>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <Card className="glass-card p-4 flex items-center gap-4 border-l-4 border-l-blue-500">
                        <div className="p-3 bg-blue-500/10 rounded-full">
                            <Users className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Patients</p>
                            <h3 className="text-2xl font-bold">1,248</h3>
                        </div>
                    </Card>
                    <Card className="glass-card p-4 flex items-center gap-4 border-l-4 border-l-green-500">
                        <div className="p-3 bg-green-500/10 rounded-full">
                            <UserPlus className="w-6 h-6 text-green-500" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">New This Month</p>
                            <h3 className="text-2xl font-bold">+124</h3>
                        </div>
                    </Card>
                    <Card className="glass-card p-4 flex items-center gap-4 border-l-4 border-l-red-500">
                        <div className="p-3 bg-red-500/10 rounded-full">
                            <AlertCircle className="w-6 h-6 text-red-500" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Critical Watchlist</p>
                            <h3 className="text-2xl font-bold">12</h3>
                        </div>
                    </Card>
                    <Card className="glass-card p-4 flex items-center gap-4 border-l-4 border-l-purple-500">
                        <div className="p-3 bg-purple-500/10 rounded-full">
                            <Clock className="w-6 h-6 text-purple-500" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Avg Wait Time</p>
                            <h3 className="text-2xl font-bold">14m</h3>
                        </div>
                    </Card>
                </div>

                {/* Filters & Search */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name, ID, or phone..."
                            className="pl-10 bg-card/50 backdrop-blur-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                        {["All", "Critical", "High", "Moderate", "Low"].map((risk) => (
                            <Button
                                key={risk}
                                variant={filterRisk === risk ? "default" : "outline"}
                                onClick={() => setFilterRisk(risk)}
                                className="rounded-full text-xs h-9"
                            >
                                {risk}
                            </Button>
                        ))}
                        <Button variant="outline" size="icon" className="shrink-0">
                            <Filter className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Patients List */}
                <div className="grid gap-4">
                    {filteredPatients.map((patient) => (
                        <Card key={patient.id} className="glass-card p-4 hover:shadow-md transition-all group cursor-pointer border-l-4" style={{
                            borderLeftColor: patient.risk === 'Critical' ? '#ef4444' : patient.risk === 'High' ? '#f97316' : patient.risk === 'Moderate' ? '#eab308' : '#22c55e'
                        }}>
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">

                                {/* Patient Info */}
                                <div className="flex items-center gap-4 min-w-[250px]">
                                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                                        {patient.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-foreground">{patient.name}</h3>
                                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                                            {patient.id} • {patient.age}y / {patient.gender}
                                        </p>
                                    </div>
                                </div>

                                {/* Clinical Info */}
                                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                                    <div>
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Diagnosis</p>
                                        <p className="text-sm font-medium truncate">{patient.diagnosis}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Department</p>
                                        <p className="text-sm font-medium">{patient.department}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Last Visit</p>
                                        <p className="text-sm font-medium">{patient.lastVisit}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Vitals (BP/HR)</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium">{patient.vitals.bp}</span>
                                            <span className="text-xs text-muted-foreground">/ {patient.vitals.hr} bpm</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                                    <Badge variant="outline" className={`
                                ${patient.risk === 'Critical' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                            patient.risk === 'High' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                                                patient.risk === 'Moderate' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                                    'bg-green-500/10 text-green-500 border-green-500/20'}
                            `}>
                                        {patient.risk} Risk
                                    </Badge>
                                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Phone className="w-4 h-4" />
                                    </Button>
                                    <Button size="sm" variant="secondary" className="gap-1">
                                        View
                                        <ChevronRight className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
