import React, { useState, useEffect } from "react";
import { CheckCircle2, Trophy, RefreshCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Pair {
    concept: string;
    definition: string;
}

interface MiniGamePayload {
    game_type: string;
    pairs: Pair[];
}

interface MiniGameModalProps {
    isOpen: boolean;
    onClose: () => void;
    payload: MiniGamePayload;
}

export const MiniGameModal: React.FC<MiniGameModalProps> = ({
    isOpen,
    onClose,
    payload,
}) => {
    const [concepts, setConcepts] = useState<string[]>([]);
    const [definitions, setDefinitions] = useState<string[]>([]);

    const [selectedConcept, setSelectedConcept] = useState<string | null>(null);
    const [selectedDefinition, setSelectedDefinition] = useState<string | null>(null);

    const [matches, setMatches] = useState<Record<string, string>>({}); // concept -> definition
    const [wrongMatch, setWrongMatch] = useState<{ c: string, d: string } | null>(null);

    const [isGameFinished, setIsGameFinished] = useState(false);

    // Initialize and shuffle
    useEffect(() => {
        if (!payload.pairs || !isOpen) return;

        const c = payload.pairs.map(p => p.concept);
        const d = payload.pairs.map(p => p.definition);

        setConcepts([...c].sort(() => Math.random() - 0.5));
        setDefinitions([...d].sort(() => Math.random() - 0.5));

        setMatches({});
        setSelectedConcept(null);
        setSelectedDefinition(null);
        setWrongMatch(null);
        setIsGameFinished(false);
    }, [payload, isOpen]);

    const handleConceptClick = (concept: string) => {
        if (matches[concept] || isGameFinished || wrongMatch) return;
        setSelectedConcept(concept);

        if (selectedDefinition) {
            checkMatch(concept, selectedDefinition);
        }
    };

    const handleDefinitionClick = (definition: string) => {
        if (Object.values(matches).includes(definition) || isGameFinished || wrongMatch) return;
        setSelectedDefinition(definition);

        if (selectedConcept) {
            checkMatch(selectedConcept, definition);
        }
    };

    const checkMatch = (c: string, d: string) => {
        const pair = payload.pairs.find(p => p.concept === c && p.definition === d);

        if (pair) {
            const newMatches = { ...matches, [c]: d };
            setMatches(newMatches);
            setSelectedConcept(null);
            setSelectedDefinition(null);

            if (Object.keys(newMatches).length === payload.pairs.length) {
                setIsGameFinished(true);
            }
        } else {
            setWrongMatch({ c, d });
            setTimeout(() => {
                setWrongMatch(null);
                setSelectedConcept(null);
                setSelectedDefinition(null);
            }, 1000);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-4xl max-h-[90vh] flex flex-col glass-card border border-border/50 bg-background/95 shadow-xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Trophy className="w-6 h-6 text-yellow-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Concept Match</h2>
                            <p className="text-sm text-muted-foreground">Match each concept with its definition</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors">
                        <X className="w-5 h-5 opacity-70" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-surface/30">
                    <div className="grid grid-cols-2 gap-8">
                        {/* Concepts Column */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-primary/80 mb-4 px-2">Concepts</h4>
                            {concepts.map((concept) => (
                                <button
                                    key={concept}
                                    onClick={() => handleConceptClick(concept)}
                                    className={cn(
                                        "w-full p-4 rounded-xl border text-left transition-all duration-200 outline-none",
                                        matches[concept]
                                            ? "bg-green-500/10 border-green-500/30 opacity-60 cursor-default"
                                            : selectedConcept === concept
                                                ? "bg-primary/20 border-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]"
                                                : wrongMatch?.c === concept
                                                    ? "bg-red-500/20 border-red-500"
                                                    : "bg-card border-border/50 hover:border-primary/50"
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold">{concept}</span>
                                        {matches[concept] && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Definitions Column */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-secondary/80 mb-4 px-2">Definitions</h4>
                            {definitions.map((definition) => {
                                const isMatched = Object.values(matches).includes(definition);
                                return (
                                    <button
                                        key={definition}
                                        onClick={() => handleDefinitionClick(definition)}
                                        className={cn(
                                            "w-full p-4 rounded-xl border text-left text-sm transition-all duration-200 outline-none min-h-[5.5rem] flex items-center",
                                            isMatched
                                                ? "bg-green-500/10 border-green-500/30 opacity-60 cursor-default"
                                                : selectedDefinition === definition
                                                    ? "bg-secondary/20 border-secondary shadow-[0_0_15px_rgba(var(--secondary-rgb),0.2)]"
                                                    : wrongMatch?.d === definition
                                                        ? "bg-red-500/20 border-red-500"
                                                        : "bg-card border-border/50 hover:border-secondary/50"
                                        )}
                                    >
                                        <div className="flex items-center justify-between w-full gap-2">
                                            <span>{definition}</span>
                                            {isMatched && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {isGameFinished && (
                        <div className="mt-8 p-8 bg-primary/10 rounded-2xl border border-primary/20 text-center animate-in slide-in-from-bottom-4 duration-500">
                            <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                            <h3 className="text-2xl font-bold mb-1 italic">Mastered!</h3>
                            <p className="text-muted-foreground">You've successfully matched all key concepts.</p>
                            <button
                                onClick={onClose}
                                className="mt-6 px-10 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold transition-all shadow-lg shadow-primary/20"
                            >
                                Continue Journey
                            </button>
                        </div>
                    )}
                </div>

                {!isGameFinished && (
                    <div className="p-4 border-t border-border/50 flex justify-between items-center bg-surface/10">
                        <div className="text-xs text-muted-foreground">
                            Matches: {Object.keys(matches).length} / {payload.pairs.length}
                        </div>
                        <button onClick={() => setMatches({})} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
                            <RefreshCcw className="w-3 h-3" /> Reset
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
