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
    ChevronRight,
    Send,
    BrainCircuit,
    FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { API } from '@/lib/api';
import { PitchAnalysisResults } from '@/components/practice/PitchAnalysisResults';
import { MetricBar, AgentFeedbackCard } from '@/components/practice/shared';

export default function PracticePage() {
    const [activeSimulator, setActiveSimulator] = useState<'pitch' | 'collaboration' | 'deck' | null>(null);

    const simulators = [
        {
            id: 'pitch',
            title: "Pitch Simulator",
            desc: "The complete pitch training: Record your performance while our AI audits your deck, posture, and tone simultaneously.",
            icon: Mic,
            color: "text-primary",
            tags: ["Communication", "Deck Audit"]
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
        },
        {
            id: 'deck',
            title: "Deck Analyst",
            desc: "Upload your pitch deck for a comprehensive multi-agent review on content, design, and strategy.",
            icon: FileText,
            color: "text-primary",
            tags: ["Strategy", "Design"]
        }
    ];

    if (activeSimulator === 'pitch') {
        return <PitchSimulator onBack={() => setActiveSimulator(null)} />;
    }

    if (activeSimulator === 'collaboration') {
        return <CollaborationSimulator onBack={() => setActiveSimulator(null)} />;
    }

    if (activeSimulator === 'deck') {
        return <DeckAnalyst onBack={() => setActiveSimulator(null)} />;
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
    const [deckFile, setDeckFile] = useState<File | null>(null);
    const [presentationSlides, setPresentationSlides] = useState<any[]>([]);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [isExtracting, setIsExtracting] = useState(false);
    const [deckAnalysis, setDeckAnalysis] = useState<any>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const [frames, setFrames] = useState<string[]>([]);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (status === 'recording' && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
        }
    }, [status]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (status !== 'recording' || presentationSlides.length === 0) return;
            if (e.key === 'ArrowRight') {
                setCurrentSlideIndex(prev => Math.min(presentationSlides.length - 1, prev + 1));
            } else if (e.key === 'ArrowLeft') {
                setCurrentSlideIndex(prev => Math.max(0, prev - 1));
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [status, presentationSlides.length]);

    const captureFrame = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0);
                const frame = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
                setFrames(prev => {
                    const next = [...prev, frame];
                    return next.slice(-15); // Keep last 15 snapshots
                });
            }
        }
    };

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
            setFrames([]);

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                if (intervalRef.current) clearInterval(intervalRef.current);
                stream.getTracks().forEach(track => track.stop());
                streamRef.current = null;
                setStatus('processing');
            };

            intervalRef.current = setInterval(captureFrame, 2000);

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
        }
    };

    useEffect(() => {
        if (status === 'processing' && !recording) {
            const analysisTrigger = async () => {
                const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    const audioBase64 = (reader.result as string).split(',')[1];
                    await sendToAI(frames, audioBase64);
                };
            };
            analysisTrigger();
        }
    }, [status, recording]);

    const handleDeckUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext !== 'pdf' && ext !== 'pptx') {
            alert("Please upload a PDF or PPTX file.");
            return;
        }
        setDeckFile(file);
        setIsExtracting(true);

        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch(`${API.pitch.analyze.replace('/analyze', '/deck/extract')}`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.slides) {
                setPresentationSlides(data.slides);
                setCurrentSlideIndex(0);
            }
        } catch (err) {
            console.error("Extraction failed:", err);
        } finally {
            setIsExtracting(false);
        }
    };

    const sendToAI = async (videoFrames: string[], audio: string) => {
        try {
            const pitchPromise = fetch(API.pitch.analyze, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    video_frames: videoFrames,
                    audio_base64: audio,
                    transcript: ""
                })
            });

            let deckPromise = null;
            if (deckFile) {
                const formData = new FormData();
                formData.append('file', deckFile);
                deckPromise = fetch(`${API.pitch.analyze.replace('/analyze', '/deck/analyze')}`, {
                    method: 'POST',
                    body: formData
                });
            }

            const [pitchRes, deckRes] = await Promise.all([pitchPromise, deckPromise]);

            if (pitchRes.ok) {
                const pitchData = await pitchRes.json();
                setAnalysisResult(pitchData);
            }

            if (deckRes && deckRes.ok) {
                const deckData = await deckRes.json();
                setDeckAnalysis(deckData);
            }

            setStatus('done');
        } catch (err) {
            console.error("Error calling AI:", err);
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
                    {deckFile && (
                        <span className="text-xs font-bold px-3 py-1 bg-green-500/10 text-green-500 rounded-full border border-green-500/20 flex items-center gap-2">
                            <FileText className="w-3 h-3" /> {deckFile.name}
                        </span>
                    )}
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
                                <p className="text-muted-foreground max-w-sm mx-auto text-lg mb-8">
                                    Our multi-agent system will analyze your posture, tone, and your deck simultaneously.
                                </p>

                                <div className="flex flex-col items-center gap-4">
                                    <button
                                        onClick={startRecording}
                                        disabled={isExtracting}
                                        className="btn-primary px-10 py-4 text-lg bg-gradient-to-r from-primary to-secondary border-none hover:scale-105 transition-transform disabled:opacity-50"
                                    >
                                        {isExtracting ? "Extracting Slides..." : "Start Session"}
                                    </button>

                                    <label className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                                        <FileText className="w-4 h-4" />
                                        {deckFile ? deckFile.name : "Attach Pitch Deck (PDF/PPTX)"}
                                        <input type="file" className="hidden" accept=".pdf,.pptx" onChange={handleDeckUpload} />
                                    </label>
                                </div>
                            </div>
                        )}

                        {(status === 'recording' || status === 'processing') && (
                            <div className="relative w-full h-full flex items-center justify-center bg-slate-900">
                                {presentationSlides.length > 0 && status === 'recording' ? (
                                    <div className="relative w-full h-full flex flex-col">
                                        <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-black">
                                            <img
                                                src={`data:image/png;base64,${presentationSlides[currentSlideIndex].image}`}
                                                alt={`Slide ${currentSlideIndex + 1}`}
                                                className="max-h-full max-w-full object-contain shadow-2xl"
                                            />

                                            <div className="absolute top-6 right-6 w-48 aspect-video rounded-xl overflow-hidden border-2 border-primary/50 shadow-2xl bg-black ring-4 ring-black/50">
                                                <video
                                                    ref={videoRef}
                                                    autoPlay
                                                    muted
                                                    playsInline
                                                    className="w-full h-full object-cover grayscale-[0.3]"
                                                />
                                            </div>

                                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/60 backdrop-blur-xl px-6 py-3 rounded-full border border-white/10 shadow-2xl">
                                                <button
                                                    onClick={() => setCurrentSlideIndex(prev => Math.max(0, prev - 1))}
                                                    disabled={currentSlideIndex === 0}
                                                    className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-30"
                                                >
                                                    <ChevronLeft className="w-5 h-5" />
                                                </button>
                                                <span className="text-sm font-bold tracking-tight min-w-[60px] text-center">
                                                    {currentSlideIndex + 1} / {presentationSlides.length}
                                                </span>
                                                <button
                                                    onClick={() => setCurrentSlideIndex(prev => Math.min(presentationSlides.length - 1, prev + 1))}
                                                    disabled={currentSlideIndex === presentationSlides.length - 1}
                                                    className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-30"
                                                >
                                                    <ChevronRight className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        muted
                                        playsInline
                                        className={cn("w-full h-full object-cover grayscale-[0.3] brightness-90", status === 'processing' && "blur-sm opacity-50")}
                                    />
                                )}
                            </div>
                        )}

                        {status === 'recording' && (
                            <div className="absolute top-6 left-6 flex items-center gap-3 bg-red-500/10 backdrop-blur-md px-4 py-2 rounded-full border border-red-500/20 z-10">
                                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                                <span className="text-xs font-bold uppercase tracking-widest">Live Pitching</span>
                            </div>
                        )}

                        {status === 'processing' && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center bg-black/80 backdrop-blur-md z-20">
                                <Sparkles className="w-16 h-16 text-primary animate-bounce mb-6" />
                                <h2 className="text-3xl font-bold mb-3 font-heading tracking-tight">Consulting Agents...</h2>
                                <p className="text-muted-foreground text-lg max-w-sm">The Posture, Tone, and Strategy agents are compiling your report.</p>
                                <div className="mt-8 flex gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce" />
                                </div>
                            </div>
                        )}

                        {status === 'done' && (
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 flex flex-col items-center justify-center p-12 text-center z-20 backdrop-blur-sm">
                                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6 border border-green-500/30">
                                    <ShieldCheck className="w-10 h-10 text-green-500" />
                                </div>
                                <h2 className="text-4xl font-bold mb-4 font-heading tracking-tight">Simulation Complete!</h2>
                                <p className="text-muted-foreground text-lg mb-8">Scroll down to view your 360° coaching report.</p>
                                <button onClick={() => setStatus('idle')} className="px-8 py-3 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-sm font-bold uppercase tracking-widest transition-all">
                                    New Pitch
                                </button>
                            </div>
                        )}

                        {status === 'recording' && (
                            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-10 w-full">
                                <button
                                    onClick={stopRecording}
                                    className="px-10 py-4 rounded-full bg-red-500 text-white font-bold text-lg hover:bg-red-600 shadow-2xl shadow-red-500/40 transition-all active:scale-95 group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 bg-white rounded-full group-hover:scale-125 transition-transform" />
                                        <span>Finish Pitch & Analyze</span>
                                    </div>
                                </button>
                                {presentationSlides.length > 0 && (
                                    <p className="text-[10px] uppercase font-bold tracking-widest text-white/40 bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
                                        Use arrow keys or buttons to navigate slides
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Dynamic Multi-Agent Monitoring during Recording/Processing */}
                    {(status === 'recording' || status === 'processing') && (
                        <div className="glass-card p-8 bg-slate-900/50 border-primary/20 relative overflow-hidden animate-fade-in shadow-[0_0_50px_-12px_rgba(59,130,246,0.3)]">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] -mr-32 -mt-32 rounded-full" />
                            <div className="flex items-center justify-between mb-8 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="flex gap-1">
                                        <div className="w-1 h-4 bg-primary animate-pulse" />
                                        <div className="w-1 h-4 bg-primary animate-pulse [animation-delay:0.2s]" />
                                        <div className="w-1 h-4 bg-primary animate-pulse [animation-delay:0.4s]" />
                                    </div>
                                    <h3 className="text-xl font-bold tracking-tight">Active Multi-Agent Monitoring</h3>
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                                    {status === 'recording' ? 'Live Telemetry' : 'Syncing Insights'}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
                                {[
                                    { name: 'Posture Expert', icon: Video, status: status === 'recording' ? 'Tracking Geometry' : 'Extracting Trends' },
                                    { name: 'Tone Analyst', icon: Mic, status: status === 'recording' ? 'Analyzing Frequency' : 'Measuring Stress' },
                                    { name: 'Strategy Coach', icon: BrainCircuit, status: status === 'recording' ? 'Parsing Narrative' : 'Finalizing Audit' }
                                ].map((agent, i) => (
                                    <div key={i} className="flex flex-col gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                                <agent.icon className="w-4 h-4" />
                                            </div>
                                            <span className="text-xs font-bold text-white/90">{agent.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full bg-primary animate-shimmer" style={{ width: '40%' }} />
                                            </div>
                                            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground animate-pulse">
                                                {agent.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Final AI Recommendations displayed only after analysis */}
                    {status === 'done' && analysisResult && (
                        <div className="glass-card p-8 bg-slate-900/50 border-white/5 relative overflow-hidden animate-fade-in-up">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl rounded-full -mr-16 -mt-16" />
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-3 relative z-10">
                                <Sparkles className="w-5 h-5 text-primary" /> Personalized AI Recommendations
                            </h3>

                            <div className="space-y-6 relative z-10">
                                <p className="text-base text-muted-foreground italic leading-relaxed border-l-2 border-primary/30 pl-6 font-medium">
                                    "{typeof analysisResult.summary === 'string' ? analysisResult.summary : 'Great work on your pitch! See the details below.'}"
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {analysisResult?.recommendations?.map((rec: any, i: number) => (
                                        <div key={i} className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-all duration-300">
                                            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-xs flex-shrink-0 font-bold group-hover:bg-primary group-hover:text-white transition-all duration-300">
                                                {i + 1}
                                            </div>
                                            <span className="text-sm text-muted-foreground group-hover:text-white transition-colors leading-relaxed">
                                                {typeof rec === 'string' ? rec : JSON.stringify(rec)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                {analysisResult?.posture?.trends && (
                                    <div className="pt-4 border-t border-white/5">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-2 flex items-center gap-2">
                                            <LineChart className="w-4 h-4" /> Performance Trend
                                        </h4>
                                        <p className="text-xs text-secondary font-medium leading-relaxed">
                                            {analysisResult.posture.trends}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <PitchAnalysisResults
                        analysisResult={analysisResult}
                        deckAnalysis={deckAnalysis}
                        hasSlides={presentationSlides.length > 0}
                    />
                </div>
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

function DeckAnalyst({ onBack }: { onBack: () => void }) {
    const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'done'>('idle');
    const [analysisResult, setAnalysisResult] = useState<any>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext !== 'pdf' && ext !== 'pptx') {
            alert("Please upload a PDF or PPTX file.");
            return;
        }

        setStatus('uploading');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${API.pitch.analyze.replace('/analyze', '/deck/analyze')}`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error("Analysis failed");

            const data = await response.json();
            setAnalysisResult(data);
            setStatus('done');
        } catch (err) {
            console.error(err);
            alert("Error analyzing deck. Please try again.");
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
                        Multi-Agent: Content, Design, Strategy
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-white">
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass-card bg-slate-950 border-white/5 aspect-[16/10] flex items-center justify-center relative overflow-hidden rounded-3xl shadow-2xl">
                        {status === 'idle' && (
                            <div className="text-center p-12">
                                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center mx-auto mb-8 shadow-inner">
                                    <FileText className="w-10 h-10 text-primary animate-pulse" />
                                </div>
                                <h2 className="text-4xl font-bold mb-4 font-heading tracking-tight">Pitch Deck Analysis</h2>
                                <p className="text-muted-foreground max-w-sm mx-auto text-lg">
                                    Upload your deck for a deep-dive analysis by our specialized AI agents.
                                </p>
                                <label className="btn-primary mt-10 px-10 py-4 text-lg bg-gradient-to-r from-primary to-secondary border-none hover:scale-105 transition-transform cursor-pointer inline-block">
                                    Upload Deck (PDF/PPTX)
                                    <input type="file" className="hidden" accept=".pdf,.pptx" onChange={handleFileUpload} />
                                </label>
                            </div>
                        )}

                        {(status === 'uploading' || status === 'processing') && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center bg-black/60 backdrop-blur-md">
                                <Sparkles className="w-16 h-16 text-primary animate-bounce mb-6" />
                                <h2 className="text-3xl font-bold mb-3 font-heading">
                                    {status === 'uploading' ? 'Analyzing Deck...' : 'Agents at Work...'}
                                </h2>
                                <p className="text-muted-foreground text-lg">
                                    Our Content, Design, and Strategy agents are reviewing your slides.
                                </p>
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
                                <h2 className="text-4xl font-bold mb-4 font-heading">Pitch Deck Analyzed!</h2>
                                <p className="text-muted-foreground text-lg mb-8">Comprehensive feedback from all agents is ready below.</p>
                                <button onClick={() => setStatus('idle')} className="px-6 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-sm font-bold uppercase tracking-widest transition-all">
                                    Analyze Another
                                </button>
                            </div>
                        )}
                    </div>

                    {status === 'done' && analysisResult && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <AgentFeedbackCard
                                agent="Content"
                                score={analysisResult.content_analysis?.score || 0}
                                feedback={analysisResult.content_analysis?.feedback || ""}
                                details={analysisResult.content_analysis?.weaknesses || []}
                            />
                            <AgentFeedbackCard
                                agent="Design"
                                score={analysisResult.design_analysis?.score || 0}
                                feedback={analysisResult.design_analysis?.feedback || ""}
                                details={analysisResult.design_analysis?.visual_tips || []}
                            />
                            <AgentFeedbackCard
                                agent="Strategy"
                                score={analysisResult.strategy_analysis?.score || 0}
                                feedback={analysisResult.strategy_analysis?.feedback || ""}
                                details={analysisResult.strategy_analysis?.strategic_advice || []}
                            />
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <div className="glass-card p-8 border-white/5 bg-slate-900/40">
                        <h3 className="text-xl font-bold mb-8 flex items-center justify-between">
                            Overall Score <LineChart className="w-5 h-5 text-muted-foreground" />
                        </h3>
                        <div className="text-center py-6">
                            <div className="text-6xl font-bold text-primary mb-2">
                                {analysisResult?.overall_score || 0}
                            </div>
                            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Composite Index</div>
                        </div>
                        <div className="space-y-6 mt-8">
                            <MetricBar label="Content" value={analysisResult?.content_analysis?.score || 0} color="bg-primary" />
                            <MetricBar label="Design" value={analysisResult?.design_analysis?.score || 0} color="bg-secondary" />
                            <MetricBar label="Strategy" value={analysisResult?.strategy_analysis?.score || 0} color="bg-accent" />
                        </div>
                    </div>

                    {analysisResult && (
                        <div className="glass-card p-8 border-primary/30 bg-primary/5 animate-fade-in ring-1 ring-primary/20">
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-3 text-primary tracking-tight">
                                <Sparkles className="w-5 h-5" /> Executive Summary
                            </h3>
                            <p className="text-sm text-muted-foreground italic leading-relaxed mb-8 border-l-2 border-primary/30 pl-6">
                                {analysisResult.summary}
                            </p>
                            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Strategic Recommendations</h4>
                            <ul className="space-y-3">
                                {analysisResult.recommendations?.map((rec: string, i: number) => (
                                    <li key={i} className="flex gap-3 text-xs font-medium">
                                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] flex-shrink-0 mt-0.5 font-bold">
                                            {i + 1}
                                        </div>
                                        <span className="text-muted-foreground">{rec}</span>
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
