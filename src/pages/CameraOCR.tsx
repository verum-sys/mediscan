import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Camera, X, Check, RefreshCw } from "lucide-react";

export default function CameraOCR() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [stream, setStream] = useState<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    const [processingStep, setProcessingStep] = useState(0);

    const processingSteps = [
        "Extracting symptoms...",
        "Identifying conditions...",
        "Suggesting investigations..."
    ];

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            setStream(mediaStream);
        } catch (error) {
            toast({
                title: "Camera Error",
                description: "Could not access camera. Please check permissions.",
                variant: "destructive"
            });
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const canvas = canvasRef.current;
            const video = videoRef.current;

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0);
                const imageData = canvas.toDataURL('image/jpeg');
                setCapturedImage(imageData);
                stopCamera();
            }
        }
    };

    const processImage = async () => {
        if (!capturedImage) return;

        setProcessing(true);
        setProcessingStep(0);

        // Animate through processing steps
        const stepInterval = setInterval(() => {
            setProcessingStep(prev => {
                if (prev >= processingSteps.length - 1) {
                    clearInterval(stepInterval);
                    return prev;
                }
                return prev + 1;
            });
        }, 1500);

        try {
            // Convert base64 to blob
            const blob = await (await fetch(capturedImage)).blob();
            const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });

            const formData = new FormData();
            formData.append('file', file);
            formData.append('moduleId', 'document_scanner');
            formData.append('useLLM', 'true');

            const response = await fetch('http://192.168.1.6:3003/process-document', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('OCR processing failed');
            }

            const data = await response.json();

            clearInterval(stepInterval);

            toast({
                title: "Processing Complete",
                description: "Document processed successfully"
            });

            // Navigate to result page
            setTimeout(() => {
                navigate(`/result/${data.documentId}`);
            }, 500);

        } catch (error) {
            clearInterval(stepInterval);
            toast({
                title: "Processing Failed",
                description: "Failed to process document",
                variant: "destructive"
            });
            setProcessing(false);
        }
    };

    const retake = () => {
        setCapturedImage(null);
        startCamera();
    };

    return (
        <div className="fixed inset-0 bg-black z-50">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/50 to-transparent">
                <div className="flex items-center justify-between">
                    <Button
                        variant="ghost"
                        className="text-white hover:bg-white/20"
                        onClick={() => {
                            stopCamera();
                            navigate("/");
                        }}
                    >
                        <X className="h-6 w-6" />
                    </Button>
                    <h1 className="text-white font-semibold text-lg">Scan Case Sheet</h1>
                    <div className="w-10" />
                </div>
            </div>

            {/* Camera/Image View */}
            <div className="h-full w-full flex items-center justify-center">
                {!stream && !capturedImage && (
                    <Card className="glass-card p-8 text-center max-w-md mx-4">
                        <Camera className="h-16 w-16 mx-auto mb-4 text-primary" />
                        <h2 className="text-2xl font-bold mb-2">Camera Access Required</h2>
                        <p className="text-muted-foreground mb-6">
                            We need camera access to scan medical documents
                        </p>
                        <Button onClick={startCamera} size="lg" className="w-full">
                            <Camera className="h-5 w-5 mr-2" />
                            Start Camera
                        </Button>
                    </Card>
                )}

                {stream && !capturedImage && (
                    <div className="relative w-full h-full">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                        />

                        {/* Guide Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="border-4 border-white/50 rounded-lg w-11/12 max-w-2xl aspect-[3/4]">
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/70 text-white text-sm px-4 py-2 rounded-full whitespace-nowrap">
                                    Position document within frame
                                </div>
                            </div>
                        </div>

                        {/* Capture Button */}
                        <div className="absolute bottom-8 left-0 right-0 flex justify-center">
                            <button
                                onClick={capturePhoto}
                                className="h-20 w-20 rounded-full bg-white border-4 border-primary shadow-lg hover:scale-110 transition-transform"
                            >
                                <div className="h-full w-full rounded-full bg-primary/20" />
                            </button>
                        </div>
                    </div>
                )}

                {capturedImage && !processing && (
                    <div className="relative w-full h-full">
                        <img
                            src={capturedImage}
                            alt="Captured"
                            className="w-full h-full object-contain"
                        />

                        <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4 px-4">
                            <Button
                                onClick={retake}
                                variant="outline"
                                size="lg"
                                className="bg-white/90 backdrop-blur"
                            >
                                <RefreshCw className="h-5 w-5 mr-2" />
                                Retake
                            </Button>
                            <Button
                                onClick={processImage}
                                size="lg"
                                className="bg-primary hover:bg-primary/90"
                            >
                                <Check className="h-5 w-5 mr-2" />
                                Process Document
                            </Button>
                        </div>
                    </div>
                )}

                {processing && (
                    <div className="relative w-full h-full bg-black/90">
                        {capturedImage && (
                            <img
                                src={capturedImage}
                                alt="Processing"
                                className="w-full h-full object-contain opacity-30"
                            />
                        )}

                        <div className="absolute inset-0 flex items-center justify-center">
                            <Card className="glass-card p-8 max-w-md mx-4 text-center">
                                <div className="mb-6">
                                    <div className="h-16 w-16 mx-auto mb-4 relative">
                                        <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
                                        <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">Processing Document</h3>
                                </div>

                                <div className="space-y-3">
                                    {processingSteps.map((step, index) => (
                                        <div
                                            key={index}
                                            className={`flex items-center gap-3 p-3 rounded-lg transition-all ${index === processingStep
                                                ? 'bg-primary/20 border border-primary/40'
                                                : index < processingStep
                                                    ? 'bg-green-500/10 border border-green-500/20'
                                                    : 'bg-muted/50'
                                                }`}
                                        >
                                            {index < processingStep ? (
                                                <Check className="h-5 w-5 text-green-500" />
                                            ) : index === processingStep ? (
                                                <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <div className="h-5 w-5 border-2 border-muted rounded-full" />
                                            )}
                                            <span className={index <= processingStep ? 'font-medium' : 'text-muted-foreground'}>
                                                {step}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </div>
                    </div>
                )}
            </div>

            {/* Hidden Canvas */}
            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
}
