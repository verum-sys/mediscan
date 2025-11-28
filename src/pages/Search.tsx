import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search as SearchIcon } from "lucide-react";

export default function Search() {
    const navigate = useNavigate();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);

    const handleSearch = async () => {
        if (!query.trim()) return;

        setSearching(true);
        try {
            // For now, this is a placeholder that searches through queue
            const response = await fetch('http://localhost:3001/api/queue');
            if (response.ok) {
                const allVisits = await response.json();

                // Simple search through chief complaints and visit numbers
                const filtered = allVisits.filter((visit: any) =>
                    visit.chief_complaint?.toLowerCase().includes(query.toLowerCase()) ||
                    visit.visit_number?.toLowerCase().includes(query.toLowerCase()) ||
                    visit.facility_name?.toLowerCase().includes(query.toLowerCase())
                );

                setResults(filtered);
            }
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setSearching(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-8">
            <div className="container mx-auto px-6 max-w-4xl">
                <div className="flex items-center gap-4 mb-6">
                    <Button variant="ghost" onClick={() => navigate("/")}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold">Search</h1>
                        <p className="text-muted-foreground">Search visits and symptoms</p>
                    </div>
                </div>

                <Card className="glass-card p-6 mb-6">
                    <div className="flex gap-3">
                        <Input
                            placeholder="Search by visit number, chief complaint, or facility..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            className="flex-1"
                        />
                        <Button onClick={handleSearch} disabled={searching}>
                            <SearchIcon className="h-4 w-4 mr-2" />
                            {searching ? "Searching..." : "Search"}
                        </Button>
                    </div>
                </Card>

                {results.length > 0 && (
                    <div>
                        <h2 className="text-xl font-semibold mb-4">
                            Results ({results.length})
                        </h2>
                        <div className="space-y-3">
                            {results.map((visit) => (
                                <Card
                                    key={visit.id}
                                    className="glass-card p-4 hover:shadow-md transition-all cursor-pointer"
                                    onClick={() => navigate(`/visit/${visit.id}`)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h3 className="font-semibold">{visit.visit_number}</h3>
                                                <Badge variant="outline">{visit.status}</Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {visit.chief_complaint}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {visit.facility_name} • {visit.department}
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {results.length === 0 && query && !searching && (
                    <Card className="glass-card p-8 text-center">
                        <p className="text-muted-foreground">No results found for "{query}"</p>
                    </Card>
                )}

                {!query && (
                    <Card className="glass-card p-8 text-center">
                        <SearchIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">Enter a search query to find visits</p>
                    </Card>
                )}
            </div>
        </div>
    );
}
