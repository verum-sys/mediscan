import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileCode, Loader2, RefreshCw } from "lucide-react";
import { getApiUrl } from "@/config";
import { FeedbackButton } from "./FeedbackButton";

interface Classification {
    id: string;
    icd_code: string;
    icd_description: string;
    snomed_code: string;
    snomed_description: string;
    confidence_score: number;
    source: 'ai' | 'manual';
    created_at: string;
}

interface ClassificationDisplayProps {
    visitId: string;
}

export function ClassificationDisplay({ visitId }: ClassificationDisplayProps) {
    const [classifications, setClassifications] = useState<Classification[]>([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);

    const loadClassifications = async () => {
        setLoading(true);
        try {
            const response = await fetch(getApiUrl(`/api/classifications/${visitId}`));
            if (response.ok) {
                const data = await response.json();
                setClassifications(data);
            }
        } catch (error) {
            console.error('Failed to load classifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateClassifications = async () => {
        setGenerating(true);
        try {
            const response = await fetch(getApiUrl(`/api/classifications/generate/${visitId}`), {
                method: 'POST'
            });

            if (response.ok) {
                const data = await response.json();
                setClassifications(data);
            }
        } catch (error) {
            console.error('Failed to generate classifications:', error);
        } finally {
            setGenerating(false);
        }
    };

    useEffect(() => {
        loadClassifications();
    }, [visitId]);

    const getConfidenceColor = (score: number) => {
        if (score >= 85) return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20';
        if (score >= 70) return 'bg-amber-500/10 text-amber-700 border-amber-500/20';
        return 'bg-red-500/10 text-red-700 border-red-500/20';
    };

    return (
        <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <FileCode className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Disease Classification</h3>
                </div>
                <div className="flex items-center gap-2">
                    {classifications.length > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={loadClassifications}
                            disabled={loading}
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    )}
                    <Button
                        onClick={generateClassifications}
                        disabled={generating}
                        size="sm"
                    >
                        {generating ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <FileCode className="h-4 w-4 mr-2" />
                                {classifications.length > 0 ? 'Regenerate' : 'Generate'} Codes
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : classifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    <FileCode className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No classifications yet.</p>
                    <p className="text-sm">Click "Generate Codes" to create ICD-10 and SNOMED CT codes.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {classifications.map((classification) => (
                        <div
                            key={classification.id}
                            className="border rounded-lg p-4 space-y-3 hover:shadow-sm transition-shadow"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge variant="outline" className="font-mono">
                                            ICD-10: {classification.icd_code}
                                        </Badge>
                                        <Badge variant="outline" className="font-mono">
                                            SNOMED: {classification.snomed_code}
                                        </Badge>
                                        <Badge
                                            className={getConfidenceColor(classification.confidence_score)}
                                        >
                                            {classification.confidence_score}% confidence
                                        </Badge>
                                    </div>

                                    <div className="space-y-1">
                                        <p className="text-sm font-medium">
                                            {classification.icd_description}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            SNOMED: {classification.snomed_description}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 mt-2">
                                        <Badge variant={classification.source === 'ai' ? 'default' : 'secondary'} className="text-xs">
                                            {classification.source === 'ai' ? 'AI Generated' : 'Manual'}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(classification.created_at).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t pt-3">
                                <FeedbackButton
                                    targetType="classification"
                                    targetId={classification.id}
                                    compact
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}
