import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Result from "./pages/Result";
import Logs from "./pages/Logs";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import VisitDetail from "./pages/VisitDetail";
import CameraOCR from "./pages/CameraOCR";
import Search from "./pages/Search";
import NewVisit from "./pages/NewVisit";
import DDXTool from "./pages/DDXTool";
import Triage from "./pages/Triage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/camera" element={<CameraOCR />} />
              <Route path="/search" element={<Search />} />
              <Route path="/visit/new" element={<NewVisit />} />
              <Route path="/visit/:id" element={<VisitDetail />} />
              <Route path="/ddx" element={<DDXTool />} />
              <Route path="/emergency/triage" element={<Triage />} />
              <Route path="/result/:id" element={<Result />} />
              <Route path="/logs" element={<Logs />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
