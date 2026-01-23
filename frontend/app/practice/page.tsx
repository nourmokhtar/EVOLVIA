"use client";

import { useState } from 'react';
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
            desc: "Take advanced exercises to map your growth across 6 core personality fields.",
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
