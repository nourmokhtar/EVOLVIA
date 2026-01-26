"use client";

import { useState, useRef, useEffect } from 'react';
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
    Send,
    BrainCircuit
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { API } from '@/lib/api';

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
    const [status, setStatus] = useState<'idle' | 'recording' | 'processing' | 'done'>('idle');
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    useEffect(() => {
        if (status === 'recording' && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
        }
    }, [status]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720 },
                audio: true
            });
            streamRef.current = stream;

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });

                const canvas = document.createElement('canvas');
                if (videoRef.current) {
                    canvas.width = videoRef.current.videoWidth;
                    canvas.height = videoRef.current.videoHeight;
                    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
                }
                const videoFrameBase64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    const audioBase64 = (reader.result as string).split(',')[1];
                    await sendToAI(videoFrameBase64, audioBase64);
                };

                stream.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            };

            setStatus('recording');
            setRecording(true);
            mediaRecorder.start();
        } catch (err) {
            console.error("Error accessing media devices:", err);
            alert("Please allow camera and microphone access to use the simulator.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && recording) {
            mediaRecorderRef.current.stop();
            setRecording(false);
            setStatus('processing');
        }
    };

    const sendToAI = async (videoFrame: string, audio: string) => {
        try {
            const response = await fetch(API.pitch.analyze, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    video_base64: videoFrame,
                    audio_base64: audio,
                    transcript: ""
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Analysis failed');
            }

            const data = await response.json();
            setAnalysisResult(data);
            setStatus('done');
        } catch (err) {
            console.error("Error calling AI:", err);
            alert("The AI agents hit a snag. Please check the backend logs.");
            setStatus('idle');
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-20">
            <div className="flex items-center justify-between">
                <button onClick={onBack} className="text-muted-foreground hover:text-foreground flex items-center gap-2">
                    <ChevronLeft className="w-5 h-5" /> All Simulations
                </button>
                <div className="flex items-center gap-4">
                    <span className="text-xs font-bold px-3 py-1 bg-primary/10 text-primary rounded-full border border-primary/20">
                        Agent Brain: LangGraph v1.2
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-white">
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass-card bg-slate-950 border-white/5 aspect-video flex items-center justify-center relative overflow-hidden rounded-3xl shadow-2xl">
                        {status === 'idle' && (
                            <div className="text-center p-12">
                                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center mx-auto mb-8 shadow-inner">
                                    <Video className="w-10 h-10 text-primary animate-pulse" />
                                </div>
                                <h2 className="text-4xl font-bold mb-4 font-heading tracking-tight">Ready to pitch?</h2>
                                <p className="text-muted-foreground max-w-sm mx-auto text-lg">
                                    Our multi-agent system will analyze your posture, tone, and stress levels once you finish.
                                </p>
                                <button onClick={startRecording} className="btn-primary mt-10 px-10 py-4 text-lg bg-gradient-to-r from-primary to-secondary border-none hover:scale-105 transition-transform">
                                    Start Session
                                </button>
                            </div>
                        )}

                        {(status === 'recording' || status === 'processing') && (
                            <video
                                ref={videoRef}
                                autoPlay
                                muted
                                playsInline
                                className={cn("w-full h-full object-cover grayscale-[0.3] brightness-90", status === 'processing' && "blur-sm opacity-50")}
                            />
                        )}

                        {status === 'recording' && (
                            <div className="absolute top-6 left-6 flex items-center gap-3 bg-red-500/10 backdrop-blur-md px-4 py-2 rounded-full border border-red-500/20">
                                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                                <span className="text-xs font-bold uppercase tracking-widest">Live Recording</span>
                            </div>
                        )}

                        {status === 'processing' && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center bg-black/60 backdrop-blur-md">
                                <Sparkles className="w-16 h-16 text-primary animate-bounce mb-6" />
                                <h2 className="text-3xl font-bold mb-3 font-heading">Consulting Agents...</h2>
                                <p className="text-muted-foreground text-lg">The Posture, Tone, and Stress agents are compiling your report.</p>
                                <div className="mt-8 flex gap-2">
                                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" />
                                </div>
                            </div>
                        )}

                        {status === 'done' && (
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 flex flex-col items-center justify-center p-12 text-center">
                                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6 border border-green-500/30">
                                    <ShieldCheck className="w-10 h-10 text-green-500" />
                                </div>
                                <h2 className="text-4xl font-bold mb-4 font-heading">Analysis Complete!</h2>
                                <p className="text-muted-foreground text-lg mb-8">Scroll down to view your personal coaching report.</p>
                                <button onClick={() => setStatus('idle')} className="px-6 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-sm font-bold uppercase tracking-widest transition-all">
                                    New Session
                                </button>
                            </div>
                        )}

                        {status === 'recording' && (
                            <button
                                onClick={stopRecording}
                                className="absolute bottom-10 left-1/2 -translate-x-1/2 px-10 py-4 rounded-full bg-red-500 text-white font-bold text-lg hover:bg-red-600 shadow-xl shadow-red-500/20 transition-all active:scale-95"
                            >
                                Finish & Analyze
                            </button>
                        )}
                    </div>

                    <div className="glass-card p-8 bg-slate-900/50">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                            <Send className="w-5 h-5 text-primary" /> Training Best Practices
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <InstructionItem icon={Mic} text="Keep your volume consistent but vary your pitch to avoid sounding monotone." />
                                <InstructionItem icon={Users} text="Imagine your audience is in front of the lens. Look into the camera." />
                            </div>
                            <div className="space-y-4">
                                <InstructionItem icon={Zap} text="Acknowledge stress. Take a deep breath before transitions." />
                                <InstructionItem icon={Video} text="Check your posture. Shoulders should be aligned and relaxed." />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="glass-card p-8 border-white/5 bg-slate-900/40">
                        <h3 className="text-xl font-bold mb-8 flex items-center justify-between">
                            Executive Competencies <LineChart className="w-5 h-5 text-muted-foreground" />
                        </h3>
                        <div className="space-y-8">
                            <MetricBar label="Authority" value={analysisResult?.competency_map?.Authority || 0} color="bg-primary shadow-[0_0_12px_rgba(59,130,246,0.5)]" />
                            <MetricBar label="Empathy" value={analysisResult?.competency_map?.Empathy || 0} color="bg-secondary shadow-[0_0_12px_rgba(139,92,246,0.5)]" />
                            <MetricBar label="Resilience" value={analysisResult?.competency_map?.Resilience || 0} color="bg-accent shadow-[0_0_12px_rgba(236,72,153,0.5)]" />
                            <MetricBar label="Persuasion" value={analysisResult?.competency_map?.Persuasion || 0} color="bg-gradient-to-r from-primary to-secondary" />
                        </div>
                    </div>

                    {status === 'done' && analysisResult && (
                        <div className="glass-card p-8 border-primary/30 bg-primary/5 animate-fade-in ring-1 ring-primary/20">
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-3 text-primary tracking-tight">
                                <Sparkles className="w-5 h-5" /> Coach's Summary
                            </h3>
                            <p className="text-lg text-muted-foreground italic leading-relaxed mb-8 border-l-2 border-primary/30 pl-6">
                                "{typeof analysisResult.summary === 'string' ? analysisResult.summary : 'Great work on your pitch! See the details below.'}"
                            </p>
                            <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Key Recommendations</h4>
                            <ul className="space-y-4">
                                {analysisResult?.recommendations?.map((rec: any, i: number) => (
                                    <li key={i} className="flex gap-4 text-sm font-medium">
                                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs flex-shrink-0 mt-0.5 font-bold">
                                            {i + 1}
                                        </div>
                                        <span className="text-muted-foreground">{typeof rec === 'string' ? rec : JSON.stringify(rec)}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function InstructionItem({ icon: Icon, text }: { icon: any, text: string }) {
    return (
        <div className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
        </div>
    );
}


function MetricBar({ label, value, color }: { label: string, value: number, color: string }) {
    return (
        <div className="space-y-3">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                <span>{label}</span>
                <span className="text-foreground">{value}%</span>
            </div>
            <div className="relative w-full h-1.5 bg-white/5 rounded-full">
                <div
                    className={cn("absolute h-full rounded-full transition-all duration-1000 ease-out", color)}
                    style={{
                        width: `${value}%`,
                        filter: 'blur(0.5px)' // Slight blur for 'liquid' look
                    }}
                />
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

// BrainCircuit is now imported from lucide-react

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
