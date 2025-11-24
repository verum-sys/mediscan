import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon, FileText, ClipboardList, TestTube, Pill, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ModuleCardProps {
  module: {
    id: string;
    name: string;
    description: string;
    icon: string;
    is_active: boolean;
  };
}

const iconMap: Record<string, LucideIcon> = {
  FileText,
  ClipboardList,
  TestTube,
  Pill,
  Upload,
};

export function ModuleCard({ module }: ModuleCardProps) {
  const navigate = useNavigate();
  const Icon = iconMap[module.icon] || FileText;

  return (
    <Card className="glass-card shadow-soft p-6 animate-hover-lift group cursor-pointer">
      <div
        className="flex flex-col h-full"
        onClick={() => navigate("/upload")}
      >
        <div className="mb-4 p-4 rounded-2xl bg-gradient-hero w-fit group-hover:glow-primary transition-all duration-300">
          <Icon className="w-8 h-8 text-white" />
        </div>
        
        <h3 className="text-xl font-bold mb-2 capitalize">
          {module.name.replace(/_/g, " ")}
        </h3>
        
        <p className="text-muted-foreground text-sm mb-4 flex-1">
          {module.description}
        </p>
        
        <Button
          variant="outline"
          className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
        >
          Process Document
        </Button>
      </div>
    </Card>
  );
}
