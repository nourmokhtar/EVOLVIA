"use client";

import { cn } from '@/lib/utils';
import {
    MessageSquare,
    Zap,
    BrainCircuit,
    Sparkles
} from 'lucide-react';

export function MetricBar({ label, value, color }: { label: string, value: number, color: string }) {
    return (
        <div className="space-y-3">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                <span>{label}</span>
                <span className="text-foreground">{value}%</span>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div
                    className={cn("h-full transition-all duration-1000", color)}
                    style={{ width: `${value}%` }}
                />
            </div>
        </div>
    );
}

export function AgentFeedbackCard({
    agent,
    score,
    feedback,
    details = []
}: {
    agent: string,
    score: number,
    feedback: string,
    details?: string[]
}) {
    const getAgentIcon = (name: string) => {
        switch (name.toLowerCase()) {
            case 'content': return <MessageSquare className="w-4 h-4" />;
            case 'design': return <Zap className="w-4 h-4" />;
            case 'strategy': return <BrainCircuit className="w-4 h-4" />;
            default: return <Sparkles className="w-4 h-4" />;
        }
    };

    return (
        <div className="glass-card group p-6 bg-slate-900/40 border-white/5 hover:border-primary/20 transition-all duration-500 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />

            <div className="relative z-10 flex flex-col gap-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shadow-inner">
                            {getAgentIcon(agent)}
                        </div>
                        <div>
                            <h4 className="font-bold text-sm tracking-tight text-white">{agent} Expert</h4>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Active Audit</p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className={cn(
                            "text-lg font-black tracking-tighter",
                            score >= 80 ? "text-green-500" : score >= 60 ? "text-yellow-500" : "text-red-500"
                        )}>
                            {score}<span className="text-[10px] opacity-40 ml-0.5">/100</span>
                        </span>
                        <div className="w-20 h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
                            <div
                                className={cn("h-full transition-all duration-1000", score >= 80 ? "bg-green-500" : score >= 60 ? "bg-yellow-500" : "bg-red-500")}
                                style={{ width: `${score}%` }}
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 italic text-xs leading-relaxed text-white/90">
                        "{feedback}"
                    </div>

                    {details.length > 0 && (
                        <div className="space-y-3">
                            <h5 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80 flex items-center gap-2">
                                <Sparkles className="w-3 h-3" /> Critical Insights
                            </h5>
                            <div className="grid grid-cols-1 gap-2">
                                {details.slice(0, 3).map((item, i) => (
                                    <div key={i} className="flex gap-3 text-[11px] items-start text-white/70 group/item hover:text-white transition-colors">
                                        <div className="w-1 h-5 bg-primary/20 rounded-full group-hover/item:bg-primary transition-colors flex-shrink-0" />
                                        <span className="leading-relaxed">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export function InstructionItem({ icon: Icon, text }: { icon: any, text: string }) {
    return (
        <div className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <Icon className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed group-hover:text-white transition-colors">{text}</p>
        </div>
    );
}
