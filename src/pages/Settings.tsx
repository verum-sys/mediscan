import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Database, Cpu, Sparkles } from "lucide-react";

export default function Settings() {
  // In a real app, these would be checked against actual connections
  const connections = [
    {
      name: "Google Document AI",
      status: "connected",
      icon: Cpu,
      description: "OCR processing engine",
    },
    {
      name: "Lovable AI (Gemini)",
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Settings</h1>
          <p className="text-muted-foreground">System configuration and connections</p>
        </div>

        {/* System Status */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">System Connections</h2>

          {connections.map((connection) => (
            <Card
              key={connection.name}
              className="glass-card shadow-soft p-6 animate-hover-lift"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <connection.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">{connection.name}</h3>
                    <p className="text-sm text-muted-foreground">{connection.description}</p>
                  </div>
                </div>
                <Badge
                  className={
                    connection.status === "connected"
                      ? "bg-success text-success-foreground"
                      : "bg-destructive text-destructive-foreground"
                  }
                >
                  {connection.status === "connected" ? (
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                  ) : (
                    <XCircle className="w-4 h-4 mr-1" />
                  )}
                  {connection.status}
                </Badge>
              </div>
            </Card>
          ))}
        </div>

        {/* Environment Info */}
        <Card className="glass-card shadow-soft p-6 mt-8">
          <h3 className="text-lg font-semibold mb-4">Environment Information</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Platform</span>
              <span className="font-medium">Lovable Cloud</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Backend</span>
              <span className="font-medium">PostgreSQL + Edge Functions</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">OCR Engine</span>
              <span className="font-medium">Google Document AI</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">LLM Model</span>
              <span className="font-medium">Gemini 2.5 Flash</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
