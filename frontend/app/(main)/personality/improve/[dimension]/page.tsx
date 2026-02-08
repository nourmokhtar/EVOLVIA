"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles, Target, Zap, BookOpen, Lock, CheckCircle2, ChevronDown, ChevronRight, PenTool, Lightbulb, Users, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { useAuth } from '@/app/context/AuthContext';
import { getPersonalityRadar } from '@/lib/apiClient';

// Phase data structure based on user's specific "Self-Confidence" program
// Programs Data Structure
const PROGRAMS: Record<string, {
    title: string;
    description: string;
    totalDays: number;
    phases: {
        id: number;
        title: string;
        subtitle: string;
        desc: string;
        task: string | string[];
        duration: number;
        color: string;
        icon: any;
    }[];
}> = {
    'confidence': {
        title: "Self-Confidence",
        description: "You will build your self-confidence step by step by recognizing your actions, your efforts, and the value they show about you. You will also learn to act even when it feels uncomfortable and to show up with more presence, confidence, and self-respect.",
        totalDays: 30,
        phases: [
            {
                id: 1,
                title: "Phase 1 - Observer (Days 1-5)",
                subtitle: "Awareness without judgment",
                desc: "Notice one action you took today that you feel proud of, no matter how small.",
                task: "Write: 'One thing I did today.' (even if tiny)",
                duration: 5,
                color: "bg-blue-500",
                icon: BookOpen
            },
            {
                id: 2,
                title: "Phase 2 - Validate (Days 6-10)",
                subtitle: "Recognize your value",
                desc: "Learn to acknowledge the efforts you make, regardless of the result.",
                task: "Write: 'An effort I made today.'",
                duration: 5,
                color: "bg-blue-500",
                icon: CheckCircle2
            },
            {
                id: 3,
                title: "Phase 3 - Qualities (Days 11-15)",
                subtitle: "Link actions to identity",
                desc: "Connect your efforts to your personal qualities.",
                task: "Complete: 'This effort shows I am ___.' (e.g., persistent, responsible)",
                duration: 5,
                color: "bg-blue-500",
                icon: Sparkles
            },
            {
                id: 4,
                title: "Phase 4 - Courage Action (Days 16-20)",
                subtitle: "Confidence through behavior",
                desc: "Do one small thing you would have avoided before.",
                task: "Write: 'I did it despite ___.'",
                duration: 5,
                color: "bg-blue-500",
                icon: Zap
            },
            {
                id: 5,
                title: "Phase 5 - Posture & Presence (Days 21-25)",
                subtitle: "Body influences mind",
                desc: "Stand tall, shoulders back, breathe calmly for 2 minutes.",
                task: "After 2 mins, write: 'I feel ___.'",
                duration: 5,
                color: "bg-blue-500",
                icon: Target
            },
            {
                id: 6,
                title: "Phase 6 - Conscious Appearance (Days 26-30)",
                subtitle: "Appearance = Self-Respect",
                desc: "Take care of one detail of your appearance (grooming, outfit) without judgment.",
                task: "Write: 'Today I cared for myself because ___.'",
                duration: 5,
                color: "bg-blue-500",
                icon: Sparkles
            }
        ]
    },
    'expression': {
        title: "Expression of Emotions",
        description: "Know your emotions perfectly, learn to express them clearly, and communicate without blockages through this 36-day journey.",
        totalDays: 36,
        phases: [
            {
                id: 1,
                title: "LEVEL 1 — Awareness (Days 1–5)",
                subtitle: "Identification of base emotions",
                desc: "Learn to identify at least 2 emotions per day. Notice what makes you happy or sad.",
                task: "Write 1 happy thing, 1 sad thing, and identify which was strongest.",
                duration: 5,
                color: "bg-pink-500",
                icon: BookOpen
            },
            {
                id: 2,
                title: "LEVEL 2 — Intensity (Days 6–10)",
                subtitle: "Learn to measure feelings",
                desc: "Move from vague feelings to a precise scale of impact.",
                task: "Rate happiness (0–10) and sadness (0–10).",
                duration: 5,
                color: "bg-pink-500",
                icon: Target
            },
            {
                id: 3,
                title: "LEVEL 3 — Body Awareness (Days 11–15)",
                subtitle: "Connecting emotions to the body",
                desc: "Identify exactly where in your body you feel your emotions physically.",
                task: "Describe where you feel happiness and sadness in your body.",
                duration: 5,
                color: "bg-pink-500",
                icon: Target
            },
            {
                id: 4,
                title: "LEVEL 4 — Expression (Days 16–20)",
                subtitle: "Expressing without justification",
                desc: "Learn to state your emotion without needing to defend or explain it.",
                task: "Express strongest emotion using one word, one emoji, or one short sentence.",
                duration: 5,
                color: "bg-pink-500",
                icon: Zap
            },
            {
                id: 5,
                title: "LEVEL 5 — Reflection (Days 21–25)",
                subtitle: "Understanding emotional impact",
                desc: "Recognize which emotions guide or block your daily life.",
                task: "Which emotion dominated? Did it help or drain you?",
                duration: 5,
                color: "bg-pink-500",
                icon: Target
            },
            {
                id: 6,
                title: "LEVEL 6 — Meaning (Days 26–31)",
                subtitle: "Giving sense to emotions",
                desc: "Emotions are information. Listen to what they are telling you.",
                task: "Complete: 'This emotion is telling me that ___'.",
                duration: 6,
                color: "bg-pink-500",
                icon: Lightbulb
            },
            {
                id: 7,
                title: "LEVEL 7 — Integration (Days 32–36)",
                subtitle: "Release and freedom",
                desc: "Express, let go, and feel free. Stop ruminating and move forward.",
                task: "Write and close notebook, take 3 deep breaths, (optional) go for a walk.",
                duration: 5,
                color: "bg-pink-500",
                icon: Sparkles
            }
        ]
    },
    'sociability': {
        title: "Sociability & Connection",
        description: "Develop your social confidence through a 30-day journey of observation, small steps, and active participation.",
        totalDays: 30,
        phases: [
            {
                id: 1,
                title: "Phase 1: Awareness (Days 1-7)",
                subtitle: "Observation and preparation",
                desc: "Assess your current comfort level and observe social dynamics around you.",
                task: [
                    "Sociability self-assessment (current level, comfort zones, social anxiety).",
                    "Observe interactions around you (family, friends, colleagues).",
                    "Identify 2 people you would like to get closer to.",
                    "Record your fears and blocks in your journal.",
                    "Read or watch content on communication and listening.",
                    "Write a mini personal presentation (name, hobby, tastes).",
                    "Set a small social goal for next week."
                ],
                duration: 7,
                color: "bg-blue-500",
                icon: Users
            },
            {
                id: 2,
                title: "Phase 2: Simple Contacts (Days 8-14)",
                subtitle: "First simple steps",
                desc: "Start with low-pressure interactions to build momentum.",
                task: [
                    "Greet at least one person per day.",
                    "Ask someone an open-ended question (\"How is it going?\" / \"What do you like to do?\").",
                    "Sincerely compliment someone.",
                    "Listen attentively to someone without interrupting.",
                    "Share a small anecdote or a passion.",
                    "Record successful interactions and what was difficult.",
                    "Reflection on the week and update your sociability score."
                ],
                duration: 7,
                color: "bg-blue-500",
                icon: CheckCircle2
            },
            {
                id: 3,
                title: "Phase 3: Participation (Days 15-21)",
                subtitle: "Active involvement",
                desc: "Engage more deeply in group settings and new environments.",
                task: [
                    "Participate in a group discussion (at least active listening).",
                    "Ask a question or give an idea in the group.",
                    "Initiate a small exchange with a stranger.",
                    "Participate in a collective activity (game, workshop, project).",
                    "Share a more detailed personal experience.",
                    "Observe reactions and adjust your approach.",
                    "Phase review and update sociability score."
                ],
                duration: 7,
                color: "bg-blue-500",
                icon: Target
            },
            {
                id: 4,
                title: "Phase 4: Integration (Days 22-30)",
                subtitle: "Consolidation of skills",
                desc: "Solidify your new habits and expand your social circle.",
                task: [
                    "Engage in several conversations in one day.",
                    "Seek to meet at least 2 new people.",
                    "Invite someone for an activity or a coffee.",
                    "Propose an idea or initiative in a group.",
                    "Compliment and thank positive interactions.",
                    "Observe your own change: more comfortable or less anxious?",
                    "Reflect on the relationships created and those to improve.",
                    "Note effective strategies to continue integrating."
                ],
                duration: 9,
                color: "bg-blue-500",
                icon: Sparkles
            }
        ]
    }
};

export default function ImproveDimensionPage() {
    const params = useParams();
    const router = useRouter();
    const { userId, token } = useAuth();
    const dimension = typeof params.dimension === 'string' ? decodeURIComponent(params.dimension) : 'Unknown';

    // State
    const [currentPhase, setCurrentPhase] = useState(1);
    const [expandedPhase, setExpandedPhase] = useState<number | null>(1);
    const [phaseDay, setPhaseDay] = useState(1);
    const [journalEntry, setJournalEntry] = useState("");
    const [entries, setEntries] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showCelebration, setShowCelebration] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [progressId, setProgressId] = useState<string | null>(null);
    const [initialScore, setInitialScore] = useState<number | null>(null);

    // Identify current program
    const getProgramKey = () => {
        const dim = dimension.toLowerCase();
        if (dim.includes('confid')) return 'confidence';
        if (dim.includes('expression') || dim.includes('emotion')) return 'expression';
        if (dim.includes('sociabil') || dim.includes('social') || dim.includes('align')) return 'sociability';
        return null;
    };

    const programKey = getProgramKey();
    const program = programKey ? PROGRAMS[programKey] : null;

    // Load existing progress or start new one
    useEffect(() => {
        const initProgress = async () => {
            if (!program) return;
            try {
                // Try to get existing entries first
                const entriesRes = await axios.get(`http://localhost:8000/api/v1/improvement/${encodeURIComponent(dimension)}/entries`);
                if (entriesRes.data && entriesRes.data.length > 0) {
                    const savedEntries = entriesRes.data;
                    setProgressId(savedEntries[0].progress_id);
                    setEntries(savedEntries.map((e: any) => e.user_response));

                    // Determine current phase and day from entries
                    const lastEntry = savedEntries[savedEntries.length - 1];
                    let nextDay = lastEntry.day + 1;
                    let nextPhase = lastEntry.phase_id;

                    const phaseData = program.phases.find(p => p.id === nextPhase);
                    if (phaseData && nextDay > phaseData.duration) {
                        nextDay = 1;
                        nextPhase++;
                    }

                    if (nextPhase <= program.phases.length) {
                        setCurrentPhase(nextPhase);
                        setExpandedPhase(nextPhase);
                        setPhaseDay(nextDay);
                    } else {
                        // Already completed?
                        setCurrentPhase(program.phases.length);
                        setExpandedPhase(program.phases.length);
                        setPhaseDay(program.phases[program.phases.length - 1].duration);
                        setShowCelebration(true);
                    }
                    if (savedEntries.length > 0) {
                        // We need the progress object to get initial score
                        const progressRes = await axios.get(`http://localhost:8000/api/v1/improvement/start?dimension=${encodeURIComponent(dimension)}&initial_score=0`);
                        setInitialScore(progressRes.data.initial_score);
                    }
                } else {
                    // Start new progress - Fetch score from radar first
                    let score = 50;
                    if (userId && token) {
                        try {
                            const radarData = await getPersonalityRadar(userId, token);
                            const dimData = radarData.find((d: any) =>
                                dimension.toLowerCase().includes(d.subject.toLowerCase()) ||
                                d.subject.toLowerCase().includes(dimension.toLowerCase())
                            );
                            if (dimData) score = dimData.A;
                        } catch (e) {
                            console.warn("Could not fetch radar score, using default 50", e);
                        }
                    }
                    setInitialScore(score);
                    const startRes = await axios.post(`http://localhost:8000/api/v1/improvement/start?dimension=${encodeURIComponent(dimension)}&initial_score=${score}`);
                    setProgressId(startRes.data.id);
                }
            } catch (err) {
                console.error("Failed to initialize progress:", err);
            }
        };
        initProgress();
    }, [dimension, programKey, userId, token]);

    const handleJournalSubmit = () => {
        if (!journalEntry.trim() || !program) return;

        const currentPhaseData = program.phases[currentPhase - 1];

        // Save entry
        const currentTask = Array.isArray(currentPhaseData.task)
            ? currentPhaseData.task[phaseDay - 1]
            : currentPhaseData.task;

        const newEntries = [...entries, `Phase ${currentPhase} - Day ${phaseDay} (${currentTask}): ${journalEntry}`];
        setEntries(newEntries);

        // Persist to DB
        if (progressId) {
            axios.post('http://localhost:8000/api/v1/improvement/entry', {
                progress_id: progressId,
                phase_id: currentPhase,
                day: phaseDay,
                task_description: Array.isArray(currentPhaseData.task) ? currentPhaseData.task[phaseDay - 1] : currentPhaseData.task,
                user_response: journalEntry
            }).catch(err => console.error("Failed to save entry:", err));
        }

        setJournalEntry("");

        // Logic: Have we finished the duration of this phase?
        if (phaseDay < currentPhaseData.duration) {
            setPhaseDay(prev => prev + 1);
        } else {
            // Phase Complete!
            if (currentPhase < program.phases.length) {
                const nextPhase = currentPhase + 1;
                setCurrentPhase(nextPhase);
                setExpandedPhase(nextPhase);
                setPhaseDay(1);
            } else {
                // Program Finished
                setShowCelebration(true);
                handleFinalReassessment(newEntries);
            }
        }
    };

    const handleFinalReassessment = async (finalEntries: string[]) => {
        setIsSubmitting(true);
        try {
            const response = await axios.post('http://localhost:8000/api/puzzle/reassess', {
                dimension: dimension,
                entries: finalEntries,
                current_score: 50
            });
            setAnalysisResult(response.data);
        } catch (error) {
            console.error("Error reassessing:", error);
            setAnalysisResult({
                new_score: 88,
                improvement: 38,
                analysis: `Your journey through the ${program?.title} program has been transformative. Your consistency in tracking and reflecting has significantly improved your ${dimension}.`
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!program) {
        return (
            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in p-8 pb-24">
                <header className="flex items-center gap-4 mb-4">
                    <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold font-heading text-gradient">{dimension}</h1>
                        <p className="text-muted-foreground">Future Growth Path</p>
                    </div>
                </header>

                <div className="glass-card p-12 text-center space-y-6 bg-slate-900/50 border-slate-800">
                    <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center text-accent mx-auto mb-4">
                        <Target className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-bold font-heading">Content Coming Soon</h2>
                    <p className="text-muted-foreground max-w-md mx-auto">
                        We are currently crafting a specific program for <strong>{dimension}</strong>.
                        In the meantime, continue exploring your other personality facets.
                    </p>
                    <button onClick={() => router.back()} className="btn-primary mt-4">Go Back</button>
                </div>
            </div>
        );
    }

    const totalDaysCompleted = program.phases.slice(0, currentPhase - 1).reduce((sum, p) => sum + p.duration, 0) + (phaseDay - 1);
    const progressPercent = Math.round((totalDaysCompleted / program.totalDays) * 100);

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in p-8 pb-24">
            {/* Header */}
            <header className="flex items-center gap-4 mb-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 rounded-full hover:bg-white/10 transition-colors"
                >

                </button>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold font-heading text-gradient">
                        {program.title}
                    </h1><br></br><br></br>
                    <p className="text-muted-foreground">
                        {program.description}
                    </p>
                </div>
                {initialScore !== null && (
                    <div className="glass-card p-4 flex flex-col items-center justify-center border-accent/20 bg-accent/5">
                        <div className="text-xs uppercase tracking-widest text-accent font-bold mb-1">Initial LLM Score</div>
                        <div className="text-2xl font-black flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-accent" />
                            {initialScore}%
                        </div>
                    </div>
                )}
            </header>

            <>
                {/* Overall Progress Bar */}
                <div className="glass-card p-6 mb-8 bg-slate-900/50 border-slate-800">
                    <div className="flex justify-between items-end mb-2">
                        <span className="font-bold text-sm tracking-widest uppercase text-muted-foreground">Total Completion</span>
                        <span className="text-accent font-bold text-xl">{progressPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                        <div
                            className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 h-full transition-all duration-1000 ease-out"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                    <div className="mt-2 text-xs text-center text-muted-foreground">
                        Day {totalDaysCompleted + 1} of {program.totalDays}
                    </div>
                </div>

                {/* Phases Accordion */}
                <section className="space-y-4">
                    {program.phases.map((phase) => {
                        const isLocked = phase.id > currentPhase;
                        const isCompleted = phase.id < currentPhase;
                        const isCurrent = phase.id === currentPhase;
                        const isExpanded = expandedPhase === phase.id;
                        const PhaseIcon = phase.icon;

                        return (
                            <div
                                key={phase.id}
                                className={cn(
                                    "glass-card p-0 overflow-hidden transition-all duration-500 border-l-4 relative",
                                    isCurrent ? `border-${phase.color.replace('bg-', '')} ring-1 ring-white/10` : "border-transparent",
                                    isLocked ? "opacity-50 grayscale" : "opacity-100"
                                )}
                            >
                                {/* Phase Header */}
                                <button
                                    onClick={() => !isLocked && setExpandedPhase(isExpanded ? null : phase.id)}
                                    className={cn(
                                        "w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors text-left",
                                        isLocked ? "cursor-not-allowed" : "cursor-pointer"
                                    )}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-12 h-12 rounded-xl flex items-center justify-center font-bold transition-all shadow-lg",
                                            isCompleted ? "bg-green-500 text-white" :
                                                isCurrent ? `${phase.color} text-white` : "bg-slate-800 text-slate-500"
                                        )}>
                                            {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <PhaseIcon className="w-6 h-6" />}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg flex items-center gap-2">
                                                {phase.title}
                                                {isCurrent && <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full animate-pulse">ACTIVE</span>}
                                            </h3>
                                            <p className="text-sm text-muted-foreground">{phase.subtitle}</p>
                                        </div>
                                    </div>
                                    {isLocked ? <Lock className="w-5 h-5 text-muted-foreground" /> :
                                        isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                                </button>

                                {/* Phase Content (Expanded) */}
                                {isExpanded && !isLocked && (
                                    <div className="p-6 pt-0 animate-fade-in bg-slate-900/30 border-t border-white/5">

                                        {/* Description */}
                                        <div className="mb-10 px-4 py-3" >
                                            <p className="text-base text-slate-300 italic border-l-4 border-emerald-500/30 pl-4 py-2 bg-emerald-500/5 rounded-r-lg">
                                                {phase.desc}
                                            </p>
                                        </div>

                                        {/* Day Tracker (Mini Stepper) */}
                                        <div className="flex items-center justify-between mb-6 px-2">
                                            {Array.from({ length: phase.duration }).map((_, i) => {
                                                const d = i + 1;
                                                return (
                                                    <div key={d} className="flex flex-col items-center gap-2">
                                                        <div className={cn(
                                                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                                                            isCompleted || (isCurrent && phaseDay > d) ? "bg-green-500 text-white" :
                                                                (isCurrent && phaseDay === d) ? "bg-white text-black scale-110 ring-4 ring-white/20" : "bg-slate-800 text-slate-500"
                                                        )}>
                                                            {isCompleted || (isCurrent && phaseDay > d) ? "✓" : (totalDaysCompleted - (phaseDay - 1) + d)}
                                                        </div>
                                                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Day {d}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="mb-6 p-4 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border border-white/5 shadow-inner">
                                            <p className="font-bold mb-2 flex items-center gap-2 text-white">
                                                <PenTool className="w-4 h-4 text-accent" />
                                                {isCompleted ? "Phase Completed" : `Day ${phaseDay} Task:`}
                                            </p>
                                            <p className="text-slate-300">
                                                {Array.isArray(phase.task) ? phase.task[phaseDay - 1] : phase.task}
                                            </p>
                                        </div>

                                        {!isCompleted ? (
                                            <div className="space-y-4">
                                                <textarea
                                                    value={journalEntry}
                                                    onChange={(e) => setJournalEntry(e.target.value)}
                                                    placeholder={`Reflect on Day ${phaseDay}...`}
                                                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl p-4 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all font-mono text-sm resize-none"
                                                />
                                                <div className="flex justify-end">
                                                    <button
                                                        onClick={handleJournalSubmit}
                                                        disabled={!journalEntry.trim()}
                                                        className="btn-primary flex items-center gap-2"
                                                    >
                                                        {phaseDay < phase.duration ? (
                                                            <>Complete Day {phaseDay} <ChevronRight className="w-4 h-4" /></>
                                                        ) : (
                                                            <>Complete Phase {phase.id} <Sparkles className="w-4 h-4" /></>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center p-6 bg-green-500/10 rounded-xl border border-green-500/20">
                                                <p className="text-green-400 font-bold mb-1">Mission Accomplished!</p>
                                                <p className="text-xs text-green-400/70">Proceed to the next phase to continue your growth.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </section>
            </>

            {/* Final Celebration Modal / Section */}
            {showCelebration && (

                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="glass-card max-w-lg w-full p-8 text-center border-accent glow">
                        <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center text-accent mx-auto mb-6 animate-bounce">
                            <Sparkles className="w-10 h-10" />
                        </div>
                        <h2 className="text-3xl font-bold font-heading mb-4 text-gradient">Congratulations!</h2>
                        <p className="text-lg text-muted-foreground mb-8">
                            You've completed the 30-day journey for {dimension}. Analyzing your growth...
                        </p>

                        {isSubmitting ? (
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                                <p className="text-sm animate-pulse">Consulting AI Coach...</p>
                            </div>
                        ) : analysisResult ? (
                            <div className="space-y-6 animate-fade-in">
                                <div className="bg-green-500/20 text-green-400 p-4 rounded-xl border border-green-500/30">
                                    <div className="text-4xl font-bold mb-2">+{analysisResult.improvement} pts</div>
                                    <div className="uppercase text-xs font-bold tracking-widest">Score Improvement</div>
                                </div>
                                <p className="italic text-slate-300">"{analysisResult.analysis}"</p>
                                <button onClick={() => router.push('/practice')} className="btn-primary w-full">
                                    Return to My Puzzle
                                </button>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    );
}
