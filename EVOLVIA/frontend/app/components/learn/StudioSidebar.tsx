import React from "react";
import { Sparkles, HelpCircle, FileText, Mic, BrainCircuit } from "lucide-react";
import { cn } from "@/lib/utils";

interface StudioSidebarProps {
    onAction: (action: string) => void;
    disabled: boolean;
}

export function StudioSidebar({ onAction, disabled }: StudioSidebarProps) {
    const actions = [
        {
            id: "quiz",
            label: "Start Quiz",
            icon: HelpCircle,
            desc: "Test your knowledge",
            prompt: "Give me a quiz on this topic",
        },
        {
            id: "summary",
            label: "Summarize",
            icon: FileText,
            desc: "Get a quick summary",
            prompt: "Summarize the key points of our discussion so far",
        },
        {
            id: "podcast",
            label: "Audio Overview",
            icon: Mic,
            desc: "Listen to a recap",
            prompt: "Give me a short audio overview of this topic like a podcast intro",
        },
        {
            id: "deep_dive",
            label: "Deep Dive",
            icon: BrainCircuit,
            desc: "Explore complex concepts",
            prompt: "Explain the most complex part of this topic in detail",
        },
    ];

    return (
        <div className="h-full flex flex-col glass-card border-l border-border p-4">
            <div className="flex items-center gap-2 mb-6">
                <Sparkles className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-lg">Studio</h2>
            </div>

            <div className="space-y-3">
                {actions.map((action) => (
                    <button
                        key={action.id}
                        onClick={() => onAction(action.prompt)}
                        disabled={disabled}
                        className="w-full flex items-start gap-3 p-3 rounded-xl border border-border hover:bg-primary/5 hover:border-primary/50 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <action.icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="font-medium text-sm group-hover:text-primary transition-colors">
                                {action.label}
                            </p>
                            <p className="text-xs text-muted-foreground">{action.desc}</p>
                        </div>
                    </button>
                ))}
            </div>

            <div className="mt-auto p-4 bg-primary/5 rounded-xl border border-primary/10">
                <p className="text-xs text-muted-foreground text-center">
                    Select an action to generate content based on your sources and discussion.
                </p>
            </div>
        </div>
    );
}
