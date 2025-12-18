import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, FileText, Sparkles, Clock, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/config";

export default function Result() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [docResult, setDocResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (location.state?.documentData) {
      const data = location.state.documentData;
      setDocResult({
        id: data.documentId,
        visitId: data.visitId, // Capture visitId
        filename: data.filename || "Scanned Document",
        raw_text: data.raw_text,
        cleaned_text: data.cleaned_text,
        processing_time_ms: data.processingTime,
        status: 'completed',
        processing_method: 'OCR'
      });
      setLoading(false);
    } else {
      loadDocument();
    }
  }, [id, location.state]);

  const loadDocument = async () => {
    try {
      const response = await fetch(getApiUrl(`/api/documents/${id}`));
      if (!response.ok) throw new Error("Failed to fetch document");
      const data = await response.json();
      setDocResult(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadText = (text: string, filename: string) => {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!docResult) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Document not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-12">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">Processing Results</h1>
            <p className="text-muted-foreground">Document: {docResult.filename}</p>
          </div>
          {docResult.visitId && (
            <Button
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg animate-in fade-in zoom-in duration-300"
              onClick={() => navigate(`/visit/${docResult.visitId}`)}
            >
              View Clinical Report
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="glass-card p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Processing Time</p>
                <p className="text-lg font-semibold">{docResult.processing_time_ms}ms</p>
              </div>
            </div>
          </Card>
          <Card className="glass-card p-4">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-success" />
              <div>
                <p className="text-sm text-muted-foreground">Method</p>
                <p className="text-lg font-semibold capitalize">{docResult.processing_method}</p>
              </div>
            </div>
          </Card>
          <Card className="glass-card p-4">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-accent" />
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-lg font-semibold capitalize">{docResult.status}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Text Comparison */}
        <Card className="glass-card shadow-large">
          <Tabs defaultValue="cleaned" className="w-full">
            <div className="border-b px-6 py-4">
              <TabsList className="w-full max-w-md">
                <TabsTrigger value="raw" className="flex-1">
                  <FileText className="w-4 h-4 mr-2" />
                  Raw Text
                </TabsTrigger>
                <TabsTrigger value="cleaned" className="flex-1">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Cleaned Text
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="raw" className="p-6">
              <div className="bg-muted/30 rounded-xl p-6 min-h-[400px] font-mono text-sm whitespace-pre-wrap">
                {docResult.raw_text || "No raw text available"}
              </div>
              <Button
                onClick={() => downloadText(docResult.raw_text, "raw-text.txt")}
                variant="outline"
                className="mt-4"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Raw
              </Button>
            </TabsContent>

            <TabsContent value="cleaned" className="p-6">
              <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl p-6 min-h-[400px] text-sm whitespace-pre-wrap">
                {docResult.cleaned_text || "No cleaned text available"}
              </div>
              <Button
                onClick={() => downloadText(docResult.cleaned_text, "cleaned-text.txt")}
                className="mt-4"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Cleaned
              </Button>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
