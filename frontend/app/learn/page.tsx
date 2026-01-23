"use client";

import { useState } from 'react';
import {
    MessageSquare,
    BookOpen,
    ChevronRight,
    ChevronLeft,
    X,
    Send,
    Sparkles,
    Play,
    RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LearningPage() {
    const [activeTab, setActiveTab] = useState<'teacher' | 'board'>('teacher');
    const [chatOpen, setChatOpen] = useState(true);
    const [messages, setMessages] = useState([
        { role: 'teacher', text: "Hello Alex! Today we're exploring 'Active Listening'. This is a core soft skill. Ready to start?" }
    ]);
    const [input, setInput] = useState("");

    const handleSend = () => {
        if (!input.trim()) return;
        setMessages([...messages, { role: 'user', text: input }]);
        setInput("");

        // Mock response
        setTimeout(() => {
            setMessages(prev => [...prev, { role: 'teacher', text: "That's a great point! Active listening isn't just about hearing; it's about understanding the intent. Look at the virtual board for the 5-step framework." }]);
        }, 1000);
    };

    return (
        <div className="h-[calc(100vh-160px)] flex gap-6 overflow-hidden">
            {/* Left: Virtual Teacher Panel */}
            <div className={cn(
                "glass-card flex flex-col transition-all duration-300 overflow-hidden",
                chatOpen ? "w-1/3" : "w-16"
            )}>
                <div className="p-4 border-b border-border flex items-center justify-between bg-surface/50">
                    {chatOpen && <h3 className="font-bold flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Virtual Teacher</h3>}
                    <button onClick={() => setChatOpen(!chatOpen)} className="p-1 hover:bg-white/10 rounded-lg">
                        {chatOpen ? <ChevronLeft className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                    </button>
                </div>

                {chatOpen ? (
                    <>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                            <div className="aspect-video bg-slate-800 rounded-xl mb-4 overflow-hidden relative border border-white/10">
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-2 animate-pulse">
                                            <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Teacher" alt="AI Avatar" />
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-[10px] font-bold uppercase tracking-wider text-green-400">
                                    Live AI
                                </div>
                            </div>

                            {messages.map((m, i) => (
                                <div key={i} className={cn(
                                    "flex flex-col max-w-[85%]",
                                    m.role === 'user' ? "ml-auto items-end" : "items-start"
                                )}>
                                    <div className={cn(
                                        "px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                                        m.role === 'user' ? "bg-primary text-white rounded-br-none" : "bg-white/5 text-foreground rounded-bl-none border border-white/10"
                                    )}>
                                        {m.text}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 border-t border-border bg-surface/50">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder="Ask a question (e.g. 'ma fhemtch')..."
                                    className="w-full bg-background border border-border rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                                <button
                                    onClick={handleSend}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-primary/20 text-primary hover:bg-primary hover:text-white transition-all"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center py-4 space-y-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <Sparkles className="w-5 h-5" />
                        </div>
                    </div>
                )}
            </div>

            {/* Right: Virtual Board Side */}
            <div className="flex-1 flex flex-col gap-6">
                <div className="glass-card flex-1 flex flex-col bg-slate-900 border-primary/20 shadow-2xl overflow-hidden relative">
                    {/* Board Header */}
                    <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                <BookOpen className="w-4 h-4" /> Virtual Board
                            </div>
                            <div className="h-4 w-[1px] bg-white/10" />
                            <div className="text-sm font-semibold">Active Listening Framework</div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button className="p-1.5 rounded-md hover:bg-white/5 transition-colors text-muted-foreground"><RotateCcw className="w-4 h-4" /></button>
                            <button className="px-3 py-1 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-xs font-bold uppercase">Lesson 1.4</button>
                        </div>
                    </div>

                    {/* Board Content Area */}
                    <div className="flex-1 p-12 flex items-center justify-center relative">
                        <div className="max-w-3xl w-full">
                            <div className="grid grid-cols-2 gap-8 relative">
                                {/* Visual Diagram Placeholder */}
                                <div className="aspect-square glass-card bg-primary/5 border-dashed border-primary/40 flex flex-col items-center justify-center text-center p-8 group hover:bg-primary/10 cursor-pointer">
                                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <Play className="w-6 h-6 text-primary fill-current" />
                                    </div>
                                    <h4 className="font-bold mb-2">The 5 Core Principles</h4>
                                    <p className="text-xs text-muted-foreground">Interactive animation of the feedback loop</p>
                                </div>

                                <div className="flex flex-col justify-center space-y-6">
                                    {[
                                        { num: '01', title: 'Receiving', desc: 'Focus on the raw data' },
                                        { num: '02', title: 'Understanding', desc: 'Processing intent' },
                                        { num: '03', title: 'Remembering', desc: 'Retaining key points' },
                                    ].map((step, i) => (
                                        <div key={i} className="flex gap-4 items-start p-4 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/10 group">
                                            <span className="text-2xl font-black text-primary/30 group-hover:text-primary transition-colors">{step.num}</span>
                                            <div>
                                                <h4 className="font-bold text-sm leading-tight">{step.title}</h4>
                                                <p className="text-xs text-muted-foreground">{step.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* AI Callout */}
                        <div className="absolute bottom-8 right-8 max-w-[240px] glass-card p-4 bg-accent/10 border-accent/20 animate-bounce-subtle">
                            <p className="text-xs leading-relaxed italic text-accent">
                                "Tip: 80% of communication is non-verbal. Look for body cues!"
                            </p>
                        </div>
                    </div>

                    {/* Board Footer / Controls */}
                    <div className="p-3 bg-black/40 border-t border-white/5 flex items-center justify-between">
                        <div className="flex gap-1 h-1 w-64 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-primary w-1/3" />
                        </div>
                        <div className="flex items-center gap-2">
                            <button className="p-2 rounded-xl text-muted-foreground hover:bg-white/5"><ChevronLeft className="w-5 h-5" /></button>
                            <span className="text-xs font-bold text-muted-foreground leading-none px-2">Page 4 of 12</span>
                            <button className="p-2 rounded-xl text-primary hover:bg-primary/10"><ChevronRight className="w-5 h-5" /></button>
                        </div>
                    </div>
                </div>

                {/* Bottom Drawer: Quizzes / Flashcards */}
                <div className="h-20 glass-card bg-surface/30 border-dashed border-border flex items-center justify-center gap-8 px-8 group cursor-pointer hover:bg-surface/50 overflow-hidden">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-500">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div className="hidden md:block">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground leading-none mb-1">Upcoming Challenge</p>
                            <h4 className="text-sm font-bold leading-none">Instant Quiz Pop-up</h4>
                        </div>
                    </div>
                    <div className="h-8 w-[1px] bg-white/10" />
                    <p className="text-xs text-muted-foreground flex-1">
                        Reinforce your learning with quick flashcards based on this session.
                    </p>
                    <button className="btn-primary py-2 px-4 text-xs font-bold uppercase tracking-widest">
                        Preview Flashcards
                    </button>
                </div>
            </div>
        </div>
    );
}
