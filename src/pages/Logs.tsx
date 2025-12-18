import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, Clock, Bed } from "lucide-react";
import { formatDistance } from "date-fns";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getApiUrl } from "@/config";

export default function Logs() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({ todayTotal: 0, highRisk: 0, incompleteData: 0, followUp: 0, opdToIpdCount: 0 });
  const [analytics, setAnalytics] = useState<any>({ monthly: [], yearly: [], daily: [], doctor: [] });

  useEffect(() => {
    loadLogs();
    loadStats();
    loadAnalytics();
  }, []);

  const loadStats = async () => {
    try {
      const res = await fetch(getApiUrl('/api/stats'));
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const loadAnalytics = async () => {
    try {
      const res = await fetch(getApiUrl('/api/analytics'));
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error("Error loading analytics:", error);
    }
  };

  const loadLogs = async () => {
    try {
      const res = await fetch(getApiUrl('/api/audit-logs'));
      let realLogs = [];
      if (res.ok) {
        realLogs = await res.json();
      }

      // MOCK LOGS for Demo (keep mocks if DB is empty for demo purposes)
      const MOCK_LOGS = [
        { id: 'm1', file_name: 'patient_scan_402.pdf', status: 'completed', created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(), elapsed_ms: 1240 },
        { id: 'm2', file_name: 'lab_report_blood_work.jpg', status: 'completed', created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(), elapsed_ms: 850 },
        { id: 'm3', file_name: 'xray_chest_pa.png', status: 'processing', created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(), elapsed_ms: null },
      ];

      // Combine real logs with mock logs (real first)
      // If we have real logs, maybe we don't prefer mocks, but let's keep them for density if needed
      setLogs(realLogs.length > 0 ? realLogs : [...realLogs, ...MOCK_LOGS]);

    } catch (error) {
      console.error("Error loading logs:", error);
      // Fallback to mocks on error
      setLogs([
        { id: 'm1', file_name: 'patient_scan_402.pdf', status: 'completed', created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(), elapsed_ms: 1240 },
        { id: 'm2', file_name: 'lab_report_blood_work.jpg', status: 'completed', created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(), elapsed_ms: 850 },
        { id: 'm3', file_name: 'xray_chest_pa.png', status: 'processing', created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(), elapsed_ms: null },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(
    (log) =>
      log.file_name?.toLowerCase().includes(search.toLowerCase()) ||
      log.status?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-success text-success-foreground";
      case "failed":
        return "bg-destructive text-destructive-foreground";
      case "processing":
        return "bg-warning text-warning-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const ChartSection = ({ data, title, color }: { data: any[], title: string, color: string }) => (
    <Card className="glass-card p-6 h-[400px]">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
          <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
          <Tooltip
            contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
            cursor={{ fill: 'transparent' }}
          />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );

  const stableCases = Math.max(0, stats.todayTotal - (stats.highRisk + stats.incompleteData + stats.followUp));

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-12">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 md:mb-4">Audit Logs & Analytics</h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Complete history and statistical breakdown
            </p>
          </div>
          <Card className="glass-card p-4 flex items-center justify-between gap-4 bg-primary/5 border-primary/20 w-full md:w-auto">
            <div>
              <p className="text-sm text-muted-foreground">Today's Total</p>
              <h3 className="text-2xl font-bold">{logs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length}</h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
          </Card>
        </div>

        {/* Moved Stats from Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card
            className="glass-card p-6 border-red-500/20 cursor-pointer hover:bg-red-500/5 transition-colors"
            onClick={() => navigate('/queue/critical')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Critical Cases</p>
                <h3 className="text-3xl font-bold text-red-500">{stats.highRisk}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-red-500" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-red-500">
              <span>Requires attention</span>
            </div>
          </Card>

          <Card
            className="glass-card p-6 border-yellow-500/20 cursor-pointer hover:bg-yellow-500/5 transition-colors"
            onClick={() => navigate('/queue/incomplete')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Incomplete Data</p>
                <h3 className="text-3xl font-bold text-yellow-500">{stats.incompleteData}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-500" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-yellow-500">
              <span>Needs review</span>
            </div>
          </Card>

          <Card
            className="glass-card p-6 border-purple-500/20 cursor-pointer hover:bg-purple-500/5 transition-colors"
            onClick={() => navigate('/queue/moderate')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Moderate Risk</p>
                <h3 className="text-3xl font-bold text-purple-500">{stats.followUp}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-purple-500" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-purple-500">
              <span>View List →</span>
            </div>
          </Card>

          <Card
            className="glass-card p-6 border-blue-500/20 cursor-pointer hover:bg-blue-500/5 transition-colors"
            onClick={() => navigate('/queue/stable')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Stable Cases</p>
                <h3 className="text-3xl font-bold text-blue-500">{stableCases}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-500" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-blue-500">
              <span>Safe</span>
            </div>
          </Card>

          <Card
            className="glass-card p-6 border-blue-500/20 cursor-pointer hover:bg-blue-500/5 transition-colors"
            onClick={() => navigate('/queue/ipd')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">IPD Admissions</p>
                <h3 className="text-3xl font-bold text-blue-500">{stats.opdToIpdCount || 0}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Bed className="h-6 w-6 text-blue-500" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-blue-500">
              <span>View List →</span>
            </div>
          </Card>
        </div>

        {/* Analytics Tabs */}
        <div className="mb-8">
          <Tabs defaultValue="monthly" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-4 gap-2 h-auto">
              <TabsTrigger value="monthly">Monthly Wise</TabsTrigger>
              <TabsTrigger value="yearly">Yearly Wise</TabsTrigger>
              <TabsTrigger value="daily">Day Wise</TabsTrigger>
              <TabsTrigger value="doctor">Doctor Wise</TabsTrigger>
            </TabsList>
            <TabsContent value="monthly">
              <ChartSection data={analytics.monthly} title="Monthly Visits" color="#3b82f6" />
            </TabsContent>
            <TabsContent value="yearly">
              <ChartSection data={analytics.yearly} title="Yearly Visits" color="#10b981" />
            </TabsContent>
            <TabsContent value="daily">
              <ChartSection data={analytics.daily} title="Daily Visits (Last 7 Days)" color="#f59e0b" />
            </TabsContent>
            <TabsContent value="doctor">
              <ChartSection data={analytics.doctor} title="Visits by Doctor" color="#8b5cf6" />
            </TabsContent>
          </Tabs>
        </div>

        {/* Search */}
        <Card className="glass-card p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search by filename or status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </Card>

        {/* Logs List (Mobile Cards) */}
        <div className="md:hidden space-y-4">
          {loading ? (
            <p className="text-center text-muted-foreground">Loading...</p>
          ) : filteredLogs.length === 0 ? (
            <p className="text-center text-muted-foreground">No logs found</p>
          ) : (
            filteredLogs.map((log) => (
              <Card key={log.id} className="glass-card p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-sm truncate max-w-[200px]">{log.file_name}</span>
                  </div>
                  <Badge className={getStatusColor(log.status)} variant="secondary">
                    {log.status}
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-xs text-muted-foreground mt-3">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDistance(new Date(log.created_at), new Date(), { addSuffix: true })}
                  </div>
                  <span>{log.elapsed_ms ? `${log.elapsed_ms}ms` : "-"}</span>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Logs Table (Desktop) */}
        <Card className="glass-card shadow-large overflow-hidden hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">File Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Time</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Duration</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                      Loading...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                      No logs found
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, index) => (
                    <tr
                      key={log.id}
                      className={`border-t border-border/50 hover:bg-muted/30 transition-colors ${index % 2 === 0 ? "bg-muted/10" : ""
                        }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{log.file_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={getStatusColor(log.status)} variant="secondary">
                          {log.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          {formatDistance(new Date(log.created_at), new Date(), {
                            addSuffix: true,
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {log.elapsed_ms ? `${log.elapsed_ms}ms` : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
