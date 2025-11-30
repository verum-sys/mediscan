import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  Search,
  Stethoscope,
  AlertTriangle,
  Clock,
  Activity,
  TrendingUp,
  RefreshCw,
  Bell
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

const ArticleCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const articles = [
    {
      title: "New AI Model Predicts Sepsis Onset Hours in Advance",
      source: "Nature Medicine",
      date: "2 hours ago",
      category: "Research",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=2070",
      summary: "A groundbreaking study demonstrates how deep learning algorithms can identify early biomarkers of sepsis up to 12 hours before clinical symptoms appear, potentially saving millions of lives annually."
    },
    {
      title: "Breakthrough in Non-Invasive Glucose Monitoring",
      source: "PubMed Central",
      date: "5 hours ago",
      category: "Technology",
      color: "text-green-500",
      bg: "bg-green-500/10",
      image: "https://images.unsplash.com/photo-1576091160550-2187d80a16f3?auto=format&fit=crop&q=80&w=2070",
      summary: "Researchers have developed a wearable sensor that uses optical spectroscopy to measure blood glucose levels with 95% accuracy, eliminating the need for finger-prick testing for diabetic patients."
    },
    {
      title: "Global Guidelines Updated for Hypertension Management",
      source: "WHO News",
      date: "1 day ago",
      category: "Policy",
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      image: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&q=80&w=2070",
      summary: "The World Health Organization has released new protocols emphasizing lower threshold targets for blood pressure control in high-risk populations, citing recent multi-center clinical trial data."
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % articles.length);
    }, 8000); // Increased duration for reading
    return () => clearInterval(timer);
  }, []);

  const article = articles[currentIndex];

  return (
    <Card className="glass-card overflow-hidden relative h-full group cursor-pointer border-0">
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
        style={{ backgroundImage: `url(${article.image})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent" />

      <div className="relative h-full flex flex-col justify-end p-6 text-white">
        <div className="flex justify-between items-start mb-3">
          <Badge variant="secondary" className="bg-white/20 text-white border-0 backdrop-blur-md">
            {article.category}
          </Badge>
          <span className="text-xs text-gray-300 bg-black/30 px-2 py-1 rounded-full backdrop-blur-md">
            {article.date}
          </span>
        </div>

        <h3 className="font-bold text-xl mb-3 leading-tight">
          {article.title}
        </h3>

        <p className="text-sm text-gray-300 mb-4 line-clamp-3 leading-relaxed opacity-90">
          {article.summary}
        </p>

        <div className="flex items-center justify-between mt-auto">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
            {article.source}
          </p>
          <div className="flex gap-1.5">
            {articles.map((_, idx) => (
              <div
                key={idx}
                className={`h-1 rounded-full transition-all duration-300 ${idx === currentIndex ? "w-6 bg-white" : "w-1.5 bg-white/30"
                  }`}
              />
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

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
      description: "Instant case creation",
      onClick: () => navigate("/camera"),
      color: "#795548" // Brown
    },
    {
      icon: Stethoscope,
      label: "Start Differential Diagnosis",
      description: "Symptom -> Top 5 DDX with reasoning",
      onClick: () => navigate("/ddx"),
      color: "#6366f1" // Indigo
    },
    {
      icon: Search,
      label: "Search / Retrieve Patient",
      description: "OPD-IPD & historical case lookup",
      onClick: () => navigate("/search"),
      color: "#14b8a6" // Teal
    }
  ];

  // Derived stats for UI matching
  const critical = stats.highRisk;
  const moderate = stats.followUp;
  const incomplete = stats.incompleteData;
  const stable = Math.max(0, stats.todayTotal - (critical + moderate + incomplete));

  return (
    <div className="min-h-screen overflow-auto bg-background text-foreground font-sans transition-colors duration-300 flex flex-col">
      <div className="container mx-auto px-6 py-4 max-w-7xl flex flex-col gap-4">

        {/* Section 1: Header Area */}
        <div className="flex flex-row justify-between items-center shrink-0 order-1 md:order-none">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent leading-tight">
              DiagNXT
            </h1>
            <p className="text-muted-foreground font-medium text-xs">Clinical Intelligence Co-Pilot</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-6 bg-card border border-border px-4 py-2 rounded-lg shadow-sm">
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Avg Response Time</p>
                <div className="flex items-center justify-end gap-2">
                  <Clock className="w-3 h-3 text-emerald-500" />
                  <p className="text-sm font-bold text-foreground">3 mins</p>
                </div>
              </div>
              <div className="hidden md:block h-6 w-[1px] bg-border"></div>
              <div className="hidden md:block text-right">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Model Confidence</p>
                <div className="flex items-center justify-end gap-2">
                  <Activity className="w-3 h-3 text-blue-500" />
                  <p className="text-sm font-bold text-foreground">97%</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Status Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0 order-2 md:order-none">
          <Card className="bg-[#ef4444] border-none p-3 hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-1">
              <h3 className="text-white font-semibold text-xs">Critical Cases</h3>
              <AlertTriangle className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="text-2xl font-bold text-white mb-1.5">{critical}</div>
            <Button variant="secondary" className="w-full bg-white hover:bg-white/90 text-[#ef4444] text-[10px] h-5 border-0">
              View Critical Queue
            </Button>
          </Card>

          <Card className="bg-[#f97316] border-none p-3 hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-1">
              <h3 className="text-white font-semibold text-xs">Moderate Risk</h3>
              <Activity className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="text-2xl font-bold text-white mb-1.5">{moderate}</div>
            <Button variant="secondary" className="w-full bg-white hover:bg-white/90 text-[#f97316] text-[10px] h-5 border-0">
              Review Cases
            </Button>
          </Card>

          <Card className="bg-[#3b82f6] border-none p-3 hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-1">
              <h3 className="text-white font-semibold text-xs">Stable / Low Risk</h3>
              <TrendingUp className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="text-2xl font-bold text-white mb-1.5">{stable}</div>
            <Button variant="secondary" className="w-full bg-white hover:bg-white/90 text-[#3b82f6] text-[10px] h-5 border-0">
              View Queue
            </Button>
          </Card>

          <Card className="bg-[#eab308] border-none p-3 hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-1">
              <h3 className="text-white font-semibold text-xs">Incomplete Data</h3>
              <Clock className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="text-2xl font-bold text-white mb-1.5">{incomplete}</div>
            <Button variant="secondary" className="w-full bg-white hover:bg-white/90 text-[#eab308] text-[10px] h-5 border-0">
              Fix Now
            </Button>
          </Card>
        </div>

        {/* Section 3: Split Middle Section */}
        <div className="contents md:grid md:grid-cols-2 gap-4 shrink-0 md:h-[280px]">
          {/* Left Column: Triage Snapshot */}
          <Card className="bg-card border-border p-5 flex flex-col items-center justify-center h-full shadow-sm order-3 md:order-none">
            <div className="w-full flex justify-between items-center mb-4 border-b border-border pb-3">
              <h3 className="text-lg font-semibold text-foreground">Today's Triage Snapshot</h3>
              <Badge variant="outline" className="text-xs h-6">Live Data</Badge>
            </div>
            <div className="flex flex-row items-center gap-8 w-full justify-center h-full">
              <div className="relative h-40 w-40 rounded-full shadow-xl ring-4 ring-background shrink-0" style={{
                background: `conic-gradient(
                                #ef4444 0% ${critical / (stats.todayTotal || 1) * 100}%, 
                                #f97316 ${critical / (stats.todayTotal || 1) * 100}% ${(critical + moderate) / (stats.todayTotal || 1) * 100}%, 
                                #3b82f6 ${(critical + moderate) / (stats.todayTotal || 1) * 100}% ${(critical + moderate + stable) / (stats.todayTotal || 1) * 100}%,
                                #eab308 ${(critical + moderate + stable) / (stats.todayTotal || 1) * 100}% 100%
                            )`
              }}>
                <div className="absolute inset-4 bg-card rounded-full flex items-center justify-center flex-col shadow-inner">
                  <span className="text-3xl font-bold text-foreground">{stats.todayTotal}</span>
                  <span className="text-xs text-muted-foreground uppercase font-medium">Total</span>
                </div>
              </div>
              <div className="flex flex-col gap-3 text-sm min-w-[140px]">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-red-500 rounded-full shadow-sm"></div><span className="text-muted-foreground font-medium">Critical</span></div>
                  <span className="font-bold text-foreground text-base">{critical}</span>
                </div>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-orange-500 rounded-full shadow-sm"></div><span className="text-muted-foreground font-medium">Moderate</span></div>
                  <span className="font-bold text-foreground text-base">{moderate}</span>
                </div>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow-sm"></div><span className="text-muted-foreground font-medium">Stable</span></div>
                  <span className="font-bold text-foreground text-base">{stable}</span>
                </div>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-yellow-500 rounded-full shadow-sm"></div><span className="text-muted-foreground font-medium">Pending</span></div>
                  <span className="font-bold text-foreground text-base">{incomplete}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Right Column: Live Medical Feed Widget */}
          <div className="flex flex-col h-full overflow-hidden order-5 md:order-none min-h-[300px] md:min-h-0">
            <div className="flex-1 overflow-hidden h-full">
              <ArticleCarousel />
            </div>
          </div>
        </div>

        {/* Section 4: Action Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 shrink-0 order-4 md:order-none">
          {quickActions.map((action, index) => (
            <Card
              key={index}
              className="border-none p-4 cursor-pointer hover:scale-[1.02] hover:shadow-lg transition-all duration-300 group relative overflow-hidden"
              style={{ backgroundColor: action.color }}
              onClick={action.onClick}
            >
              <div className="flex flex-col h-full justify-between relative z-10 gap-2">
                <div className="flex items-start justify-between">
                  <div className="p-2 rounded-lg bg-white shadow-sm">
                    <action.icon className="w-5 h-5" style={{ color: action.color }} />
                  </div>
                  <Badge variant="secondary" className="bg-white/20 backdrop-blur-md text-white border-0 text-[10px] h-5">Action</Badge>
                </div>
                <div>
                  <h3 className="font-bold text-base text-white mb-0.5">{action.label}</h3>
                  <p className="text-xs text-white/80 font-medium line-clamp-1">{action.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Section 5: Patient Table */}
        <div className="flex-1 min-h-0 flex flex-col gap-2 order-6 md:order-none">
          <div className="flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-lg font-bold text-foreground">Continue where you left off</h2>
            </div>
            <Button variant="outline" size="sm" onClick={loadDashboardData} className="gap-2 h-7 text-xs">
              <RefreshCw className="h-3 w-3" /> Refresh
            </Button>
          </div>

          {loading ? (
            <Card className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-card">
              <RefreshCw className="h-6 w-6 animate-spin mb-2" />
              <p className="text-sm">Loading patient queue...</p>
            </Card>
          ) : queue.length === 0 ? (
            <Card className="flex-1 flex items-center justify-center text-center text-muted-foreground bg-card">
              <p className="text-sm">No active visits found for today.</p>
            </Card>
          ) : (
            <div className="border border-border rounded-xl overflow-auto bg-card shadow-sm h-[400px] md:h-[500px] min-h-[300px]">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-xs">Patient ID</th>
                    <th className="px-4 py-3 text-xs">Complaints</th>
                    <th className="px-4 py-3 text-xs">Risk Assessment</th>
                    <th className="px-4 py-3 text-xs">AI Confidence</th>
                    <th className="px-4 py-3 text-xs text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {queue.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/50 transition-colors group">
                      <td className="px-4 py-2 font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px]">
                            {item.visit_number.slice(0, 2)}
                          </div>
                          <span className="text-xs">{item.visit_number}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground font-medium text-xs">{item.chief_complaint}</td>
                      <td className="px-4 py-2">
                        {item.has_high_risk ? (
                          <Badge variant="destructive" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-100 border-0 text-[10px] h-5">
                            Critical
                          </Badge>
                        ) : item.needs_follow_up ? (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 hover:bg-orange-100 border-0 text-[10px] h-5">
                            Moderate
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800 text-[10px] h-5">
                            Stable
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${item.confidence_score >= 80 ? 'bg-emerald-500' : 'bg-yellow-500'}`}
                              style={{ width: `${item.confidence_score}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-muted-foreground">{item.confidence_score}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                          onClick={() => navigate(`/visit/${item.id}`)}
                        >
                          Open
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
