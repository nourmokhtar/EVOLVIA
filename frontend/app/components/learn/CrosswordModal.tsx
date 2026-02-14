import React, { useState, useEffect, useRef } from "react";
import { Grid3X3, Trophy, X, RefreshCcw, CheckCircle2, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface CrosswordWord {
    answer: string;
    clue: string;
}

interface CrosswordPayload {
    words: CrosswordWord[];
}

interface CrosswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    payload: CrosswordPayload;
}

interface GridCell {
    char: string;
    userInput: string;
    isCorrect: boolean;
    isHint: boolean;
    number?: number;
    wordIndices: number[];
    startOfWordIdx?: number;
    r: number;
    c: number;
}

export const CrosswordModal: React.FC<CrosswordModalProps> = ({
    isOpen,
    onClose,
    payload,
}) => {
    const [grid, setGrid] = useState<GridCell[][]>([]);
    const [isFinished, setIsFinished] = useState(false);
    const [focusedCell, setFocusedCell] = useState<{ r: number, c: number } | null>(null);
    const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    const SIZE = 12;

    useEffect(() => {
        if (!isOpen || !payload.words || payload.words.length === 0) return;
        generateGrid();
    }, [isOpen, payload]);

    useEffect(() => {
        if (focusedCell) {
            const key = `${focusedCell.r}-${focusedCell.c}`;
            inputRefs.current[key]?.focus();
        }
    }, [focusedCell]);

    const generateGrid = () => {
        const newGrid: GridCell[][] = Array(SIZE).fill(null).map((_, r) =>
            Array(SIZE).fill(null).map((_, c) => ({
                char: "",
                userInput: "",
                isCorrect: false,
                isHint: false,
                wordIndices: [],
                r, c
            }))
        );

        payload.words.forEach((w, idx) => {
            const word = w.answer.toUpperCase();
            const isHorizontal = idx % 2 === 0;

            let placed = false;
            let attempts = 0;

            while (!placed && attempts < 50) {
                const r = Math.floor(Math.random() * (SIZE - (isHorizontal ? 0 : word.length)));
                const c = Math.floor(Math.random() * (SIZE - (isHorizontal ? word.length : 0)));

                let canPlace = true;
                for (let i = 0; i < word.length; i++) {
                    const cell = isHorizontal ? newGrid[r][c + i] : newGrid[r + i][c];
                    if (cell.char !== "" && cell.char !== word[i]) {
                        canPlace = false;
                        break;
                    }
                }

                if (canPlace) {
                    const hintIndex = 0; // Always hint the first letter for UX

                    for (let i = 0; i < word.length; i++) {
                        const cell = isHorizontal ? newGrid[r][c + i] : newGrid[r + i][c];
                        cell.char = word[i];
                        cell.wordIndices.push(idx);
                        if (i === 0) {
                            cell.number = idx + 1;
                            cell.startOfWordIdx = idx;
                        }

                        if (i === hintIndex) {
                            cell.userInput = word[i];
                            cell.isCorrect = true;
                            cell.isHint = true;
                        }
                    }
                    placed = true;
                }
                attempts++;
            }
        });

        setGrid(newGrid);
        setIsFinished(false);

        // Focus first letter of first word
        const firstCell = newGrid.flat().find(c => c.number === 1);
        if (firstCell) {
            setFocusedCell({ r: firstCell.r, c: firstCell.c });
        }
    };

    const handleInputChange = (r: number, c: number, val: string) => {
        if (isFinished || grid[r][c].isHint) return;
        const char = val.slice(-1).toUpperCase();
        if (char && !/^[A-Z]$/.test(char)) return;

        const newGrid = [...grid.map(row => [...row])];
        newGrid[r][c].userInput = char;
        newGrid[r][c].isCorrect = char === newGrid[r][c].char;

        setGrid(newGrid);

        if (char !== "") {
            // Move to next logical cell in current word
            const next = findNextCell(r, c);
            if (next) setFocusedCell(next);
        }

        checkFinished(newGrid);
    };

    const findNextCell = (r: number, c: number) => {
        // Try right
        if (c + 1 < SIZE && grid[r][c + 1].char !== "") return { r, c: c + 1 };
        // Try down
        if (r + 1 < SIZE && grid[r + 1][c].char !== "") return { r: r + 1, c };
        return null;
    };

    const handleKeyDown = (r: number, c: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && grid[r][c].userInput === "") {
            // Try back left
            if (c > 0 && grid[r][c - 1].char !== "") setFocusedCell({ r, c: c - 1 });
            // Try back up
            else if (r > 0 && grid[r - 1][c].char !== "") setFocusedCell({ r: r - 1, c });
        }
    };

    const checkFinished = (currentGrid: GridCell[][]) => {
        const allCorrect = currentGrid.every(row =>
            row.every(cell => cell.char === "" || (cell.userInput === cell.char))
        );
        const anyEmpty = currentGrid.some(row =>
            row.some(cell => cell.char !== "" && cell.userInput === "")
        );
        if (allCorrect && !anyEmpty) setIsFinished(true);
    };

    const revealHint = () => {
        if (!focusedCell || isFinished) return;
        const { r, c } = focusedCell;
        const cell = grid[r][c];

        if (cell.char === "" || cell.isHint) return;

        const newGrid = [...grid.map(row => [...row])];
        newGrid[r][c].userInput = newGrid[r][c].char;
        newGrid[r][c].isCorrect = true;
        newGrid[r][c].isHint = true;
        setGrid(newGrid);

        const next = findNextCell(r, c);
        if (next) setFocusedCell(next);

        checkFinished(newGrid);
    };

    const focusWord = (idx: number) => {
        const cell = grid.flat().find(c => c.startOfWordIdx === idx);
        if (cell) setFocusedCell({ r: cell.r, c: cell.c });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-hidden">
            <div className="w-full max-w-5xl max-h-[90vh] flex flex-col glass-card border border-primary/20 bg-background/95 shadow-2xl rounded-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">

                <div className="flex items-center justify-between p-6 border-b border-border/50 bg-primary/5">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/20 rounded-2xl">
                            <Grid3X3 className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent italic">
                                Crosswords
                            </h2>
                            <p className="text-sm text-muted-foreground">Master key concepts</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all">
                        <X className="w-6 h-6 opacity-50 hover:opacity-100" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 bg-surface/20 flex flex-col lg:flex-row gap-8">
                    <div className="flex-1 flex items-center justify-center p-4 bg-black/20 rounded-3xl border border-white/5">
                        <div className="grid gap-1 p-2 bg-slate-800/40 rounded-lg shadow-inner"
                            style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }}>
                            {grid.map((row, r) => (
                                row.map((cell, c) => (
                                    <div
                                        key={`${r}-${c}`}
                                        onClick={() => cell.char !== "" && setFocusedCell({ r, c })}
                                        className={cn(
                                            "w-8 h-8 md:w-10 md:h-10 relative flex items-center justify-center transition-all duration-200 cursor-pointer",
                                            cell.char === "" ? "bg-transparent pointer-events-none" : "bg-white/5 rounded-md border border-white/10 hover:border-primary/50",
                                            focusedCell?.r === r && focusedCell?.c === c && "border-primary bg-primary/10 shadow-[0_0_10px_rgba(var(--primary-rgb),0.2)]"
                                        )}
                                    >
                                        {cell.number && (
                                            <span className="absolute top-0.5 left-1 text-[8px] font-bold text-primary/70 pointer-events-none">
                                                {cell.number}
                                            </span>
                                        )}
                                        {cell.char !== "" && (
                                            <input
                                                ref={el => { inputRefs.current[`${r}-${c}`] = el; }}
                                                type="text"
                                                maxLength={1}
                                                value={cell.userInput}
                                                readOnly={cell.isHint}
                                                onChange={(e) => handleInputChange(r, c, e.target.value)}
                                                onKeyDown={(e) => handleKeyDown(r, c, e)}
                                                onFocus={() => setFocusedCell({ r, c })}
                                                className={cn(
                                                    "w-full h-full bg-transparent text-center font-bold text-lg outline-none uppercase caret-primary",
                                                    cell.isHint ? "text-primary/60" : (cell.isCorrect ? "text-green-400" : "text-white")
                                                )}
                                            />
                                        )}
                                    </div>
                                ))
                            ))}
                        </div>
                    </div>

                    <div className="w-full lg:w-80 flex flex-col gap-6">
                        <div className="flex-1 space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-primary/80 px-2">Clues</h3>
                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {payload.words.map((w, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => focusWord(idx)}
                                        className={cn(
                                            "p-4 rounded-2xl border transition-all duration-300 cursor-pointer",
                                            grid.flat().filter(c => c.wordIndices.includes(idx)).every(c => c.isCorrect)
                                                ? "bg-green-500/5 border-green-500/20 opacity-60"
                                                : focusedCell?.r !== null && grid[focusedCell!.r][focusedCell!.c].wordIndices.includes(idx)
                                                    ? "bg-primary/10 border-primary/40 shadow-sm"
                                                    : "bg-white/5 border-white/10 hover:border-primary/30"
                                        )}
                                    >
                                        <div className="flex gap-3">
                                            <span className="font-bold text-primary shrink-0">{idx + 1}.</span>
                                            <p className="text-sm leading-relaxed">{w.clue}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-6 rounded-2xl bg-primary/10 border border-primary/20 space-y-4">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground uppercase tracking-wider font-semibold">Progress</span>
                                <span className="text-primary font-bold">
                                    {Math.round((grid.flat().filter(c => c.char !== "" && c.isCorrect).length / Math.max(1, grid.flat().filter(c => c.char !== "").length)) * 100)}%
                                </span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-500 shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]"
                                    style={{ width: `${(grid.flat().filter(c => c.char !== "" && c.isCorrect).length / Math.max(1, grid.flat().filter(c => c.char !== "").length)) * 100}%` }}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={revealHint}
                                    disabled={!focusedCell || grid[focusedCell.r][focusedCell.c].isHint}
                                    className="w-full py-3 rounded-xl bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-500 font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <Lightbulb className="w-4 h-4" /> Reveal Hint
                                </button>
                                <button
                                    onClick={generateGrid}
                                    className="w-full py-2 flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-white transition-colors"
                                >
                                    <RefreshCcw className="w-3 h-3" /> Regenerate Grid
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {isFinished && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-500">
                        <div className="max-w-md w-full p-10 bg-gradient-to-b from-primary/20 to-surface/80 rounded-[3rem] border border-primary/30 shadow-[0_0_50px_rgba(var(--primary-rgb),0.3)] text-center scale-up-in">
                            <div className="w-24 h-24 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(234,179,8,0.2)]">
                                <Trophy className="w-12 h-12 text-yellow-500" />
                            </div>
                            <h3 className="text-4xl font-black mb-3 italic">AMAZING!</h3>
                            <p className="text-lg text-slate-300 mb-8 leading-relaxed">
                                Grid complete! You've mastered all these concepts.
                            </p>
                            <button
                                onClick={onClose}
                                className="w-full py-5 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg transition-all shadow-xl shadow-primary/20 hover:-translate-y-1"
                            >
                                Close Game
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
