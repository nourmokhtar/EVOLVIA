import React, { useState } from "react";
import { BrainCircuit, Layers, Clock, ArrowRight, X, Trash2 } from "lucide-react";

interface StudyHubModalProps {
    isOpen: boolean;
    onClose: () => void;
    quizzes: any[]; // Array of quiz payloads with metadata
    flashcards: any[]; // Array of flashcard payloads with metadata
    onRestore: (action: any) => void;
    onDelete?: (item: any, type: "quiz" | "flashcards", index: number) => void;
}

export function StudyHubModal({ isOpen, onClose, quizzes, flashcards, onRestore, onDelete }: StudyHubModalProps) {
    const [activeTab, setActiveTab] = useState<"flashcards" | "quizzes">("flashcards");

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-4xl h-[80vh] flex flex-col glass-card border border-border/50 bg-background/95 shadow-xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Layers className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Study Hub</h2>
                            <p className="text-sm text-muted-foreground">Review your saved learning materials from all courses</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors">
                        <X className="w-5 h-5 opacity-70" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-border/50 px-6">
                    <button
                        onClick={() => setActiveTab("flashcards")}
                        className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors font-medium ${activeTab === "flashcards"
                            ? "border-primary text-primary bg-primary/5"
                            : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                            }`}
                    >
                        <BrainCircuit className="w-4 h-4" />
                        Flashcards ({flashcards.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("quizzes")}
                        className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors font-medium ${activeTab === "quizzes"
                            ? "border-primary text-primary bg-primary/5"
                            : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                            }`}
                    >
                        <Layers className="w-4 h-4" />
                        Quizzes ({quizzes.length})
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-surface/30">
                    {activeTab === "flashcards" && (
                        <div className="h-full">
                            {flashcards.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-70">
                                    <BrainCircuit className="w-16 h-16 mb-4 stroke-1" />
                                    <p className="text-lg font-medium">No flashcards saved yet</p>
                                    <p className="text-sm">Ask the teacher to "generate flashcards" during a lesson.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {flashcards.map((fc, idx) => (
                                        <div key={idx} className="bg-card border border-border/50 rounded-xl p-4 hover:border-primary/50 transition-all hover:shadow-lg group flex flex-col relative">
                                            {onDelete && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (confirm("Delete this flashcard set?")) {
                                                            onDelete(fc, "flashcards", idx);
                                                        }
                                                    }}
                                                    className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}

                                            <div className="flex items-center justify-between mb-3 pr-6">
                                                <h3 className="font-semibold text-lg truncate" title={fc.source_title}>{fc.source_title || `Set ${idx + 1}`}</h3>
                                                <span className="text-xs px-2 py-1 bg-secondary rounded-full text-secondary-foreground font-medium shrink-0">
                                                    {fc.cards?.length || 0} Cards
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-1">
                                                {fc.cards?.[0]?.front || "Unknown topic"}...
                                            </p>
                                            <button
                                                className="w-full mt-auto flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary/10 hover:bg-primary hover:text-primary-foreground text-primary font-medium transition-colors"
                                                onClick={() => {
                                                    onRestore({ kind: "SHOW_FLASHCARDS", payload: fc });
                                                    onClose();
                                                }}
                                            >
                                                Review Now <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "quizzes" && (
                        <div className="h-full">
                            {quizzes.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-70">
                                    <Layers className="w-16 h-16 mb-4 stroke-1" />
                                    <p className="text-lg font-medium">No quizzes saved yet</p>
                                    <p className="text-sm">Ask the teacher to "start a quiz" to test your knowledge.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {quizzes.map((quiz, idx) => (
                                        <div key={idx} className="bg-card border border-border/50 rounded-xl p-4 hover:border-primary/50 transition-all hover:shadow-lg group flex flex-col relative">
                                            {onDelete && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (confirm("Delete this quiz?")) {
                                                            onDelete(quiz, "quiz", idx);
                                                        }
                                                    }}
                                                    className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}

                                            <div className="flex items-center justify-between mb-3 pr-6">
                                                <h3 className="font-semibold text-lg truncate" title={quiz.source_title}>{quiz.source_title || `Quiz ${idx + 1}`}</h3>
                                                <span className="text-xs px-2 py-1 bg-secondary rounded-full text-secondary-foreground font-medium shrink-0">
                                                    {quiz.questions?.length || 0} Qs
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-1">
                                                Topic: {quiz.topic || quiz.questions?.[0]?.question || "General Knowledge"}
                                            </p>
                                            <button
                                                className="w-full mt-auto flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary/10 hover:bg-primary hover:text-primary-foreground text-primary font-medium transition-colors"
                                                onClick={() => {
                                                    onRestore({ kind: "SHOW_QUIZ", payload: quiz });
                                                    onClose();
                                                }}
                                            >
                                                Retake Quiz <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
