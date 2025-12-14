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
                {/* Header */}
                <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate("/")}
                            className="w-10 h-10 rounded-full border border-input bg-background shadow-sm shrink-0 md:bg-transparent md:border-none md:shadow-none"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            <span className="sr-only">Back</span>
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold leading-tight md:text-3xl">Integrated Disease Surveillance Dashboard (IDSD)</h1>
                            <div className="flex flex-wrap items-center gap-2 mt-2 md:mt-1">
                                <p className="text-sm text-muted-foreground">Real-time disease trends and outbreak detection</p>
                                {lastUpdated && (
                                    <Badge variant="outline" className="text-[10px] md:text-xs font-normal whitespace-nowrap bg-background/50">
                                        Updated: {lastUpdated.toLocaleTimeString()}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>
                    <Button
                        onClick={loadData}
                        disabled={loading}
                        size="sm"
                        className="w-full md:w-auto"
                    >
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
                    <Card className="p-4 md:p-6 mb-6">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                                <AlertOctagon className="h-5 w-5" />
                            </div>
                            <h3 className="text-lg font-semibold">Outbreak Detection Alerts</h3>
                        </div>
                        <div className="space-y-4">
                            {outbreaks.map((outbreak, idx) => {
                                const isUnknown = (outbreak.area && outbreak.area.toUpperCase().includes('UNKNOWN')) ||
                                    (outbreak.pincode && outbreak.pincode.toUpperCase().includes('UNKNOWN'));

                                if (isUnknown) return null;

                                return (
                                    <div
                                        key={idx}
                                        className={`border rounded-xl p-4 transition-all duration-200 hover:shadow-sm ${getSeverityColor(outbreak.severity)}`}
                                    >
                                        <div className="flex flex-col gap-3">
                                            {/* Header Row: Symptom & Severity Badge */}
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                <h4 className="font-bold text-lg tracking-tight">{outbreak.symptom}</h4>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <Badge variant={outbreak.severity === 'high' ? 'destructive' : 'default'} className="uppercase text-[10px] tracking-wider px-2 py-0.5">
                                                        {outbreak.severity} SEVERITY
                                                    </Badge>
                                                    {outbreak.severityScore && (
                                                        <Badge variant="outline" className="text-[10px] bg-background/50 backdrop-blur-sm border-current/20">
                                                            Score: {outbreak.severityScore}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Location Row */}
                                            {outbreak.area && (
                                                <div className="flex items-center text-sm font-medium opacity-90">
                                                    <MapPin className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                                                    <span>{outbreak.area}</span>
                                                    {outbreak.pincode && <span className="opacity-70 ml-1 font-normal">({outbreak.pincode})</span>}
                                                </div>
                                            )}

                                            {/* Stats Grid */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-background/40 rounded-lg text-sm border border-current/10">
                                                <div className="flex flex-col">
                                                    <span className="opacity-70 text-xs uppercase tracking-wide">Cases (24h)</span>
                                                    <span className="font-bold text-base">
                                                        {outbreak.cases} <span className="text-xs font-normal opacity-70">cases</span>
                                                    </span>
                                                    <span className="text-xs opacity-70">Baseline: {outbreak.baseline}/day</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="opacity-70 text-xs uppercase tracking-wide">Trend</span>
                                                    <div className="flex items-center font-bold text-base">
                                                        <TrendingUp className="h-3.5 w-3.5 mr-1" />
                                                        {outbreak.increase}%
                                                    </div>
                                                    <span className="text-xs opacity-70">{outbreak.trend || 'Accelerating'}</span>
                                                </div>
                                            </div>

                                            {/* Action Box */}
                                            {outbreak.recommendedAction && (
                                                <div className="text-sm p-3 bg-background/60 rounded-lg border border-current/10">
                                                    <strong className="block text-xs uppercase opacity-70 mb-1">Recommended Action</strong>
                                                    {outbreak.recommendedAction}
                                                </div>
                                            )}

                                            {/* Footer: Timestamp */}
                                            <div className="text-xs opacity-60 text-right pt-1 border-t border-current/10 mt-1">
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
