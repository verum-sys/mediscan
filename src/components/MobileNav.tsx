import { useNavigate, useLocation } from "react-router-dom";
import {
    LayoutDashboard,
    Siren,
    Upload,
    FileText,
    FileClock,
    Settings,
    ClipboardList
} from "lucide-react";

export function MobileNav() {
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        { icon: LayoutDashboard, label: "Home", path: "/" },
        { icon: Siren, label: "Triage", path: "/emergency/triage" },
        { icon: ClipboardList, label: "Intake", path: "/patient-intake" },
        { icon: Upload, label: "Scan", path: "/camera" },
        { icon: FileText, label: "DDX", path: "/ddx" },
        { icon: FileClock, label: "Logs", path: "/logs" },
        { icon: Settings, label: "Settings", path: "/settings" },
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-lg border-t border-border z-50 pb-safe">
            <div className="flex justify-around items-center h-16 px-2 overflow-x-auto no-scrollbar">
                {menuItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={`flex flex-col items-center justify-center min-w-[60px] w-full h-full space-y-1 ${isActive ? "text-primary" : "text-muted-foreground"
                                }`}
                        >
                            <item.icon className={`w-5 h-5 ${isActive ? "fill-current" : ""}`} />
                            <span className="text-[10px] font-medium truncate w-full text-center">{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
