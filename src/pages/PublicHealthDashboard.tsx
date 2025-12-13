import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Activity,
    AlertTriangle,
    TrendingUp,
    Users,
    ArrowLeft,
    RefreshCw,
    Calendar,
    MapPin,
    AlertOctagon
} from "lucide-react";
import { getApiUrl } from "@/config";
import {
    Bar,
    BarChart,
    Line,
    LineChart,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from "recharts";

interface SurveillanceData {
    topSymptoms: { name: string; count: number }[];
    dailyTrends: { date: string; count: number }[];
    areaCounts: { name: string; count: number }[];
    totalVisits: number;
    criticalCases: number;
}

interface Outbreak {
    pincode?: string;
    area?: string;
    symptom: string;
    cases: number;
    baseline: number;
    increase: number;
    severity: 'low' | 'medium' | 'high';
    severityScore?: number;
    trend?: string;
    detected_at: string;
    recommendedAction?: string;
}

export default function PublicHealthDashboard() {
    const navigate = useNavigate();
    const [data, setData] = useState<SurveillanceData | null>(null);
    const [outbreaks, setOutbreaks] = useState<Outbreak[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            // Use enhanced endpoints with pincode-based clustering
            const [dataRes, outbreaksRes] = await Promise.all([
                fetch(getApiUrl('/api/surveillance/enhanced-data')),
                fetch(getApiUrl('/api/surveillance/outbreaks-by-area'))
            ]);

            if (dataRes.ok) {
                const surveillanceData = await dataRes.json();
                setData(surveillanceData);
            }

            if (outbreaksRes.ok) {
                const outbreakData = await outbreaksRes.json();
                setOutbreaks(outbreakData);
            }
        } catch (error) {
            console.error('Failed to load surveillance data:', error);
        } finally {
            setLoading(false);
            setLastUpdated(new Date());
        }
    };

    useEffect(() => {
        loadData();

        // Real-time auto-refresh every 30 seconds
        const refreshInterval = setInterval(() => {
            loadData();
        }, 30000);

        return () => clearInterval(refreshInterval);
    }, []);

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'high':
                return 'border-red-500 bg-red-500/10 text-red-700';
            case 'medium':
                return 'border-amber-500 bg-amber-500/10 text-amber-700';
            case 'low':
                return 'border-blue-500 bg-blue-500/10 text-blue-700';
            default:
                return 'border-gray-500 bg-gray-500/10 text-gray-700';
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-8">
                <div className="container mx-auto px-6 max-w-7xl">
                    <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                            <Activity className="h-12 w-12 animate-pulse mx-auto mb-4 text-primary" />
                            <p className="text-muted-foreground">Loading surveillance data...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-8">
            <div className="container mx-auto px-6 max-w-7xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" onClick={() => navigate("/")}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold">Integrated Disease Surveillance Dashboard (IDSD)</h1>
                            <div className="flex items-center gap-2">
                                <p className="text-muted-foreground">Real-time disease trends and outbreak detection</p>
                                {lastUpdated && (
                                    <Badge variant="outline" className="text-xs font-normal ml-2">
                                        Updated: {lastUpdated.toLocaleTimeString()}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>
                    <Button onClick={loadData} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh Data
                    </Button>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Visits (30d)</p>
                                <h3 className="text-3xl font-bold mt-1">{data?.totalVisits || 0}</h3>
                            </div>
                            <Users className="h-10 w-10 text-blue-500 opacity-50" />
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Critical Cases</p>
                                <h3 className="text-3xl font-bold mt-1 text-red-600">{data?.criticalCases || 0}</h3>
                            </div>
                            <AlertTriangle className="h-10 w-10 text-red-500 opacity-50" />
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Active Outbreaks</p>
                                <h3 className="text-3xl font-bold mt-1 text-amber-600">{outbreaks.length}</h3>
                            </div>
                            <AlertOctagon className="h-10 w-10 text-amber-500 opacity-50" />
                        </div>
                    </Card>
                </div>

                {/* Outbreak Alerts */}
                {outbreaks.length > 0 && (
                    <Card className="p-6 mb-6">
                        <div className="flex items-center gap-2 mb-4">
                            <AlertOctagon className="h-5 w-5 text-amber-500" />
                            <h3 className="text-lg font-semibold">Outbreak Detection Alerts</h3>
                        </div>
                        <div className="space-y-3">
                            {outbreaks.map((outbreak, idx) => {
                                // Double check filtering on frontend
                                const isUnknown = (outbreak.area && outbreak.area.toUpperCase().includes('UNKNOWN')) ||
                                    (outbreak.pincode && outbreak.pincode.toUpperCase().includes('UNKNOWN'));

                                if (isUnknown) return null;

                                return (
                                    <div
                                        key={idx}
                                        className={`border rounded-lg p-4 ${getSeverityColor(outbreak.severity)}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h4 className="font-semibold">{outbreak.symptom}</h4>
                                                    <Badge variant={outbreak.severity === 'high' ? 'destructive' : 'default'}>
                                                        {outbreak.severity.toUpperCase()} SEVERITY
                                                    </Badge>
                                                    {outbreak.severityScore && (
                                                        <Badge variant="outline" className="text-xs">
                                                            Score: {outbreak.severityScore}
                                                        </Badge>
                                                    )}
                                                </div>
                                                {outbreak.area && (
                                                    <p className="text-sm mb-1">
                                                        <MapPin className="h-3 w-3 inline mr-1" />
                                                        <span className="font-medium">{outbreak.area}</span>
                                                        {outbreak.pincode && <span className="text-muted-foreground"> (Pin: {outbreak.pincode})</span>}
                                                    </p>
                                                )}
                                                <p className="text-sm">
                                                    <span className="font-medium">{outbreak.cases} cases</span> in last 24 hours
                                                    (baseline: {outbreak.baseline}/day)
                                                </p>
                                                <p className="text-sm">
                                                    <TrendingUp className="h-4 w-4 inline mr-1" />
                                                    <span className="font-semibold">{outbreak.increase}% increase</span> above normal
                                                    {outbreak.trend && <span className="ml-2 text-muted-foreground">• {outbreak.trend}</span>}
                                                </p>
                                                {outbreak.recommendedAction && (
                                                    <p className="text-sm mt-2 p-2 bg-background/50 rounded border">
                                                        <strong>Action:</strong> {outbreak.recommendedAction}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="text-right text-sm text-muted-foreground">
                                                Detected: {new Date(outbreak.detected_at).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                )}

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Daily Trends */}
                    <Card className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Calendar className="h-5 w-5 text-primary" />
                            <h3 className="text-lg font-semibold">Daily Visit Trends (Last 7 Days)</h3>
                        </div>
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={data?.dailyTrends || []}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={formatDate}
                                    tick={{ fontSize: 12 }}
                                />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip labelFormatter={formatDate} />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="count"
                                    stroke="#3b82f6"
                                    name="Visits"
                                    strokeWidth={2}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </Card>

                    {/* Top Symptoms */}
                    <Card className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Activity className="h-5 w-5 text-primary" />
                            <h3 className="text-lg font-semibold">Top 10 Symptoms/Conditions</h3>
                        </div>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={data?.topSymptoms || []} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" tick={{ fontSize: 12 }} />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    width={150}
                                    tick={{ fontSize: 11 }}
                                />
                                <Tooltip />
                                <Bar dataKey="count" fill="#10b981" name="Count" />
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                </div>

                {/* Geographic Distribution */}
                <Card className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <MapPin className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold">Cases by Area</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {data?.areaCounts?.map((area, idx) => (
                            <div key={idx} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium">{area.name}</p>
                                        <p className="text-sm text-muted-foreground">Area</p>
                                    </div>
                                    <Badge variant="outline" className="text-lg font-bold">
                                        {area.count}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
}
