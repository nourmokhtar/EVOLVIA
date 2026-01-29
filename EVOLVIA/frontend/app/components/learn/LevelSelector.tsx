import { useState } from "react";
import { Sparkles, Info, Trophy, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface LevelSelectorProps {
    currentLevel: number;
    currentTitle: string;
    onSelectLevel: (level: number) => void;
    disabled?: boolean;
}

const LEVELS = [
    { level: 1, title: "Beginner", description: "Foundational concepts and simple definitions." },
    { level: 2, title: "Elementary", description: "Basic examples and clear analogies." },
    { level: 3, title: "Intermediate", description: "Standard usage and comparisons." },
    { level: 4, title: "Advanced", description: "Finding errors and predicting outcomes." },
    { level: 5, title: "Expert", description: "Complex multi-step reasoning and critical analysis." },
];

export function LevelSelector({ currentLevel, currentTitle, onSelectLevel, disabled }: LevelSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative group/selector">
            <button
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-2 transition-all cursor-pointer hover:bg-surface/80",
                    currentLevel === 1 ? "bg-blue-500/10 border-blue-500/20 text-blue-500" :
                        currentLevel === 2 ? "bg-green-500/10 border-green-500/20 text-green-500" :
                            currentLevel === 3 ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-500" :
                                currentLevel >= 4 ? "bg-purple-500/10 border-purple-500/20 text-purple-500" :
                                    "bg-muted/50 text-muted-foreground",
                    disabled && "opacity-50 cursor-not-allowed"
                )}
            >
                <Trophy className="w-3.5 h-3.5" />
                <span className="uppercase tracking-wider">Level {currentLevel}: {currentTitle}</span>
                <ChevronDown className="w-3 h-3 opacity-50" />
            </button>

            {/* Popover/Dropdown */}
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full left-0 mt-2 w-64 bg-background border border-border/50 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-2 space-y-1">
                            {LEVELS.map((lvl) => (
                                <button
                                    key={lvl.level}
                                    onClick={() => {
                                        onSelectLevel(lvl.level);
                                        setIsOpen(false);
                                    }}
                                    className={cn(
                                        "w-full text-left p-2 rounded-lg text-sm transition-colors relative group",
                                        currentLevel === lvl.level
                                            ? "bg-primary/10 text-primary font-medium"
                                            : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="flex items-center gap-2">
                                            {currentLevel === lvl.level && <Sparkles className="w-3 h-3" />}
                                            <span className={cn(currentLevel === lvl.level && "ml-0", "ml-5 transition-all duration-200 group-hover:ml-0")}>
                                                Level {lvl.level}: {lvl.title}
                                            </span>
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground/70 pl-5 mt-0.5 group-hover:text-muted-foreground line-clamp-2">
                                        {lvl.description}
                                    </p>
                                </button>
                            ))}
                        </div>
                        <div className="bg-muted/20 p-2 text-[10px] text-center text-muted-foreground border-t border-border/50">
                            <Info className="w-3 h-3 inline-block mr-1 -mt-0.5" />
                            Select a level to adjust difficulty instantly.
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
