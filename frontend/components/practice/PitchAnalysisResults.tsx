"use client";

import { useState } from 'react';
import {
    Users,
    FileText,
    LineChart,
    Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MetricBar, AgentFeedbackCard } from './shared';

export function PitchAnalysisResults({
    analysisResult,
    deckAnalysis,
    hasSlides
}: {
    analysisResult: any,
    deckAnalysis: any,
    hasSlides: boolean
}) {
    const [resultTab, setResultTab] = useState<'delivery' | 'deck'>('delivery');

    if (!analysisResult) return null;

    return (
        <div className="space-y-6">
            <div className="flex p-1 bg-white/5 rounded-2xl border border-white/5 mb-4 shadow-inner relative z-30">
                <button
                    onClick={() => setResultTab('delivery')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-300",
                        resultTab === 'delivery' ? "bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]" : "text-muted-foreground hover:text-white"
                    )}
                >
                    <Users className="w-4 h-4" /> Delivery Analysis
                </button>
                {hasSlides && (
                    <button
                        onClick={() => setResultTab('deck')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-300",
                            resultTab === 'deck' ? "bg-secondary text-white shadow-xl shadow-secondary/20 scale-[1.02]" : "text-muted-foreground hover:text-white"
                        )}
                    >
                        <FileText className="w-4 h-4" /> Deck Audit
                    </button>
                )}
            </div>

            <div className="relative min-h-[400px]">
                {resultTab === 'delivery' ? (
                    <div className="space-y-6 animate-fade-in-up">
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

                    </div>
                ) : (
                    <div className="space-y-6 animate-fade-in-up">
                        {deckAnalysis && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between px-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold tracking-tight text-white">Presentation Deck Audit</h3>
                                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Multi-Agent Review</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-black px-3 py-1 bg-secondary/10 text-secondary rounded-full border border-secondary/20 uppercase tracking-widest">
                                        {deckAnalysis.presentation_type || "General"}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 gap-6">
                                    <AgentFeedbackCard
                                        agent="Content"
                                        score={deckAnalysis.content_analysis?.score || 0}
                                        feedback={deckAnalysis.content_analysis?.feedback || ""}
                                        details={deckAnalysis.content_analysis?.weaknesses || []}
                                    />
                                    <AgentFeedbackCard
                                        agent="Design"
                                        score={deckAnalysis.design_analysis?.score || 0}
                                        feedback={deckAnalysis.design_analysis?.feedback || ""}
                                        details={deckAnalysis.design_analysis?.visual_tips || []}
                                    />
                                    <AgentFeedbackCard
                                        agent="Strategy"
                                        score={deckAnalysis.strategy_analysis?.score || 0}
                                        feedback={deckAnalysis.strategy_analysis?.feedback || ""}
                                        details={deckAnalysis.strategy_analysis?.strategic_advice || []}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

