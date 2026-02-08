"use client";

import { useState, useEffect } from 'react';
import {
    Mic,
    Video,
    LineChart,
    MessageSquare,
    Users,
    Play,
    History,
    ShieldCheck,
    Zap,
    ArrowRight,
    Sparkles,
    ChevronLeft,
    Send
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/app/context/AuthContext';
import { getPuzzleQuestions, analyzePersonalityPuzzle } from '@/lib/apiClient';

export default function PracticePage() {
    const [activeSimulator, setActiveSimulator] = useState<'pitch' | 'collaboration' | null>(null);

    const simulators = [
        {
            id: 'pitch',
            title: "Pitch Simulator",
            desc: "Refine your presentation skills with real-time AI feedback on tone and clarity.",
            icon: Mic,
            color: "text-primary",
            tags: ["Communication", "Confidence"]
        },
        {
            id: 'collaboration',
            title: "Collaboration Simulation",
            desc: "Navigate tough team conflicts and empathy challenges in a safe environment.",
            icon: Users,
            color: "text-secondary",
            tags: ["Empathy", "Conflict Resolution"]
        },
        {
            id: 'personality',
            title: "Personality Profiling",
            desc: "Take advanced exercises to map your growth across 8 core personality fields.",
            icon: BrainCircuit,
            color: "text-accent",
            tags: ["Growth", "Self-Awareness"]
        }
    ];

    if (activeSimulator === 'pitch') {
        return <PitchSimulator onBack={() => setActiveSimulator(null)} />;
    }

    if (activeSimulator === 'collaboration') {
        return <CollaborationSimulator onBack={() => setActiveSimulator(null)} />;
    }

    if (activeSimulator === 'personality') {
        return <PersonalitySimulator onBack={() => setActiveSimulator(null)} />;
    }

    return (
        <div className="space-y-12 max-w-6xl mx-auto">
            <header className="text-center space-y-4">
                <h1 className="text-5xl font-heading font-bold text-gradient">Practice Lab</h1>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                    Scale your soft skills through high-fidelity simulations. Choose a module to begin your training.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {simulators.map((sim) => (
                    <div key={sim.id} className="glass-card group p-8 flex flex-col items-start hover:border-primary/50 transition-all cursor-pointer" onClick={() => setActiveSimulator(sim.id as any)}>
                        <div className={cn("w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6", sim.color)}>
                            <sim.icon className="w-8 h-8" />
                        </div>
                        <div className="flex gap-2 mb-4">
                            {sim.tags.map(tag => (
                                <span key={tag} className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/5 text-muted-foreground">
                                    {tag}
                                </span>
                            ))}
                        </div>
                        <h3 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors">{sim.title}</h3>
                        <p className="text-muted-foreground text-sm leading-relaxed mb-8 flex-1">
                            {sim.desc}
                        </p>
                        <button className="flex items-center gap-2 font-bold text-sm uppercase tracking-widest text-primary group-hover:gap-4 transition-all">
                            Launch Module <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>

            {/* History & Achievements */}
            <section className="pt-12 border-t border-border">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold font-heading">Recent Performance</h2>
                    <button className="text-sm font-bold text-muted-foreground hover:text-foreground flex items-center gap-2">
                        <History className="w-4 h-4" /> View Full History
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="glass-card p-6 flex items-center gap-6">
                        <div className="w-14 h-14 rounded-full border-4 border-primary/30 border-t-primary flex items-center justify-center font-bold text-lg">
                            85%
                        </div>
                        <div>
                            <h4 className="font-bold">Pitch Confidence</h4>
                            <p className="text-xs text-muted-foreground">Improved by 12% since last week</p>
                        </div>
                    </div>
                    <div className="glass-card p-6 flex items-center gap-6">
                        <div className="w-14 h-14 rounded-full border-4 border-secondary/30 border-t-secondary flex items-center justify-center font-bold text-lg">
                            72%
                        </div>
                        <div>
                            <h4 className="font-bold">Empathy Score</h4>
                            <p className="text-xs text-muted-foreground">Focus on active listening in the next session</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Analysis Section - full width under both columns */}
            {/* {analysis && (
                <div className="pt-8">
                    <div className="glass-card p-6">
                        <h3 className="font-bold mb-4">Analysis Results</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.entries(analysis).map(([key, value]: [string, any]) => (
                                <div key={key} className="bg-white/5 p-4 rounded-lg">
                                    <div className="font-bold text-accent mb-1">{value.dimension || key}</div>
                                    <div className="text-sm">Score: {value.score ?? 'N/A'}/100</div>
                                    <div className="text-sm">Emotion: {value['émotion dominante'] || value.emotion || ''}</div>
                                    <div className="text-sm">Advice: {value['conseil principal'] || value.advice || ''}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )} */}
        </div>
    );
}

function PitchSimulator({ onBack }: { onBack: () => void }) {
    const [recording, setRecording] = useState(false);
    const [complete, setComplete] = useState(false);

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
            <div className="flex items-center justify-between">
                <button onClick={onBack} className="text-muted-foreground hover:text-foreground flex items-center gap-2">
                    <ChevronLeft className="w-5 h-5" /> All Simulations
                </button>
                <div className="flex items-center gap-4">
                    <span className="text-xs font-bold px-3 py-1 bg-green-500/10 text-green-500 rounded-full">AI Analysis Active</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass-card bg-slate-900 border-primary/20 aspect-video flex items-center justify-center relative overflow-hidden">
                        {!recording && !complete && (
                            <div className="text-center p-12">
                                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
                                    <Play className="w-8 h-8 text-primary fill-current" />
                                </div>
                                <h2 className="text-3xl font-bold mb-4 font-heading">Ready to Pitch?</h2>
                                <p className="text-muted-foreground max-w-sm">We'll analyze your tone, pace, and clarity. Use your microphone to speak naturally.</p>
                                <button onClick={() => setRecording(true)} className="btn-primary mt-8">
                                    Start Recording
                                </button>
                            </div>
                        )}

                        {recording && (
                            <div className="w-full h-full flex flex-col items-center justify-center relative">
                                <div className="w-32 h-32 rounded-full bg-red-500/20 flex items-center justify-center animate-pulse">
                                    <Mic className="w-12 h-12 text-red-500" />
                                </div>
                                <div className="mt-8 flex gap-1 h-8">
                                    {[...Array(20)].map((_, i) => (
                                        <div key={i} className="w-1.5 bg-primary/50 self-end rounded-full" style={{ height: `${Math.random() * 100}%` }} />
                                    ))}
                                </div>
                                <button onClick={() => { setRecording(false); setComplete(true); }} className="absolute bottom-8 px-6 py-2 rounded-xl bg-red-500 text-white font-bold">
                                    Stop Session
                                </button>
                            </div>
                        )}

                        {complete && (
                            <div className="w-full h-full flex flex-col items-center justify-center p-12 bg-black/40 backdrop-blur-sm">
                                <Sparkles className="w-12 h-12 text-primary mb-4" />
                                <h2 className="text-2xl font-bold mb-2">Analyzing Performance...</h2>
                                <p className="text-muted-foreground">Our AI is processing your tone and clarity markers.</p>
                            </div>
                        )}
                    </div>

                    <div className="glass-card p-6">
                        <h3 className="font-bold mb-4">Pitch Instructions</h3>
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            <li className="flex gap-3"><CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" /> Focus on a strong opening hook.</li>
                            <li className="flex gap-3"><CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" /> Keep your pace between 130-150 words per minute.</li>
                            <li className="flex gap-3"><CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" /> Use "Power Pauses" after key points.</li>
                        </ul>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="glass-card p-6">
                        <h3 className="font-bold mb-6 flex items-center justify-between">
                            Live Metrics <LineChart className="w-4 h-4 text-muted-foreground" />
                        </h3>
                        <div className="space-y-6">
                            <MetricBar label="Clarity" value={complete ? 88 : 0} color="bg-primary" />
                            <MetricBar label="Confidence" value={complete ? 75 : 0} color="bg-secondary" />
                            <MetricBar label="Empathy" value={complete ? 92 : 0} color="bg-accent" />
                            <MetricBar label="Filler Words" value={complete ? 15 : 0} color="bg-red-500" />
                        </div>
                    </div>

                    {complete && (
                        <div className="glass-card p-6 border-primary/40 bg-primary/5 animate-fade-in">
                            <h3 className="font-bold mb-4 flex items-center gap-2 text-primary">
                                <Zap className="w-4 h-4" /> AI Feedback
                            </h3>
                            <p className="text-sm text-muted-foreground italic leading-relaxed">
                                "Your clarity was excellent, but your confidence dropped slightly in the middle. Try more 'Active Gestures' to maintain energy."
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function MetricBar({ label, value, color }: { label: string, value: number, color: string }) {
    return (
        <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <span>{label}</span>
                <span>{value}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className={cn("h-full transition-all duration-1000", color)} style={{ width: `${value}%` }} />
            </div>
        </div>
    );
}

function CollaborationSimulator({ onBack }: { onBack: () => void }) {
    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            <div className="flex items-center justify-between">
                <button onClick={onBack} className="text-muted-foreground hover:text-foreground flex items-center gap-2">
                    <ChevronLeft className="w-5 h-5" /> All Simulations
                </button>
                <span className="text-xs font-bold text-accent uppercase tracking-widest px-3 py-1 bg-accent/10 rounded-full">Team Conflict Scenario</span>
            </div>

            <div className="glass-card flex flex-col h-[600px] overflow-hidden">
                <div className="p-6 border-b border-border bg-surface/50">
                    <h2 className="text-xl font-bold font-heading">Scenario: The Missed Deadline</h2>
                    <p className="text-sm text-muted-foreground">A teammate missed a deadline. How do you address this without damaging morale?</p>
                </div>
                <div className="flex-1 p-8 overflow-y-auto space-y-6 no-scrollbar bg-slate-900/50">
                    <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-xl bg-secondary/20 flex-shrink-0 flex items-center justify-center">
                            <Users className="w-6 h-6 text-secondary" />
                        </div>
                        <div className="glass-card p-4 bg-white/5 border-white/10 max-w-[80%]">
                            <p className="text-sm font-bold text-secondary mb-1">Teammate (AI)</p>
                            <p className="text-sm leading-relaxed">"Look, I know I'm late with the report. I've been overwhelmed with other tasks. It's not my fault the manager added extra work!"</p>
                        </div>
                    </div>
                    {/* Interaction Placeholder */}
                    <div className="pt-12 text-center text-muted-foreground italic text-sm">
                        Waiting for your response...
                    </div>
                </div>
                <div className="p-6 bg-surface/80 border-t border-border mt-auto">
                    <div className="flex gap-2 mb-4">
                        {["Empathize", "Address Accountability", "Find Solution", "Escalate"].map(action => (
                            <button key={action} className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold transition-all">
                                {action}
                            </button>
                        ))}
                    </div>
                    <div className="relative">
                        <input placeholder="Type your response or choose an action..." className="w-full bg-background border border-border rounded-xl py-3 px-4 text-sm" />
                        <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-primary/20 text-primary">
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function PersonalitySimulator({ onBack }: { onBack: () => void }) {
    const [questions, setQuestions] = useState<Record<string, any>>({});
    const [currentDim, setCurrentDim] = useState<string>('');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [puzzleImage, setPuzzleImage] = useState<string | null>(null);
    const [analysis, setAnalysis] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const { token } = useAuth();

    useEffect(() => {
        loadQuestions();
    }, []);



    const loadQuestions = async () => {
        try {
            const data = await getPuzzleQuestions();
            setQuestions(data);
            const dims = Object.keys(data);
            if (dims.length > 0) {
                setCurrentDim(dims[0]);
            }
        } catch (error) {
            console.error('Error loading questions:', error);
        }
    };

    const currentQuestions = questions[currentDim] || [];
    const currentQ = currentQuestions[currentQuestionIndex];
    const dims = Object.keys(questions);
    const currentDimIndex = dims.indexOf(currentDim);
    const totalQuestions = dims.reduce((acc, dim) => acc + questions[dim].length, 0);
    const answeredQuestions = Object.keys(answers).length;
    const progress = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

    // Auto-generate puzzle when all questions have been answered
    useEffect(() => {
        if (answeredQuestions > 0 && answeredQuestions === totalQuestions && !puzzleImage && !isGenerating) {
            // small debounce to allow UI to settle before generation
            const t = setTimeout(() => generatePuzzle(), 250);
            return () => clearTimeout(t);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [answeredQuestions, totalQuestions, puzzleImage, isGenerating]);

    const handleAnswer = (answer: string) => {
        const questionKey = `${currentDim} - ${currentQ[0]}`;
        setAnswers(prev => ({ ...prev, [questionKey]: answer }));

        // Next question
        if (currentQuestionIndex < currentQuestions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else if (currentDimIndex < dims.length - 1) {
            // Next dimension
            setCurrentDim(dims[currentDimIndex + 1]);
            setCurrentQuestionIndex(0);
        }
    };

    const generatePuzzle = async () => {
        if (answeredQuestions < totalQuestions) return;

        setIsGenerating(true);
        try {
            const result = await analyzePersonalityPuzzle(answers);
            setAnalysis(result);
            setPuzzleImage(result.puzzle_image);
        } catch (error) {
            console.error('Error generating puzzle:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
            <div className="flex items-center justify-between">
                <button onClick={onBack} className="text-muted-foreground hover:text-foreground flex items-center gap-2">
                    <ChevronLeft className="w-5 h-5" /> All Simulations
                </button>
                <div className="flex items-center gap-4">
                    <span className="text-xs font-bold px-3 py-1 bg-accent/10 text-accent rounded-full">Personality Profiling</span>
                    <span className="text-sm text-muted-foreground">
                        Question {answeredQuestions + 1} of {totalQuestions}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                {/* Questions Section - Left */}
                <div className="space-y-6">
                    <div className="glass-card p-8 h-full">
                        <div className="mb-6">
                            <div className="w-full bg-white/5 rounded-full h-2 mb-4">
                                <div
                                    className="bg-accent h-2 rounded-full transition-all duration-500"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <h2 className="text-2xl font-bold font-heading mb-2">Personality Assessment</h2>
                            <p className="text-muted-foreground">Answer honestly to build your accurate personality profile.</p>
                        </div>

                        {currentQ && (
                            <div className="space-y-6">
                                <div className="bg-slate-900/50 p-6 rounded-xl border border-white/10">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-sm">
                                            {currentDimIndex + 1}
                                        </div>
                                        <h3 className="font-bold text-lg">{currentDim}</h3>
                                    </div>
                                    <h4 className="text-lg font-bold mb-4">{currentQ[0]}</h4>
                                    <div className="space-y-3">
                                        {currentQ[1].map((option: string, index: number) => (
                                            <button
                                                key={index}
                                                onClick={() => handleAnswer(option)}
                                                className="w-full text-left p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all"
                                            >
                                                <span className="text-sm font-medium">{option}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {answeredQuestions === totalQuestions && !puzzleImage && (
                                    <div className="w-full">
                                        <button
                                            disabled
                                            className="w-full btn-primary cursor-not-allowed opacity-80 flex items-center justify-center gap-3"
                                        >
                                            {isGenerating ? (
                                                <>
                                                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" /><path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /></svg>
                                                    Generating your puzzle...
                                                </>
                                            ) : (
                                                <>Auto-generating your puzzle…</>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Puzzle Section - Right */}
                <div className="space-y-6">
                    <div className="glass-card p-6 h-full flex flex-col">
                        <h3 className="font-bold mb-4 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-accent" /> Your Emotional Puzzle
                        </h3>
                        <p className="text-sm text-muted-foreground mb-6">
                            Each piece represents a dimension of your personality, shaped by your unique responses.
                        </p>

                        {puzzleImage ? (
                            <div className="space-y-4 flex-1">
                                <div className="relative inline-block w-full">
                                    <img
                                        src={puzzleImage}
                                        alt="Personality Puzzle"
                                        className="w-full rounded-lg border border-white/10 object-contain"
                                    />

                                    {/* INTERACTIVE HIGHLIGHT OVERLAY */}
                                    {analysis && analysis.highlight && (
                                        <div
                                            onClick={() => window.location.href = `/improve/${analysis.highlight.dimension}`}
                                            className="absolute cursor-pointer group z-10 hover:bg-white/10 hover:ring-4 hover:ring-accent/50 transition-all rounded-lg"
                                            style={{
                                                left: `${(analysis.highlight.x / analysis.highlight.total_width) * 100}%`,
                                                top: `${(analysis.highlight.y / analysis.highlight.total_height) * 100}%`,
                                                width: `${(analysis.highlight.width / analysis.highlight.total_width) * 100}%`,
                                                height: `${(analysis.highlight.height / analysis.highlight.total_height) * 100}%`,
                                            }}
                                        >
                                            {/* Tooltip */}
                                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-accent text-white text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg pointer-events-none">
                                                We will improve this dimension!
                                                <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-accent rotate-45"></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {/* analysis moved below for full-width display */}
                            </div>
                        ) : (
                            <div className="aspect-square bg-slate-900/50 rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center">
                                <div className="text-center text-muted-foreground">
                                    {isGenerating ? (
                                        <>
                                            <svg className="w-12 h-12 mx-auto mb-4 animate-spin opacity-60" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.2" /><path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /></svg>
                                            <p className="text-sm">Generating your personalized puzzle…</p>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                            <p className="text-sm">Complete all questions to reveal your puzzle</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Report Section */}
            {analysis && (analysis.report || analysis.analysis) && (
                <div className="pt-8">
                    <div className="glass-card p-8 border-l-4 border-accent relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <Sparkles className="w-32 h-32" />
                        </div>
                        <h3 className="text-2xl font-bold font-heading mb-4 flex items-center gap-2 text-accent">
                            <Sparkles className="w-6 h-6" /> Your Evolving Portrait
                        </h3>
                        <div className="prose prose-invert max-w-none">
                            <p className="text-lg leading-relaxed text-slate-200 italic">
                                "{analysis.report || "Detailed analysis is being created..."}"
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Analysis Section - full width under both columns */}

        </div>
    );
}

// Dummy Icon for BrainCircuit if not in lucide
function BrainCircuit(props: any) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24" height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .52 8.242 4.2 4.2 0 0 0 7.132-.907 4 4 0 0 0 7.132.907 4.2 4.2 0 0 0 .52-8.242 4 4 0 0 0-2.526-5.77A3 3 0 1 0 12 5" />
            <path d="M9 13h1" /><path d="M14 13h1" /><path d="M12 16v1" /><path d="M12 10v1" />
        </svg>
    );
}

function CheckCircle2(props: any) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24" height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><path d="m9 12 2 2 4-4" />
        </svg>
    );
}
