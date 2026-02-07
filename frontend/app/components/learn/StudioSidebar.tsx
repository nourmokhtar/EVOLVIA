import React from "react";
import {
    Sparkles,
    HelpCircle,
    FileText,
    Mic,
    BrainCircuit,
    Layers,
    History as HistoryIcon,
    GalleryVerticalEnd
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StudioSidebarProps {
    onAction: (action: string, label?: string) => void;
    onStartQuiz?: () => void;
    onStartFlashcards?: () => void;
    onOpenStudyHub?: () => void;
    disabled: boolean;
    hasActiveUpload?: boolean;
}

export function StudioSidebar({
    onAction,
    onStartQuiz,
    onStartFlashcards,
    onOpenStudyHub,
    disabled,
    hasActiveUpload = false,
}: StudioSidebarProps) {
    const actions = [
        {
            id: "audio_overview",
            label: "Audio Overview",
            icon: Mic,
            desc: "Listen to a podcast summary",
            prompt: "[AUDIO_OVERVIEW] Give me a narrated overview of this document or our discussion.",
        },
        {
            id: "deep_dive",
            label: "Deep Dive",
            icon: Layers,
            desc: "Detailed technical immersion",
            prompt: "Do a deep dive into the technical details and core concepts of this topic. Immerse yourself in the theory and practice.",
        },
        {
            id: "flashcards",
            label: "Flashcards",
            icon: GalleryVerticalEnd,
            desc: "Memorize key concepts",
            prompt: "[FLASHCARDS]",
        },
        {
            id: "quiz",
            label: "Start Quiz",
            icon: HelpCircle,
            desc: "Test your knowledge",
            prompt: "[QUIZ]",
        },
        {
            id: "summary",
            label: "Summarize",
            icon: FileText,
            desc: "Get a quick summary",
            prompt: hasActiveUpload
                ? "Summarize the key points of the uploaded document."
                : "Summarize the key points of our discussion so far.",
        },
    ];

    return (
        <div className="h-full flex flex-col glass-card border-l border-border p-4 overflow-y-auto">
            <div className="flex items-center gap-2 mb-6">
                <Sparkles className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-lg">Studio</h2>
            </div>

            <div className="space-y-3 mb-6">
                {actions.map((action) => (
                    <button
                        key={action.id}
                        onClick={() => {
                            if (action.id === "quiz" && onStartQuiz) {
                                onStartQuiz();
                            } else if (action.id === "flashcards" && onStartFlashcards) {
                                onStartFlashcards();
                            } else {
                                onAction(action.prompt, action.label);
                            }
                        }}
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

            <div className="mt-auto space-y-3 pt-4 border-t border-border">
                <button
                    onClick={onOpenStudyHub}
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-secondary/50 hover:bg-secondary text-secondary-foreground transition-colors font-medium border border-border"
                >
                    <HistoryIcon className="w-4 h-4" />
                    Open Study Hub
                </button>

                <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                    <p className="text-xs text-muted-foreground text-center">
                        Select an action to generate content based on your sources and discussion.
                    </p>
                </div>
            </div>
        </div>
    );
}
