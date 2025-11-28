import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, UserPlus } from "lucide-react";

export default function NewVisit() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [creating, setCreating] = useState(false);

    const [formData, setFormData] = useState({
        facilityName: "",
        department: "",
        providerName: "",
        chiefComplaint: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);

        try {
            const response = await fetch('http://localhost:3001/api/visits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    sourceType: 'manual',
                    confidenceScore: 100
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || errorData.message || 'Failed to create visit');
            }

            const visit = await response.json();

            toast({
                title: "Visit Created",
                description: `Visit ${visit.visit_number} created successfully`
            });

            // Navigate to visit detail
            navigate(`/visit/${visit.id}`);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to create visit",
                variant: "destructive"
            });
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-8">
            <div className="container mx-auto px-6 max-w-3xl">
                <div className="flex items-center gap-4 mb-6">
                    <Button variant="ghost" onClick={() => navigate("/")}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold">New Visit</h1>
                        <p className="text-muted-foreground">Create a new patient visit</p>
                    </div>
                </div>

                <Card className="glass-card p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <Label htmlFor="facilityName">Facility Name *</Label>
                            <Input
                                id="facilityName"
                                placeholder="e.g., City Hospital"
                                value={formData.facilityName}
                                onChange={(e) => setFormData({ ...formData, facilityName: e.target.value })}
                                required
                                className="mt-2"
                            />
                        </div>

                        <div>
                            <Label htmlFor="department">Department *</Label>
                            <Select
                                value={formData.department}
                                onValueChange={(value) => setFormData({ ...formData, department: value })}
                                required
                            >
                                <SelectTrigger className="mt-2">
                                    <SelectValue placeholder="Select department" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="General Medicine">General Medicine</SelectItem>
                                    <SelectItem value="Emergency">Emergency</SelectItem>
                                    <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                                    <SelectItem value="Cardiology">Cardiology</SelectItem>
                                    <SelectItem value="Neurology">Neurology</SelectItem>
                                    <SelectItem value="Orthopedics">Orthopedics</SelectItem>
                                    <SelectItem value="OPD">OPD</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="providerName">Provider Name *</Label>
                            <Input
                                id="providerName"
                                placeholder="e.g., Dr. Smith"
                                value={formData.providerName}
                                onChange={(e) => setFormData({ ...formData, providerName: e.target.value })}
                                required
                                className="mt-2"
                            />
                        </div>

                        <div>
                            <Label htmlFor="chiefComplaint">Chief Complaint *</Label>
                            <Input
                                id="chiefComplaint"
                                placeholder="e.g., Fever and headache"
                                value={formData.chiefComplaint}
                                onChange={(e) => setFormData({ ...formData, chiefComplaint: e.target.value })}
                                required
                                className="mt-2"
                            />
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                className="flex-1"
                                onClick={() => navigate("/")}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="flex-1"
                                disabled={creating}
                            >
                                <UserPlus className="h-4 w-4 mr-2" />
                                {creating ? "Creating..." : "Create Visit"}
                            </Button>
                        </div>
                    </form>
                </Card>

                <Card className="glass-card p-4 mt-4 bg-muted/50">
                    <p className="text-sm text-muted-foreground">
                        <strong>Note:</strong> This creates a visit without patient identifiable information.
                        Only facility-level and clinical metadata will be stored.
                    </p>
                </Card>
            </div>
        </div>
    );
}
