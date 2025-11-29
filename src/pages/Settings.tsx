import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  Database,
  Cpu,
  Sparkles,
  Bell,
  Activity,
  Monitor,
  Save
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Mock Settings State
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false
  });

  const [thresholds, setThresholds] = useState({
    riskSensitivity: 75,
    autoTriageConfidence: 85
  });

  const [display, setDisplay] = useState({
    compactView: false,
    highContrast: false
  });

  const handleSave = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      toast({
        title: "Settings Saved",
        description: "Your preferences have been updated successfully.",
      });
    }, 1000);
  };

  const connections = [
    {
      name: "Document Processing Engine",
      status: "connected",
      icon: Cpu,
      description: "Advanced OCR Engine",
    },
    {
      name: "Clinical AI Assistant",
      status: "connected",
      icon: Sparkles,
      description: "Text cleaning and structuring",
    },
    {
      name: "PostgreSQL Database",
      status: "connected",
      icon: Database,
      description: "Document metadata storage",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-12">
      <div className="container mx-auto px-6 max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Settings</h1>
            <p className="text-muted-foreground">System configuration and preferences</p>
          </div>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? <Sparkles className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </div>

        <div className="grid gap-8">
          {/* System Status */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              System Health
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              {connections.map((connection) => (
                <Card key={connection.name} className="glass-card p-4 flex flex-col justify-between gap-4">
                  <div className="flex justify-between items-start">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <connection.icon className="w-5 h-5 text-primary" />
                    </div>
                    <Badge variant={connection.status === "connected" ? "default" : "destructive"} className="capitalize">
                      {connection.status}
                    </Badge>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{connection.name}</h3>
                    <p className="text-xs text-muted-foreground">{connection.description}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Clinical Thresholds */}
            <Card className="glass-card p-6 space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-blue-500" />
                <h3 className="text-lg font-semibold">Clinical Thresholds</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Risk Score Sensitivity</span>
                    <span className="text-muted-foreground">{thresholds.riskSensitivity}%</span>
                  </div>
                  <Slider
                    value={[thresholds.riskSensitivity]}
                    onValueChange={(val) => setThresholds({ ...thresholds, riskSensitivity: val[0] })}
                    max={100}
                    step={1}
                  />
                  <p className="text-xs text-muted-foreground">Minimum score to flag a case as "Critical"</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Auto-Triage Confidence</span>
                    <span className="text-muted-foreground">{thresholds.autoTriageConfidence}%</span>
                  </div>
                  <Slider
                    value={[thresholds.autoTriageConfidence]}
                    onValueChange={(val) => setThresholds({ ...thresholds, autoTriageConfidence: val[0] })}
                    max={100}
                    step={1}
                  />
                  <p className="text-xs text-muted-foreground">Confidence required for AI-only triage</p>
                </div>
              </div>
            </Card>

            {/* Notification Preferences */}
            <Card className="glass-card p-6 space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="w-5 h-5 text-orange-500" />
                <h3 className="text-lg font-semibold">Notifications</h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium">Email Alerts</label>
                    <p className="text-xs text-muted-foreground">Receive daily summaries</p>
                  </div>
                  <Switch
                    checked={notifications.email}
                    onCheckedChange={(c) => setNotifications({ ...notifications, email: c })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium">Push Notifications</label>
                    <p className="text-xs text-muted-foreground">Real-time critical alerts</p>
                  </div>
                  <Switch
                    checked={notifications.push}
                    onCheckedChange={(c) => setNotifications({ ...notifications, push: c })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium">SMS Alerts</label>
                    <p className="text-xs text-muted-foreground">Emergency override only</p>
                  </div>
                  <Switch
                    checked={notifications.sms}
                    onCheckedChange={(c) => setNotifications({ ...notifications, sms: c })}
                  />
                </div>
              </div>
            </Card>

            {/* Display Settings */}
            <Card className="glass-card p-6 space-y-6 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Monitor className="w-5 h-5 text-purple-500" />
                <h3 className="text-lg font-semibold">Display & Accessibility</h3>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium">Compact View</label>
                    <p className="text-xs text-muted-foreground">Show more data on screen</p>
                  </div>
                  <Switch
                    checked={display.compactView}
                    onCheckedChange={(c) => setDisplay({ ...display, compactView: c })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium">High Contrast Mode</label>
                    <p className="text-xs text-muted-foreground">Increase visibility for accessibility</p>
                  </div>
                  <Switch
                    checked={display.highContrast}
                    onCheckedChange={(c) => setDisplay({ ...display, highContrast: c })}
                  />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
