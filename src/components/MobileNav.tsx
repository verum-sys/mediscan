import { useNavigate, useLocation } from "react-router-dom";
import {
    LayoutDashboard,
    Siren,
    Upload,
    FileText,
    FileClock,
    Settings,
    ClipboardList,
    MoreHorizontal,
    X,
    UserCircle,
    Activity
} from "lucide-react";
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
    DrawerClose
} from "@/components/ui/drawer";
import { useState } from "react";
import { Button } from "./ui/button";

export function MobileNav() {
    const navigate = useNavigate();
    const location = useLocation();
    const [open, setOpen] = useState(false);

    const userRole = localStorage.getItem('userRole');

    const mainItems = [
        { icon: LayoutDashboard, label: "Home", path: "/" },
        { icon: Upload, label: "Scan", path: "/camera" },
        { icon: ClipboardList, label: "Intake", path: "/patient-intake" },
        { icon: Siren, label: "Triage", path: "/emergency/triage" },
    ].filter(item => {
        if (userRole === 'admin') {
            return !['Home', 'Triage', 'Scan'].includes(item.label);
        }
        return true;
    });



    const moreItems = [
        { icon: Activity, label: "IDSD", path: "/surveillance", description: "Disease Surveillance" },
        { icon: FileClock, label: "Logs", path: "/logs", description: "Audit & Activity Logs" },
        { icon: Settings, label: "Settings", path: "/settings", description: "App Configuration" },
    ].filter(item => {
        if (userRole === 'doctor') {
            return !['IDSD', 'Logs'].includes(item.label);
        }
        if (userRole === 'admin') {
            // Admin mostly needs Logs, IDSD, Settings.
            // moreItems has IDSD, Logs, Settings. 
            // We probably want to keep all of them for Admin.
            return true;
        }
        return true;
    });

    const handleNavigation = (path: string) => {
        navigate(path);
        setOpen(false);
    }

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-border z-50 pb-safe shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.1)]">
            <div className="flex justify-around items-center h-16 px-2">
                {mainItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors duration-200 ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            <div className={`p-1.5 rounded-xl transition-all duration-200 ${isActive ? "bg-primary/10" : "bg-transparent"}`}>
                                <item.icon className={`w-5 h-5 ${isActive ? "fill-current" : ""}`} />
                            </div>
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </button>
                    );
                })}

                <Drawer open={open} onOpenChange={setOpen}>
                    <DrawerTrigger asChild>
                        <button className="flex flex-col items-center justify-center w-full h-full space-y-1 text-muted-foreground hover:text-foreground transition-colors duration-200">
                            <div className="p-1.5 rounded-xl bg-transparent">
                                <MoreHorizontal className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-medium">More</span>
                        </button>
                    </DrawerTrigger>
                    <DrawerContent className="pb-8 px-4">
                        <DrawerHeader className="text-left px-0 pb-2">
                            <div className="flex items-center justify-between">
                                <DrawerTitle className="text-xl font-bold">Menu</DrawerTitle>
                                <DrawerClose asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                        <X className="h-4 w-4" />
                                    </Button>
                                </DrawerClose>
                            </div>
                        </DrawerHeader>

                        <div className="grid grid-cols-2 gap-3 mt-4">
                            {/* Profile Card (Placeholder) */}
                            <div className="col-span-2 p-3 rounded-2xl bg-muted/50 flex items-center gap-3 mb-2">
                                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                                    DR
                                </div>
                                <div>
                                    <p className="font-semibold text-sm">Dr. Varun Tyagi</p>
                                    <p className="text-xs text-muted-foreground">Chief Resident</p>
                                </div>
                            </div>

                            {moreItems.map((item) => (
                                <button
                                    key={item.path}
                                    onClick={() => handleNavigation(item.path)}
                                    className={`flex flex-col items-start p-4 rounded-xl border border-border/50 bg-card hover:bg-muted/50 transition-all active:scale-95 ${location.pathname === item.path ? "border-primary/50 bg-primary/5" : ""
                                        }`}
                                >
                                    <div className={`p-2 rounded-lg bg-background shadow-sm mb-3 ${location.pathname === item.path ? "text-primary" : "text-foreground"
                                        }`}>
                                        <item.icon className="w-5 h-5" />
                                    </div>
                                    <span className="font-semibold text-sm">{item.label}</span>
                                    <span className="text-[10px] text-muted-foreground mt-0.5 text-left">{item.description}</span>
                                </button>
                            ))}
                        </div>
                    </DrawerContent>
                </Drawer>
            </div>
        </div>
    );
}
