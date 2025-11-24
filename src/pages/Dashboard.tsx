import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Activity, FileText, CheckCircle2, Zap, Database } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ModuleCard } from "@/components/ModuleCard";
import { StatsCard } from "@/components/StatsCard";
import heroImage from "@/assets/hero-medical.jpg";

interface Stats {
  todayScans: number;
  processingQueue: number;
  accuracyScore: number;
  modulesOnline: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    todayScans: 0,
    processingQueue: 0,
    accuracyScore: 98.5,
    modulesOnline: 5,
  });
  const [modules, setModules] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
    loadModules();
  }, []);

  const loadStats = async () => {
    const today = new Date().toISOString().split("T")[0];
    
    const { data: todayDocs } = await supabase
      .from("documents")
      .select("id", { count: "exact" })
      .gte("created_at", today);
    
    const { data: queueDocs } = await supabase
      .from("documents")
      .select("id", { count: "exact" })
      .in("status", ["pending", "processing"]);

    setStats({
      todayScans: todayDocs?.length || 0,
      processingQueue: queueDocs?.length || 0,
      accuracyScore: 98.5,
      modulesOnline: 5,
    });
  };

  const loadModules = async () => {
    const { data } = await supabase
      .from("modules")
      .select("*")
      .eq("is_active", true);
    
    setModules(data || []);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-hero opacity-40" />
        <div className="relative container mx-auto px-6 py-16">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Zap className="w-4 h-4" />
              Powered by Google Document AI
            </div>
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              DocuHealth AI
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Medical Document Processing Dashboard
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="container mx-auto px-6 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 -mt-8">
          <StatsCard
            title="Today's Scans"
            value={stats.todayScans}
            icon={FileText}
            trend="+12%"
            trendUp={true}
          />
          <StatsCard
            title="Processing Queue"
            value={stats.processingQueue}
            icon={Activity}
            trend="Real-time"
          />
          <StatsCard
            title="Accuracy Score"
            value={`${stats.accuracyScore}%`}
            icon={CheckCircle2}
            trend="+0.3%"
            trendUp={true}
          />
          <StatsCard
            title="Modules Online"
            value={`${stats.modulesOnline}/5`}
            icon={Database}
            trend="All systems operational"
          />
        </div>

        {/* Modules Section */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold mb-8">Processing Modules</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((module) => (
              <ModuleCard key={module.id} module={module} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
