import { useState } from "react";
import { Upload as UploadIcon, FileText, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export default function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [module, setModule] = useState<string>("");
  const [useLLM, setUseLLM] = useState(true);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || !module) {
      toast({
        title: "Missing Information",
        description: "Please select a file and module",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("moduleId", module);
      formData.append("useLLM", String(useLLM));

      // Use local server instead of Supabase Function
      const response = await fetch("http://localhost:3001/process-document", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Processing failed");
      }

      const data = await response.json();

      toast({
        title: "Processing Complete",
        description: "Document processed successfully",
      });

      if (data.visitId) {
        navigate(`/visit/${data.visitId}`);
      } else {
        navigate(`/result/${data.documentId}`);
      }
    } catch (error: any) {
      toast({
        title: "Processing Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-12">
      <div className="container mx-auto px-6 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Upload Document</h1>
          <p className="text-muted-foreground">
            Upload your medical document for AI-powered OCR processing
          </p>
        </div>

        <Card className="glass-card shadow-large p-8">
          {/* Drag & Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-border rounded-2xl p-12 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all duration-300"
          >
            <input
              type="file"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
              accept=".pdf,.png,.jpg,.jpeg"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <UploadIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              {file ? (
                <div>
                  <p className="text-lg font-medium text-foreground">{file.name}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-lg font-medium text-foreground">
                    Drop your file here or click to browse
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Supports PDF, PNG, JPG (Max 20MB)
                  </p>
                </>
              )}
            </label>
          </div>

          {/* Module Selection */}
          <div className="mt-8 space-y-6">
            <div>
              <Label htmlFor="module">Processing Module</Label>
              <Select value={module} onValueChange={setModule}>
                <SelectTrigger id="module" className="mt-2">
                  <SelectValue placeholder="Select a module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="document_scanner">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Document Scanner
                    </div>
                  </SelectItem>
                  <SelectItem value="medical_prescription">Medical Prescription</SelectItem>
                  <SelectItem value="lab_reports">Lab Reports</SelectItem>
                  <SelectItem value="opd_ipd_forms">OPD/IPD Forms</SelectItem>
                  <SelectItem value="medicine_stock">Medicine Stock</SelectItem>
                  <SelectItem value="generic_upload">Generic Upload</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* LLM Toggle */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-primary" />
                <div>
                  <Label htmlFor="llm">AI Text Cleaning</Label>
                  <p className="text-sm text-muted-foreground">
                    Clean and structure text using Gemini AI
                  </p>
                </div>
              </div>
              <Switch id="llm" checked={useLLM} onCheckedChange={setUseLLM} />
            </div>
          </div>

          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            disabled={!file || !module || processing}
            className="w-full mt-8 h-12 text-base"
            size="lg"
          >
            {processing ? "Processing..." : "Process Document"}
          </Button>
        </Card>
      </div>
    </div>
  );
}
