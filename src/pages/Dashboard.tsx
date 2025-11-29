import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  Search,
  UserPlus,
  Stethoscope,
  AlertTriangle,
  Clock,
  Activity,
  TrendingUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
}

interface Stats {
  todayTotal: number;
  highRisk: number;
  incompleteData: number;
  followUp: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState<Stats>({ todayTotal: 0, highRisk: 0, incompleteData: 0, followUp: 0 });
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsRes, queueRes] = await Promise.all([
        fetch('http://192.168.1.6:3003/api/stats'),
        fetch('http://192.168.1.6:3003/api/queue')
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (queueRes.ok) {
        const queueData = await queueRes.json();
        setQueue(queueData);
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      icon: Camera,
      label: "Scan Case Sheet",
      description: "Quick camera OCR",
      onClick: () => navigate("/camera"),
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: Search,
      label: "Search Symptoms",
      description: "Quick search",
      onClick: () => navigate("/search"),
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: UserPlus,
      label: "New Visit",
      description: "Manual entry",
      onClick: () => navigate("/visit/new"),
      gradient: "from-green-500 to-emerald-500"
    },
    {
      icon: Stethoscope,
      label: "Differential Diagnosis",
      description: "DDX tool",
      onClick: () => navigate("/ddx"),
      gradient: "from-orange-500 to-red-500"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-8">
      <div className="container mx-auto px-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            DiagNXT
          </h1>
          <p className="text-muted-foreground">Today's patient queue and quick actions</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="glass-card p-6 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Today's Total</p>
                <h3 className="text-3xl font-bold">{stats.todayTotal}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Activity className="h-6 w-6 text-blue-500" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-500">Visits</span>
            </div>
          </Card>

          <Card className="glass-card p-6 hover:shadow-lg transition-all duration-300 border-red-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">High Risk</p>
                <h3 className="text-3xl font-bold text-red-500">{stats.highRisk}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-red-500">
              <span>Requires attention</span>
            </div>
          </Card>

          <Card className="glass-card p-6 hover:shadow-lg transition-all duration-300 border-yellow-500/20">
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

          <Card className="glass-card p-6 hover:shadow-lg transition-all duration-300 border-purple-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Follow-up</p>
                <h3 className="text-3xl font-bold text-purple-500">{stats.followUp}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Stethoscope className="h-6 w-6 text-purple-500" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-purple-500">
              <span>Pending</span>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <Card
                key={index}
                className="glass-card p-6 cursor-pointer hover:scale-105 transition-all duration-300 group"
                onClick={action.onClick}
              >
                <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${action.gradient} p-3 mb-4 group-hover:scale-110 transition-transform`}>
                  <action.icon className="h-full w-full text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-1">{action.label}</h3>
                <p className="text-sm text-muted-foreground">{action.description}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* OPD Queue */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Today's OPD Queue</h2>
            <Button variant="outline" onClick={loadDashboardData}>
              Refresh
            </Button>
          </div>

          {loading ? (
            <Card className="glass-card p-8 text-center">
              <p className="text-muted-foreground">Loading queue...</p>
            </Card>
          ) : queue.length === 0 ? (
            <Card className="glass-card p-8 text-center">
              <p className="text-muted-foreground">No visits for today yet</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {queue.map((item) => (
                <Card
                  key={item.id}
                  className="glass-card p-4 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => navigate(`/visit/${item.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{item.visit_number}</h3>
                        <div className="flex gap-2">
                          {item.has_high_risk && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              High Risk
                            </Badge>
                          )}
                          {item.has_incomplete_data && (
                            <Badge variant="secondary" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                              <Clock className="h-3 w-3 mr-1" />
                              Incomplete
                            </Badge>
                          )}
                          {item.needs_follow_up && (
                            <Badge variant="outline" className="text-xs">
                              Follow-Up
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">Chief Complaint:</span> {item.chief_complaint || 'Not specified'}
                        </div>
                        <div>
                          <span className="font-medium">Facility:</span> {item.facility_name || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Department:</span> {item.department || 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-sm text-muted-foreground">
                        {new Date(item.created_at).toLocaleTimeString()}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-muted-foreground">Confidence:</div>
                        <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full ${item.confidence_score >= 80
                              ? 'bg-green-500'
                              : item.confidence_score >= 50
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                              }`}
                            style={{ width: `${item.confidence_score || 0}%` }}
                          />
                        </div>
                        <div className="text-xs font-medium">{item.confidence_score || 0}%</div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
