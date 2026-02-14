"use client";

import { useState, useEffect } from "react";
import { Check, X, HelpCircle, ChevronRight, Trophy, BarChart } from "lucide-react";

export interface QuizPayload {
    question: string;
    options: string[];
    correct_index: number;
    answer?: string; // Optional: raw text answer from LLM
    explanation?: string; // Optional explanation for learning
}

interface QuizModalProps {
    isOpen: boolean;
    payload: QuizPayload | QuizPayload[] | null;
    onClose: () => void;
    onAnswer: (correctCount: number, total: number) => void;
    currentLevel?: number;
}

export function QuizModal({ isOpen, payload, onClose, onAnswer, currentLevel = 1 }: QuizModalProps) {
    const [questions, setQuestions] = useState<QuizPayload[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [score, setScore] = useState(0);
    const [showResults, setShowResults] = useState(false);

    useEffect(() => {
        if (isOpen && payload) {
            // Normalize payload to array and sanitized type
            let qArray: any[] = [];

            // Handle { questions: [...] } wrapper from backend
            if ('questions' in (payload as any) && Array.isArray((payload as any).questions)) {
                qArray = (payload as any).questions;
            } else {
                qArray = Array.isArray(payload) ? payload : [payload];
            }

            // Sanitize each question to ensure correct_index exists
            const sanitizedQuestions: QuizPayload[] = qArray.map(q => {
                let correctIdx = q.correct_index;

                // If index is missing/invalid but we have a text answer
                if ((correctIdx === undefined || correctIdx === null || correctIdx < 0) && q.answer && q.options) {
                    // Try exact match
                    const idx = q.options.indexOf(q.answer);
                    if (idx !== -1) {
                        correctIdx = idx;
                    } else {
                        // Try loose match (case insensitive)
                        const lowerAnswer = String(q.answer).toLowerCase();
                        const idxLoose = q.options.findIndex((opt: string) => String(opt).toLowerCase() === lowerAnswer);
                        if (idxLoose !== -1) {
                            correctIdx = idxLoose;
                        } else {
                            // Fallback to 0 if we really can't find it to prevent crash
                            console.warn("Could not find matching option for answer:", q.answer);
                            correctIdx = 0;
                        }
                    }
                }

                return {
                    ...q,
                    correct_index: typeof correctIdx === 'number' ? correctIdx : 0
                };
            });

            setQuestions(sanitizedQuestions);
            setCurrentIndex(0);
            setScore(0);
            setShowResults(false);
            setSelectedIdx(null);
            setIsSubmitted(false);
        }
    }, [isOpen, payload]);

    if (!isOpen || questions.length === 0) return null;

    const currentQuestion = questions[currentIndex];
    const progress = ((currentIndex + 1) / questions.length) * 100;

    const handleOptionClick = (idx: number) => {
        if (isSubmitted) return;

        setSelectedIdx(idx);
        setIsSubmitted(true);

        const isCorrect = idx === currentQuestion.correct_index;
        if (isCorrect) {
            setScore(prev => prev + 1);
        }
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setSelectedIdx(null);
            setIsSubmitted(false);
        } else {
            setShowResults(true);
            onAnswer(score + (selectedIdx === currentQuestion.correct_index ? 0 : 0), questions.length);
            // Note: score update state might lag one render, but here we just show results UI
        }
    };

    if (showResults) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden p-8 text-center animate-in zoom-in-50 duration-300">
                    <div className="mb-6 flex justify-center">
                        <div className="p-4 bg-yellow-500/10 rounded-full">
                            <Trophy className="w-12 h-12 text-yellow-500" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Quiz Complete!</h2>
                    <p className="text-muted-foreground mb-6">You scored</p>

                    <div className="text-5xl font-black text-primary mb-2">
                        {score} <span className="text-2xl text-muted-foreground font-medium">/ {questions.length}</span>
                    </div>

                    <div className="w-full bg-secondary h-3 rounded-full overflow-hidden mb-8">
                        <div
                            className="h-full bg-primary transition-all duration-1000"
                            style={{ width: `${(score / questions.length) * 100}%` }}
                        />
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all"
                    >
                        Close & Continue Learning
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-50 duration-300 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="bg-primary/5 p-4 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/20 p-2 rounded-full">
                            <HelpCircle className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-bold text-foreground">Knowledge Check</h3>
                            <p className="text-xs text-muted-foreground">Question {currentIndex + 1} of {questions.length}</p>
                        </div>
                    </div>

                    <div className="flex bg-background px-3 py-1 rounded-full border border-border text-xs font-mono items-center gap-4">
                        <span className="shrink-0">Score: {score}</span>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground"
                            title="Close Quiz"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-secondary h-1">
                    <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    <p className="text-lg font-medium leading-relaxed mb-6">{currentQuestion.question}</p>

                    <div className="space-y-3">
                        {currentQuestion.options.map((opt, idx) => {
                            const isSelected = selectedIdx === idx;
                            const isCorrect = idx === currentQuestion.correct_index;

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
                                btnClass += "border-border hover:border-primary hover:bg-primary/5 hover:scale-[1.01] active:scale-[0.99]";
                            }

                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleOptionClick(idx)}
                                    disabled={isSubmitted}
                                    className={btnClass}
                                >
                                    <span className="font-medium z-10">{opt}</span>
                                    {isSubmitted && isCorrect && <Check className="w-5 h-5 text-green-500 shrink-0" />}
                                    {isSubmitted && isSelected && !isCorrect && <X className="w-5 h-5 text-red-500 shrink-0" />}
                                </button>
                            );
                        })}
                    </div>

                    {/* Explanation (Optional) */}
                    {isSubmitted && currentQuestion.explanation && (
                        <div className="mt-4 p-4 bg-blue-500/10 text-blue-700 dark:text-blue-300 rounded-xl text-sm animate-in fade-in slide-in-from-top-2">
                            <strong>Explanation:</strong> {currentQuestion.explanation}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border bg-muted/20 flex justify-end">
                    <button
                        onClick={handleNext}
                        disabled={!isSubmitted}
                        className={cn(
                            "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all",
                            isSubmitted
                                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                                : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                        )}
                    >
                        {currentIndex < questions.length - 1 ? "Next Question" : "Finish Quiz"}
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

            </div>
        </div>
    );
}

// Helper to merge class names
function cn(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(' ');
}
