"use client";

import { useState, useEffect } from 'react';
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    ResponsiveContainer,
    PolarRadiusAxis
} from 'recharts';
import {
    Sparkles,
    TrendingUp,
    Target,
    Lightbulb,
    ArrowRight,
    Send,
    Loader
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/app/context/AuthContext';
import { getPersonalityRadar, analyzeWithOllama } from '@/lib/apiClient';

const defaultPersonalityData = [
    { subject: 'Communication', A: 85, fullMark: 100 },
    { subject: 'Empathy', A: 70, fullMark: 100 },
    { subject: 'Conflict Res', A: 60, fullMark: 100 },
    { subject: 'Collaboration', A: 90, fullMark: 100 },
    { subject: 'Confidence', A: 75, fullMark: 100 },
    { subject: 'Adaptability', A: 80, fullMark: 100 },
];

const traits = [
    { name: 'Natural Collaborator', score: 90, desc: 'You excel in team environments and lift others up.', color: 'text-primary' },
    { name: 'Active Communicator', score: 85, desc: 'Your ideas are clear, structured, and persuasive.', color: 'text-secondary' },
    { name: 'High Adaptability', score: 80, desc: 'You handle change with grace and strategic thinking.', color: 'text-accent' },
];

export default function PersonalityPage() {
    const { userId, token, isAuthenticated } = useAuth();
    const [mounted, setMounted] = useState(false);
    const [personalityData, setPersonalityData] = useState(defaultPersonalityData);
    const [journalEntry, setJournalEntry] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isLoadingRadar, setIsLoadingRadar] = useState(true);

    // Custom label renderer for radar chart
    const renderCustomLabel = (props: any) => {
        const { x, y, value } = props;
        return (
            <text 
                x={x} 
                y={y} 
                fill="#e2e8f0" 
                textAnchor="middle" 
                dominantBaseline="middle"
                fontSize="14"
                fontWeight="bold"
            >
                {value}
            </text>
        );
    };

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        // Load initial radar data from backend
        if (isAuthenticated && userId && token) {
            loadPersonalityData();
        }
    }, [isAuthenticated, userId, token]);

    const loadPersonalityData = async () => {
        try {
            setIsLoadingRadar(true);
            if (!userId || !token) {
                console.warn("Missing userId or token for loading personality data");
                return;
            }
            
            const data = await getPersonalityRadar(userId, token);
            console.log("Fetched personality radar data:", data);
            
            if (data && Array.isArray(data)) {
                setPersonalityData(data);
            } else {
                console.warn("Unexpected data format from getPersonalityRadar:", data);
            }
        } catch (error) {
            console.error('Error loading personality data:', error);
            // Keep current data on error
        } finally {
            setIsLoadingRadar(false);
        }
    };

    const handleJournalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!journalEntry.trim()) {
            setFeedback('Please enter a journal entry');
            setIsSuccess(false);
            return;
        }

        if (!userId || !token) {
            setFeedback('Authentication required. Please login again.');
            setIsSuccess(false);
            return;
        }

        setIsLoading(true);
        setFeedback(null);

        try {
            const result = await analyzeWithOllama(journalEntry, token);

            if (result.success) {
                setFeedback(`Journal analyzed! ${result.analysis || 'Your personality profile has been updated.'}`);
                setIsSuccess(true);
                setJournalEntry('');
                
                // Refetch the personality data from backend to ensure accuracy
                await loadPersonalityData();
            } else {
                setFeedback(result.error || 'Failed to analyze journal entry');
                setIsSuccess(false);
            }
        } catch (error) {
            console.error('Error submitting journal:', error);
            setFeedback('Error analyzing journal. Please try again.');
            setIsSuccess(false);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-12 max-w-7xl mx-auto">
            <header>
                <div className="flex items-center gap-3 mb-4 text-primary">
                    <Sparkles className="w-6 h-6" />
                    <span className="text-sm font-bold uppercase tracking-widest">Evolution Insights</span>
                </div>
                <h1 className="text-4xl font-heading font-bold mb-2">Personality Profile</h1>
                <p className="text-muted-foreground text-lg">Your psychological and skill-based growth map.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                {/* Radar Map */}
                <div className="glass-card p-12 bg-slate-900 border-primary/20">
                    <div className="h-[500px] min-h-[500px] w-full">
                        {mounted && !isLoadingRadar ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={personalityData}>
                                    <PolarGrid stroke="#334155" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 14, fontWeight: 600 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 12 }} />
                                    <Radar
                                        name="Current Skills"
                                        dataKey="A"
                                        stroke="var(--primary)"
                                        fill="var(--primary)"
                                        fillOpacity={0.6}
                                        label={renderCustomLabel}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <Loader className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Traits & Insights */}
                <div className="space-y-8">
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold font-heading flex items-center gap-3">
                            <TrendingUp className="w-6 h-6 text-primary" /> Key Strengths
                        </h2>
                        {traits.map((trait, i) => (
                            <div key={i} className="glass-card p-6 border-white/5 hover:border-white/10 transition-colors">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className={cn("font-bold text-lg", trait.color)}>{trait.name}</h4>
                                    <span className="text-sm font-black opacity-40">{trait.score}/100</span>
                                </div>
                                <p className="text-sm text-muted-foreground">{trait.desc}</p>
                            </div>
                        ))}
                    </div>

                    <div className="glass-card p-8 bg-gradient-to-br from-accent/20 to-transparent border-accent/20">
                        <div className="flex items-center gap-3 mb-4">
                            <Target className="w-5 h-5 text-accent" />
                            <h3 className="font-bold">Next Growth Focus</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-6">
                            Your "Conflict Resolution" score is currently lower than your other traits. We've updated your learning path to include more empathy-based role-plays.
                        </p>
                        <button className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest text-accent hover:gap-4 transition-all">
                            Unlock Training <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Journal Action Section */}
            <section className="glass-card p-12 bg-gradient-to-br from-secondary/10 to-transparent border-secondary/20">
                <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-lg bg-secondary/20 flex items-center justify-center">
                            <Lightbulb className="w-6 h-6 text-secondary" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold font-heading">Journal Action</h2>
                            <p className="text-sm text-muted-foreground mt-1">Reflect on your experiences and watch your personality profile evolve</p>
                        </div>
                    </div>

                    <form onSubmit={handleJournalSubmit} className="space-y-4">
                        <div className="relative">
                            <textarea
                                value={journalEntry}
                                onChange={(e) => setJournalEntry(e.target.value)}
                                placeholder="Write your thoughts, experiences, or reflections here. This will be analyzed to update your personality profile..."
                                className="w-full min-h-[150px] p-4 bg-slate-800/50 border border-white/10 rounded-lg text-white placeholder-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 resize-none"
                                disabled={isLoading}
                            />
                        </div>

                        <div className="flex items-center justify-between gap-4">
                            <div className="flex-1">
                                {feedback && (
                                    <div className={cn(
                                        "text-sm p-3 rounded-lg",
                                        isSuccess 
                                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                            : "bg-red-500/20 text-red-400 border border-red-500/30"
                                    )}>
                                        {feedback}
                                    </div>
                                )}
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading || !journalEntry.trim()}
                                className={cn(
                                    "flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm uppercase tracking-widest transition-all",
                                    isLoading || !journalEntry.trim()
                                        ? "bg-secondary/30 text-secondary/50 cursor-not-allowed"
                                        : "bg-secondary text-white hover:bg-secondary/80 hover:gap-3"
                                )}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader className="w-4 h-4 animate-spin" />
                                        Analyzing...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Submit Entry
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="pt-4 border-t border-white/10">
                        <p className="text-xs text-muted-foreground">
                            💡 <strong>Tip:</strong> Be honest and specific in your reflections. The AI will analyze your entry and update your personality traits accordingly.
                        </p>
                    </div>
                </div>
            </section>

            <section className="glass-card p-12 overflow-hidden relative">
                <div className="relative z-10 flex flex-col md:flex-row gap-12 items-center">
                    <div className="w-20 h-20 rounded-2xl bg-secondary/20 flex items-center justify-center flex-shrink-0">
                        <Lightbulb className="w-10 h-10 text-secondary" />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h2 className="text-2xl font-bold mb-4 font-heading">Adaptive Path Suggestions</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Based on your unique profile, we recommend focusing on <strong>Team Leadership</strong> modules next. Your collaboration and confidence levels suggest you are ready to manage simulated team crises.
                        </p>
                    </div>
                    <button className="btn-primary whitespace-nowrap">
                        Switch Path
                    </button>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/5 blur-[120px] rounded-full" />
            </section>
        </div>
    );
}
