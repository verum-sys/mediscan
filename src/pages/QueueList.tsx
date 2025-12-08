import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    ArrowLeft,
    RefreshCw,
    Search,
    Filter,
    AlertTriangle,
    Activity,
    TrendingUp,
    Clock,
    Plus
} from "lucide-react";
import { getApiUrl } from "@/config";

interface QueueItem {
    id: string;
    visit_number: string;
    chief_complaint: string;
    facility_name: string;
    department: string;
    status: string;
    confidence_score: number;
    created_at: string;
    has_high_risk: boolean;
    has_incomplete_data: boolean;
    needs_follow_up: boolean;
    criticality?: 'Critical' | 'Stable';
}

export default function QueueList() {
    const { category } = useParams<{ category: string }>();
    const navigate = useNavigate();
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const categoryConfig = {
        critical: {
            title: "Critical Cases Queue",
            description: "High-risk patients requiring immediate attention",
            icon: AlertTriangle,
            color: "text-red-500",
            bgColor: "bg-red-500/10",
            borderColor: "border-red-500/20"
        },
        moderate: {
            title: "Moderate Risk Queue",
            description: "Patients requiring follow-up or observation",
            icon: Activity,
            color: "text-orange-500",
            bgColor: "bg-orange-500/10",
            borderColor: "border-orange-500/20"
        },
        stable: {
            title: "Stable Cases Queue",
            description: "Routine checkups and low-risk patients",
            icon: TrendingUp,
            color: "text-blue-500",
            bgColor: "bg-blue-500/10",
            borderColor: "border-blue-500/20"
        },
        incomplete: {
            title: "Incomplete Data Queue",
            description: "Cases missing vital information",
            icon: Clock,
            color: "text-yellow-500",
            bgColor: "bg-yellow-500/10",
            borderColor: "border-yellow-500/20"
        }
    };

    const config = categoryConfig[category as keyof typeof categoryConfig] || categoryConfig.stable;

    useEffect(() => {
        loadQueue();
    }, [category]);

    const loadQueue = async () => {
        setLoading(true);
        try {
            // Fetch real data
            const res = await fetch(getApiUrl('/api/queue')).catch(() => null);
            let realData: QueueItem[] = [];
            if (res && res.ok) {
                realData = await res.json();
            }

            // Mock Data Generator
            const generateMockCases = (count: number, type: 'critical' | 'moderate' | 'stable' | 'incomplete'): QueueItem[] => {
                return Array.from({ length: count }).map((_, i) => {
                    const id = `mock-${type}-${i + 1}`;
                    const num = (i + 1).toString().padStart(3, '0');

                    let baseItem = {
                        id,
                        visit_number: `VS-2024-${type.toUpperCase().slice(0, 1)}${num}`,
                        created_at: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(), // Last 7 days
                        facility_name: ['General Ward', 'Emergency', 'OPD 1', 'OPD 2', 'Trauma Center'][Math.floor(Math.random() * 5)],
                        confidence_score: 85 + Math.floor(Math.random() * 15),
                    };

                    if (type === 'critical') {
                        return {
                            ...baseItem,
                            chief_complaint: ['Acute Chest Pain', 'Severe Head Trauma', 'Difficulty Breathing', 'Unconscious', 'Severe Burn'][Math.floor(Math.random() * 5)],
                            department: ['Cardiology', 'Neurology', 'Emergency', 'Trauma'][Math.floor(Math.random() * 4)],
                            status: 'waiting',
                            has_high_risk: true,
                            criticality: 'Critical',
                            has_incomplete_data: false,
                            needs_follow_up: false
                        };
                    } else if (type === 'moderate') {
                        return {
                            ...baseItem,
                            chief_complaint: ['High Fever', 'Persistent Cough', 'Abdominal Pain', 'Migraine', 'Fracture'][Math.floor(Math.random() * 5)],
                            department: ['General Medicine', 'Orthopedics', 'Gastroenterology'][Math.floor(Math.random() * 3)],
                            status: 'in_progress',
                            has_high_risk: false,
                            has_incomplete_data: false,
                            needs_follow_up: true
                        };
                    } else if (type === 'incomplete') {
                        return {
                            ...baseItem,
                            chief_complaint: 'Unknown - Data Missing',
                            department: 'Triage',
                            status: 'waiting',
                            confidence_score: 45,
                            has_high_risk: false,
                            has_incomplete_data: true,
                            needs_follow_up: true
                        };
                    } else { // stable
                        return {
                            ...baseItem,
                            chief_complaint: ['Routine Checkup', 'Mild Rash', 'Vaccination', 'Follow-up', 'Sore Throat'][Math.floor(Math.random() * 5)],
                            department: ['General Medicine', 'Dermatology', 'Pediatrics', 'ENT'][Math.floor(Math.random() * 4)],
                            status: 'completed',
                            has_high_risk: false,
                            has_incomplete_data: false,
                            needs_follow_up: false
                        };
                    }
                });
            };

            const mockData: QueueItem[] = [
                ...generateMockCases(12, 'critical'),
                ...generateMockCases(45, 'moderate'),
                ...generateMockCases(85, 'stable'),
                ...generateMockCases(5, 'incomplete')
            ];

            // Combine and Filter
            const allData = [...realData, ...mockData];
            const filtered = allData.filter(item => {
                if (category === 'critical') return item.has_high_risk || item.criticality === 'Critical';
                if (category === 'moderate') return item.needs_follow_up && !item.has_high_risk;
                if (category === 'stable') return !item.has_high_risk && !item.needs_follow_up && !item.has_incomplete_data;
                if (category === 'incomplete') return item.has_incomplete_data;
                return true;
            });

            // Remove duplicates by ID
            const uniqueQueue = Array.from(new Map(filtered.map(item => [item.id, item])).values());

            setQueue(uniqueQueue);
        } catch (error) {
            console.error("Failed to load queue", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredQueue = queue.filter(item =>
        item.visit_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.chief_complaint.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.department.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="container mx-auto max-w-7xl">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Button variant="ghost" onClick={() => navigate("/")}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Dashboard
                    </Button>
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${config.bgColor}`}>
                                <config.icon className={`h-6 w-6 ${config.color}`} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">{config.title}</h1>
                                <p className="text-muted-foreground">{config.description}</p>
                            </div>
                        </div>
                    </div>
                    <Button onClick={() => navigate("/upload")}>
                        <Plus className="h-4 w-4 mr-2" />
                        New Case
                    </Button>
                </div>

                {/* Filters & Search */}
                <div className="flex gap-4 mb-6">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by ID, symptoms, or department..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" onClick={loadQueue}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </div>

                {/* Queue List */}
                {loading ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                        <p>Loading queue...</p>
                    </div>
                ) : filteredQueue.length === 0 ? (
                    <Card className="p-12 text-center text-muted-foreground border-dashed">
                        <config.icon className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <h3 className="text-lg font-semibold mb-2">No cases found</h3>
                        <p>This queue is currently empty.</p>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {filteredQueue.map((item) => (
                            <Card key={item.id} className="p-4 hover:shadow-md transition-all border-l-4" style={{ borderLeftColor: category === 'critical' ? '#ef4444' : category === 'moderate' ? '#f97316' : category === 'incomplete' ? '#eab308' : '#3b82f6' }}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center font-bold text-xs">
                                            {item.visit_number.split('-').pop()}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-lg">{item.visit_number}</h3>
                                                <Badge variant="outline" className="text-xs">{item.department}</Badge>
                                                {item.criticality === 'Critical' && (
                                                    <Badge variant="destructive" className="animate-pulse">Critical</Badge>
                                                )}
                                            </div>
                                            <p className="font-medium">{item.chief_complaint}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {item.facility_name} • {new Date(item.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="text-xs text-muted-foreground uppercase font-bold">Confidence</p>
                                            <div className="flex items-center justify-end gap-2">
                                                <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${item.confidence_score >= 80 ? 'bg-green-500' : 'bg-yellow-500'}`}
                                                        style={{ width: `${item.confidence_score}%` }}
                                                    />
                                                </div>
                                                <span className="font-bold text-sm">{item.confidence_score}%</span>
                                            </div>
                                        </div>
                                        <Button onClick={() => navigate(`/visit/${item.id}`)}>
                                            View Details
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
