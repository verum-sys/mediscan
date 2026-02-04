import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { UserCog, Stethoscope, ChevronRight, Activity } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";

export default function Landing() {
    const navigate = useNavigate();
    // Audio removed as requested

    return (
        <div
            className="min-h-screen text-foreground flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors duration-300 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/bg-hospital.png')" }}
        >
            {/* Overlay for contrast - Darker in dark mode, lighter in light mode */}
            <div className="absolute inset-0 bg-white/40 dark:bg-black/60 backdrop-blur-sm z-0" />

            {/* Theme Toggle */}
            <div className="absolute top-6 right-6 z-50">
                <ModeToggle />
            </div>

            <div className="z-10 w-full max-w-4xl animate-in fade-in zoom-in duration-500">

                {/* Header */}
                <div className="text-center mb-16">
                    <div className="inline-flex items-center justify-center p-3 bg-emerald-500/10 rounded-2xl mb-6 shadow-glow backdrop-blur-sm border border-emerald-500/20">
                        <Activity className="w-10 h-10 text-emerald-500" />
                    </div>
                    <h1 className="text-6xl font-black tracking-tight mb-4 bg-gradient-to-br from-slate-900 via-slate-700 to-slate-500 dark:from-white dark:via-slate-200 dark:to-slate-500 bg-clip-text text-transparent drop-shadow-sm">
                        DiagNXT
                    </h1>
                    <p className="text-xl text-muted-foreground font-light tracking-wide">
                        Next Generation Clinical Intelligence Platform
                    </p>
                </div>

                {/* Role Selection Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">

                    {/* Doctor Card */}
                    <div
                        onClick={() => {
                            localStorage.setItem('userRole', 'doctor');
                            navigate('/dashboard');
                        }}
                        className="group relative cursor-pointer"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-teal-500/5 rounded-3xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <Card className="relative h-full bg-card/50 backdrop-blur-sm border-border p-8 rounded-3xl hover:border-emerald-500/50 hover:shadow-lg transition-all duration-300 group-hover:translate-y-[-5px]">
                            <div className="flex flex-col h-full items-center text-center">
                                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/50 rounded-2xl flex items-center justify-center mb-6 border border-emerald-200 dark:border-emerald-900/30 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                                    <Stethoscope className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <h2 className="text-3xl font-bold text-foreground mb-3">Doctor</h2>
                                <p className="text-muted-foreground mb-8 leading-relaxed">
                                    Access patient dashboards, clinical analysis tools, and AI-assisted diagnostics.
                                </p>
                                <div className="mt-auto flex items-center text-emerald-600 dark:text-emerald-400 font-semibold tracking-wide uppercase text-sm group-hover:gap-2 transition-all">
                                    Enter Portal <ChevronRight className="w-4 h-4 ml-1" />
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Administrator Card */}
                    <div
                        onClick={() => {
                            localStorage.setItem('userRole', 'admin');
                            navigate('/logs'); // Or keep it as /logs if that's the admin landing
                        }}
                        className="group relative cursor-pointer"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-indigo-500/5 rounded-3xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <Card className="relative h-full bg-card/50 backdrop-blur-sm border-border p-8 rounded-3xl hover:border-blue-500/50 hover:shadow-lg transition-all duration-300 group-hover:translate-y-[-5px]">
                            <div className="flex flex-col h-full items-center text-center">
                                <div className="w-20 h-20 bg-blue-100 dark:bg-blue-950/50 rounded-2xl flex items-center justify-center mb-6 border border-blue-200 dark:border-blue-900/30 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                                    <UserCog className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                                </div>
                                <h2 className="text-3xl font-bold text-foreground mb-3">Administrator</h2>
                                <p className="text-muted-foreground mb-8 leading-relaxed">
                                    Manage system logs, user permissions, and hospital configurations.
                                </p>
                                <div className="mt-auto flex items-center text-blue-600 dark:text-blue-400 font-semibold tracking-wide uppercase text-sm group-hover:gap-2 transition-all">
                                    Access Panel <ChevronRight className="w-4 h-4 ml-1" />
                                </div>
                            </div>
                        </Card>
                    </div>

                </div>

                <div className="mt-16 text-center">
                    <p className="text-muted-foreground/60 text-sm">
                        Protected Health Information System • Authorized Access Only
                    </p>
                </div>
            </div>
        </div>
    );
}
