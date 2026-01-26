"use client";

import { useState, useEffect } from "react";
import { Check, X, HelpCircle } from "lucide-react";

interface QuizPayload {
    question: string;
    options: string[];
    correct_index: number;
}

interface QuizModalProps {
    isOpen: boolean;
    payload: QuizPayload | null;
    onClose: () => void;
    onAnswer: (correct: boolean) => void;
}

export function QuizModal({ isOpen, payload, onClose, onAnswer }: QuizModalProps) {
    const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
    const [isSubmitted, setIsSubmitted] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setSelectedIdx(null);
            setIsSubmitted(false);
        }
    }, [isOpen, payload]);

    if (!isOpen || !payload) return null;

    const handleOptionClick = (idx: number) => {
        if (isSubmitted) return;
        setSelectedIdx(idx);
        setIsSubmitted(true);

        // Auto-close after delay, but let user see result first
        const isCorrect = idx === payload.correct_index;
        onAnswer(isCorrect);

        setTimeout(() => {
            onClose();
        }, 2500);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-50 duration-300">

                {/* Header */}
                <div className="bg-primary/10 p-6 border-b border-border flex items-center gap-3">
                    <div className="bg-primary/20 p-2 rounded-full">
                        <HelpCircle className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-foreground">Quick Quiz</h3>
                        <p className="text-sm text-muted-foreground">Test your understanding</p>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    <p className="text-lg font-medium leading-relaxed">{payload.question}</p>

                    <div className="space-y-3">
                        {payload.options.map((opt, idx) => {
                            const isSelected = selectedIdx === idx;
                            const isCorrect = idx === payload.correct_index;

                            // Styles
                            let btnClass = "w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between group relative overflow-hidden ";

                            if (isSubmitted) {
                                if (isCorrect) {
                                    btnClass += "border-green-500 bg-green-500/10 text-green-700 dark:text-green-300";
                                } else if (isSelected && !isCorrect) {
                                    btnClass += "border-red-500 bg-red-500/10 text-red-700 dark:text-red-300";
                                } else {
                                    btnClass += "border-transparent bg-muted/50 opacity-50";
                                }
                            } else {
                                btnClass += "border-border hover:border-primary hover:bg-primary/5 hover:scale-[1.02] active:scale-[0.98]";
                            }

                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleOptionClick(idx)}
                                    disabled={isSubmitted}
                                    className={btnClass}
                                >
                                    <span className="font-medium z-10">{opt}</span>
                                    {isSubmitted && isCorrect && <Check className="w-5 h-5 text-green-500" />}
                                    {isSubmitted && isSelected && !isCorrect && <X className="w-5 h-5 text-red-500" />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                {isSubmitted && (
                    <div className="bg-muted/30 p-4 text-center text-sm text-muted-foreground animate-in slide-in-from-bottom-5">
                        {selectedIdx === payload.correct_index
                            ? "🎉 Correct! Adjusting difficulty up..."
                            : "❌ Not quite. Adjusting difficulty down..."}
                    </div>
                )}

            </div>
        </div>
    );
}
