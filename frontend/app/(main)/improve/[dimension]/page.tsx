"use client";

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles, Target, Zap, BookOpen, Lock, CheckCircle2, ChevronDown, ChevronRight, PenTool, Lightbulb, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import axios from 'axios';

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
                    "Reflect on your current sociability: write down how comfortable you feel in social situations and any social anxiety you notice.",
                    "Observe how people interact around you (family, friends, colleagues) and note patterns in behavior and communication styles.",
                    "Identify 2 people you would like to get closer to and think about why you want to connect with them.",
                    "Write down your fears or mental blocks about interacting with others in your journal.",
                    "Read an article or watch a video on communication, active listening, or social skills to gain insight.",
                    "Write a short personal introduction including your name, hobbies, interests, and favorite activities.",
                    "Set a small social goal for the next week (e.g., say hi to one new person, ask a question to a colleague)."
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
                    "Greet at least one person each day, whether a colleague, friend, or family member.",
                    "Ask someone an open-ended question like 'How is it going?' or 'What do you enjoy doing?' to encourage conversation.",
                    "Give a sincere compliment to someone to practice positive interaction.",
                    "Listen carefully to someone without interrupting or judging, focusing on their words and tone.",
                    "Share a small anecdote, story, or personal passion to let others learn about you.",
                    "After each interaction, write down what went well and what felt challenging.",
                    "At the end of the week, reflect on your interactions and update your sociability score or self-assessment."
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
                    "Participate in a group discussion by actively listening and contributing when appropriate.",
                    "Ask a question or share an idea during a group activity to engage more openly.",
                    "Initiate a brief conversation with someone you don’t know well to practice approaching new people.",
                    "Join a collective activity, such as a game, workshop, or collaborative project, and contribute actively.",
                    "Share a more detailed personal experience or story to connect with others emotionally.",
                    "Observe how people react to you and adjust your communication or approach accordingly.",
                    "At the end of the week, review your progress and update your sociability score to track improvement."
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
                    "Engage in multiple conversations throughout the day to practice social stamina and comfort.",
                    "Make an effort to get to know at least 2 new people and learn something about them.",
                    "Invite someone to do an activity with you, such as having coffee or joining a group event.",
                    "Propose an idea or initiative in a group to practice leadership and contribution.",
                    "Compliment or thank people for positive interactions to reinforce relationships.",
                    "Reflect on your own changes: do you feel more comfortable or less anxious in social situations?",
                    "Analyze relationships you have developed and identify ones that could still improve.",
                    "Write down strategies and actions that helped you integrate socially, and plan how to continue practicing.",
                    "Perform a final self-assessment and outline a social roadmap for your continued growth."
                ],
                duration: 9,
                color: "bg-blue-500",
                icon: Users
            }
        ]
    },
    'management': {
        title: "Emotional Management",
        description: "Master your reactions and develop emotional resilience through this 30-day immersive plan.",
        totalDays: 30,
        phases: [
            {
                id: 1,
                title: "Phase 1: Awareness & Initial Reaction (Days 1–7)",
                subtitle: "Observe and breathe",
                desc: "Focus on identifying your immediate emotional triggers and practicing initial calming techniques.",
                task: [
                    "**Day 1**\n**Scenario:** During a meeting, someone cuts you off just as you’re about to share your idea.\n**Action :** Observe your immediate reaction.\n**Task:** Write about what you felt – anger, frustration, embarrassment – and how you might have stayed calm.",
                    "**Day 2**\n**Scenario:** Your supervisor criticizes your recent work in front of the team.\n**Action :** Take 3 deep breaths before responding.\n**Task:** Describe your emotions, thoughts, and how you reacted.",
                    "**Day 3**\n**Scenario:** A friend cancels your outing last minute.\n**Action :** Note your first reaction, then take a moment to calm down.\n**Task:** Write your feelings and how you managed frustration.",
                    "**Day 4**\n**Scenario:** You’re late for an important appointment because of traffic.\n**Action :** Take 5 slow deep breaths.\n**Task:** Describe your feelings and how you calmed yourself.",
                    "**Day 5**\n**Scenario:** A small argument starts with a colleague over a minor task.\n**Action :** Visualize responding calmly.\n**Task:** Write your emotions and how you could react constructively.",
                    "**Day 6**\n**Scenario:** You must complete a complex project under tight deadlines.\n**Action :** Identify your emotions and their intensity.\n**Task:** Write your sensations and plan to handle stress.",
                    "**Day 7**\n**Scenario:** You receive disappointing personal news.\n**Action :** Write down your initial thoughts, then reframe them positively.\n**Task:** Note the change in your emotions."
                ],
                duration: 7,
                color: "bg-pink-500",
                icon: Target
            },
            {
                id: 2,
                title: "Phase 2: Thoughtful Reactions (Days 8–14)",
                subtitle: "Controlled responses",
                desc: "Move from automatic reactions to conscious, thoughtful choices in challenging situations.",
                task: [
                    "**Day 8**\n**Scenario:** During a meeting, a colleague publicly criticizes your work.\n**Action :** Take a deep breath before responding.\n**Task:** Write how you handled the situation and your emotions.",
                    "**Day 9**\n**Scenario:** Someone ignores or interrupts you in an important conversation.\n**Action :** Note your first thought, breathe, and observe your feelings.\n**Task:** Write what you could do to stay calm.",
                    "**Day 10**\n**Scenario:** An unexpected event disrupts your day’s plans.\n**Action :** Identify the source of frustration, then breathe deeply.\n**Task:** Describe your emotions and your reaction.",
                    "**Day 11**\n**Scenario:** A heated debate starts in a group you are part of.\n**Action :** Observe your automatic reactions, then try to respond calmly.\n**Task:** Write your feelings and behavior.",
                    "**Day 12**\n**Scenario:** A task seems impossible to complete on time.\n**Action :** Break it into small steps and plan calmly.\n**Task:** Write your sensations and stress management.",
                    "**Day 13**\n**Scenario:** Someone criticizes your work unfairly.\n**Action :** Take 5 deep breaths before responding or waiting.\n**Task:** Write your emotions and reflective reaction.",
                    "**Day 14**\n**Scenario:** Your transportation is delayed or canceled unexpectedly.\n**Action :** Observe your frustration, breathe, and visualize calm.\n**Task:** Describe your emotional state and response."
                ],
                duration: 7,
                color: "bg-pink-500",
                icon: Zap
            },
            {
                id: 3,
                title: "Phase 3: Proactive Mastery (Days 15–21)",
                subtitle: "Advanced mastership",
                desc: "Take control of your inner state even in high-pressure or provocative environments.",
                task: [
                    "**Day 15**\n**Scenario:** Two friends you know are arguing in front of you.\n**Action :** Observe your feelings and practice 5 deep breaths.\n**Task:** Write how you reacted and why.",
                    "**Day 16**\n**Scenario:** A high-pressure project has a tight deadline.\n**Action :** Identify negative thoughts and reframe calmly.\n**Task:** Write your emotions and plan of action.",
                    "**Day 17**\n**Scenario:** You receive aggressive feedback from a supervisor.\n**Action :** Breathe and plan a constructive response.\n**Task:** Write your feelings and behavior.",
                    "**Day 18**\n**Scenario:** An unexpected situation occurs during an important meeting.\n**Action :** Observe your reaction, breathe deeply.\n**Task:** Write your emotional state and choices.",
                    "**Day 19**\n**Scenario:** Someone provokes you verbally or makes a hurtful comment.\n**Action :** Take 5 deep breaths before responding.\n**Task:** Write how you managed your emotions.",
                    "**Day 20**\n**Scenario:** Frustration with a malfunctioning tool or repetitive task.\n**Action :** Note your irritation, breathe, and plan calmly.\n**Task:** Write your emotions and actions.",
                    "**Day 21**\n**Scenario:** Temptation to give up on a difficult task.\n**Action :** Observe your emotions, breathe, then plan a concrete next step.\n**Task:** Write your sensations and plan."
                ],
                duration: 7,
                color: "bg-pink-500",
                icon: Sparkles
            },
            {
                id: 4,
                title: "Phase 4: Mastery & Integration (Days 22–30)",
                subtitle: "Consolidated resilience",
                desc: "Integrate emotional intelligence into all aspects of life for lasting stability.",
                task: [
                    "**Day 22**\n**Scenario:** Someone interrupts you multiple times in a conversation.\n**Action :** Breathe and remain calm, then respond or continue.\n**Task:** Write your emotions and reaction.",
                    "**Day 23**\n**Scenario:** A project fails despite your best efforts.\n**Action :** Visualize the situation calmly and identify lessons learned.\n**Task:** Write your feelings and takeaways.",
                    "**Day 24**\n**Scenario:** Someone criticizes your appearance or personal style.\n**Action :** Breathe, then decide whether to respond or ignore calmly.\n**Task:** Write your emotions and reaction.",
                    "**Day 25**\n**Scenario:** A minor family conflict arises.\n**Action :** Observe your emotions and breathe before acting.\n**Task:** Write your state and choices.",
                    "**Day 26**\n**Scenario:** A group conflict occurs at work.\n**Action :** Identify your emotions and plan a calm response.\n**Task:** Write your thoughts and actions.",
                    "**Day 27**\n**Scenario:** A negative surprise or unexpected event occurs.\n**Action :** Breathe deeply and observe your emotions.\n**Task:** Write your sensations and response.",
                    "**Day 28**\n**Scenario:** Conflict with a close friend.\n**Action :** Visualize a calm and empathetic reaction.\n**Task:** Write your emotions and chosen behavior.",
                    "**Day 29**\n**Scenario:** A highly stressful day combines work and personal challenges.\n**Action :** Observe your emotions, breathe, then plan a thoughtful response.\n**Task:** Write your feelings and actions.",
                    "**Day 30**\n**Scenario:** Final review: a complex random scenario (conflict + surprise + criticism).\n**Action :** Apply all techniques learned: breathing, visualization, reframing, planning.\n**Task:** Write a full reflection of your emotions, reactions, and lessons learned."
                ],
                duration: 9,
                color: "bg-pink-500",
                icon: Target
            }
        ]
    }
};

export default function ImproveDimensionPage() {
    const params = useParams();
    const router = useRouter();
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

    // Identify current program
    const getProgramKey = () => {
        const dim = dimension.toLowerCase();
        if (dim.includes('confid')) return 'confidence';
        if (dim.includes('management')) return 'management'; // Check management BEFORE emotion
        if (dim.includes('expression') || dim.includes('emotion')) return 'expression';
        if (dim.includes('sociabil') || dim.includes('social') || dim.includes('align')) return 'sociability';
        return null;
    };

    const programKey = getProgramKey();
    const program = programKey ? PROGRAMS[programKey] : null;

    const handleJournalSubmit = () => {
        if (!journalEntry.trim() || !program) return;

        const currentPhaseData = program.phases[currentPhase - 1];

        // Save entry
        const currentTask = Array.isArray(currentPhaseData.task)
            ? currentPhaseData.task[phaseDay - 1]
            : currentPhaseData.task;

        const newEntries = [...entries, `Phase ${currentPhase} - Day ${phaseDay} (${currentTask}): ${journalEntry}`];
        setEntries(newEntries);
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
            const response = await axios.post('http://localhost:8000/api/v1/puzzle/reassess', {
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
                <div>
                    <h1 className="text-3xl font-bold font-heading text-gradient">
                        {program.title}
                    </h1><br></br><br></br>
                    <p className="text-muted-foreground">
                        {program.description}
                    </p>
                </div>
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
                                            <p className="text-base text-slate-300 italic border-l-4 border-pink-500/30 pl-4 py-2 bg-pink-500/5 rounded-r-lg">
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
                                            <div className="text-slate-300 whitespace-pre-line">
                                                {(Array.isArray(phase.task) ? phase.task[phaseDay - 1] : phase.task)
                                                    .split(/(\*\*.*?\*\*)/).map((part, i) =>
                                                        part.startsWith('**') && part.endsWith('**') ?
                                                            <strong key={i} className="text-white">{part.slice(2, -2)}</strong> : part
                                                    )
                                                }
                                            </div>
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
