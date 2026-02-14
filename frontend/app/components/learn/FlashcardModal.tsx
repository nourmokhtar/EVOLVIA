"use client";

import React, { useState } from "react";
import { X, ChevronLeft, ChevronRight, RotateCcw, BrainCircuit } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Flashcard {
    front: string;
    back: string;
}

interface FlashcardModalProps {
    cards: Flashcard[];
    onClose: () => void;
}

export function FlashcardModal({ cards, onClose }: FlashcardModalProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    const currentCard = cards[currentIndex];
    const progress = ((currentIndex + 1) / cards.length) * 100;

    const handleNext = () => {
        if (currentIndex < cards.length - 1) {
            setIsFlipped(false);
            setTimeout(() => setCurrentIndex(currentIndex + 1), 150);
        }
    };

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setIsFlipped(false);
            setTimeout(() => setCurrentIndex(currentIndex - 1), 150);
        }
    };

    const toggleFlip = () => setIsFlipped(!isFlipped);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="relative w-full max-w-2xl bg-surface border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[600px]"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-border bg-surface/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <BrainCircuit className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Interactive Flashcards</h2>
                            <p className="text-xs text-muted-foreground">Master the core concepts</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-full transition-colors group"
                    >
                        <X className="w-6 h-6 text-muted-foreground group-hover:text-white transition-colors" />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1 bg-white/5">
                    <motion.div
                        className="h-full bg-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                    />
                </div>

                {/* Card Area */}
                <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-hidden bg-gradient-to-b from-transparent to-primary/5">
                    <div className="w-full max-w-md perspective-1000">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentIndex}
                                className="relative w-full aspect-[4/3] cursor-pointer preserve-3d"
                                onClick={toggleFlip}
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                transition={{ duration: 0.3 }}
                            >
                                <motion.div
                                    className="w-full h-full relative preserve-3d"
                                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 260,
                                        damping: 20,
                                    }}
                                >
                                    {/* Front Side */}
                                    <div className="absolute inset-0 backface-hidden flex flex-col items-center justify-center p-8 bg-surface border-2 border-primary/20 rounded-3xl shadow-xl">
                                        <span className="absolute top-4 left-4 text-[10px] uppercase tracking-widest text-primary/40 font-bold">Concept</span>
                                        <h3 className="text-2xl md:text-3xl font-bold text-center leading-tight">
                                            {currentCard?.front}
                                        </h3>
                                        <p className="mt-8 text-sm text-primary animate-pulse">Click to flip</p>
                                    </div>

                                    {/* Back Side */}
                                    <div
                                        className="absolute inset-0 backface-hidden flex flex-col items-center justify-center p-8 bg-primary/10 border-2 border-primary/40 rounded-3xl shadow-xl overflow-y-auto"
                                        style={{ transform: "rotateY(180deg)" }}
                                    >
                                        <span className="absolute top-4 left-4 text-[10px] uppercase tracking-widest text-primary/60 font-bold">Definition</span>
                                        <p className="text-lg md:text-xl text-center leading-relaxed">
                                            {currentCard?.back}
                                        </p>
                                        <button
                                            className="mt-6 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsFlipped(false);
                                            }}
                                        >
                                            <RotateCcw className="w-4 h-4 text-primary" />
                                        </button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    <div className="mt-8 text-sm font-medium text-muted-foreground">
                        {currentIndex + 1} of {cards.length} cards
                    </div>
                </div>

                {/* Navigation Footer */}
                <div className="p-8 border-t border-border flex items-center justify-between bg-surface/30">
                    <button
                        onClick={handlePrevious}
                        disabled={currentIndex === 0}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl border border-border hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        Previous
                    </button>

                    <button
                        onClick={handleNext}
                        disabled={currentIndex === cards.length - 1}
                        className={cn(
                            "flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all",
                            currentIndex === cards.length - 1
                                ? "bg-green-500/20 text-green-500 border border-green-500/20"
                                : "bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20"
                        )}
                    >
                        {currentIndex === cards.length - 1 ? "Finished!" : "Next Card"}
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </motion.div>

            <style jsx global>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
      `}</style>
        </div>
    );
}
