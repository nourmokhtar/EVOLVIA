import React, { useState, useEffect } from "react";
import { CheckCircle, XCircle, Lightbulb, Trophy, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Blank {
    id: string;
    answer: string;
    hint?: string;
}

interface ExercisePayload {
    text: string;
    blanks: Blank[];
}

interface FillInTheBlankModalProps {
    isOpen: boolean;
    onClose: () => void;
    payload: ExercisePayload;
}

export const FillInTheBlankModal: React.FC<FillInTheBlankModalProps> = ({
    isOpen,
    onClose,
    payload,
}) => {
    const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
    const [results, setResults] = useState<Record<string, boolean | null>>({});
    const [showHints, setShowHints] = useState<Record<string, boolean>>({});
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [score, setScore] = useState(0);

    // Reset state when payload changes
    useEffect(() => {
        setUserAnswers({});
        setResults({});
        setShowHints({});
        setIsSubmitted(false);
        setScore(0);
    }, [payload, isOpen]);

    const handleInputChange = (id: string, value: string) => {
        if (isSubmitted) return;
        setUserAnswers((prev) => ({ ...prev, [id]: value }));
    };

    const toggleHint = (id: string) => {
        setShowHints((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const handleSubmit = () => {
        const newResults: Record<string, boolean> = {};
        let correctCount = 0;

        payload.blanks.forEach((blank) => {
            const isCorrect =
                (userAnswers[blank.id] || "").trim().toLowerCase() ===
                blank.answer.trim().toLowerCase();

            newResults[blank.id] = isCorrect;
            if (isCorrect) correctCount++;
        });

        setResults(newResults);
        setScore(correctCount);
        setIsSubmitted(true);
    };

    // Function to render text with inputs
    const renderContent = () => {
        let content = payload.text;
        const parts: (string | React.ReactNode)[] = [];

        // Simple regex to split by [BLANK_ID]
        const regex = /\[(BLANK\d+)\]/g;
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(content)) !== null) {
            const blankId = match[1];
            const blank = payload.blanks.find(b => b.id === blankId);

            // Push preceding text
            parts.push(content.substring(lastIndex, match.index));

            // Push input/result component
            if (blank) {
                parts.push(
                    <span key={blankId} className="inline-flex flex-col items-center mx-1 align-middle translate-y-1">
                        <div className="relative flex items-center">
                            <input
                                value={userAnswers[blankId] || ""}
                                onChange={(e) => handleInputChange(blankId, e.target.value)}
                                placeholder="..."
                                className={cn(
                                    "w-32 h-9 px-2 text-center rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all",
                                    isSubmitted && (results[blankId] ? "border-green-500 bg-green-500/10" : "border-red-500 bg-red-500/10")
                                )}
                                disabled={isSubmitted}
                            />
                            {isSubmitted && (
                                <div className="absolute -right-6">
                                    {results[blankId] ? (
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                    ) : (
                                        <XCircle className="w-4 h-4 text-red-500" />
                                    )}
                                </div>
                            )}
                        </div>
                        {!isSubmitted && blank.hint && (
                            <button
                                onClick={() => toggleHint(blankId)}
                                className="text-[10px] text-primary/60 hover:text-primary flex items-center gap-0.5 mt-0.5"
                            >
                                <Lightbulb className="w-3 h-3" /> {showHints[blankId] ? blank.hint : "Hint"}
                            </button>
                        )}
                        {isSubmitted && !results[blankId] && (
                            <span className="text-[10px] text-green-500 font-bold mt-0.5">{blank.answer}</span>
                        )}
                    </span>
                );
            } else {
                parts.push(match[0]);
            }

            lastIndex = regex.lastIndex;
        }

        parts.push(content.substring(lastIndex));
        return parts;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl flex flex-col glass-card border border-border/50 bg-background/95 shadow-xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Trophy className="w-6 h-6 text-yellow-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Fill in the Blanks</h2>
                            <p className="text-sm text-muted-foreground">Fill in the missing technical terms</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors">
                        <X className="w-5 h-5 opacity-70" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-surface/30">
                    <div className="bg-card p-6 rounded-xl border border-border/50 leading-relaxed text-lg text-foreground">
                        {renderContent()}
                    </div>

                    {isSubmitted && (
                        <div className="mt-6 flex flex-col items-center">
                            <div className="text-xl font-bold mb-2">
                                Your Score: {score} / {payload.blanks.length}
                            </div>
                            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-1000"
                                    style={{ width: `${(score / payload.blanks.length) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-border/50 flex justify-end gap-3 bg-surface/10">
                    {!isSubmitted ? (
                        <button
                            onClick={handleSubmit}
                            className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-colors"
                        >
                            Check Answers
                        </button>
                    ) : (
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium transition-colors"
                        >
                            Close
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
