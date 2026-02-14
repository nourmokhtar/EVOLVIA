import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BoardAction } from "@/lib/hooks/useLearnWebSocket";
import { cn } from "@/lib/utils";
import { Image as ImageIcon, PenLine } from "lucide-react";

interface VirtualBoardProps {
    actions: BoardAction[];
    isSpeaking: boolean;
    className?: string;
}

export function VirtualBoard({ actions, isSpeaking, className }: VirtualBoardProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [activeItemIndex, setActiveItemIndex] = useState(0);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [actions, activeItemIndex]);

    // Reset active index if actions are cleared
    useEffect(() => {
        if (actions.length === 0) {
            setActiveItemIndex(0);
        }
    }, [actions.length]);

    return (
        <div className={cn(
            "flex flex-col h-full rounded-xl overflow-hidden shadow-2xl relative transition-all duration-500",
            "bg-white border-[12px] border-[#d1d5db] shadow-[0_10px_30px_rgba(0,0,0,0.15)]", // Silver frame
            className
        )}>
            {/* Inner Frame Shadow/Bevel */}
            <div className="absolute inset-0 pointer-events-none border-[2px] border-black/5 rounded-lg z-20 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]" />

            {/* Whiteboard Glossy Surface */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white via-[#f8f9fa] to-[#e9ecef] opacity-50" />

            {/* Marker Tray (Visual only) */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-32 h-1.5 rounded-full bg-slate-200 shadow-inner z-20 flex gap-2 items-center justify-center px-2">
                <div className="w-8 h-1 rounded-sm bg-blue-600/60 shadow-sm" />
                <div className="w-8 h-1 rounded-sm bg-red-600/60 shadow-sm" />
                <div className="w-8 h-1 rounded-sm bg-black/60 shadow-sm" />
            </div>

            <div
                ref={scrollRef}
                className="flex-1 p-8 overflow-y-auto space-y-6 relative z-10 scroll-smooth custom-scrollbar"
                style={{ fontFamily: "'Kalam', 'Comic Sans MS', cursive" }} // Use a handwriting font if available, fallback to Comic Sans
            >
                <AnimatePresence mode="popLayout">
                    {actions.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="h-full flex flex-col items-center justify-center text-slate-300 gap-4"
                        >
                            <div className="p-6 rounded-full bg-slate-50 border border-slate-100 shadow-sm">
                                <PenLine className="w-10 h-10 opacity-20 text-slate-400" />
                            </div>
                            <p className="text-sm font-bold tracking-widest uppercase opacity-30 text-slate-400">Board Clean</p>
                        </motion.div>
                    ) : (
                        actions.map((action, idx) => (
                            <BoardItem
                                key={idx}
                                action={action}
                                index={idx}
                                isSpeaking={isSpeaking}
                                isActive={idx === activeItemIndex}
                                isPast={idx < activeItemIndex}
                                onFinished={() => {
                                    setTimeout(() => {
                                        setActiveItemIndex(prev => Math.min(prev + 1, actions.length));
                                    }, 400);
                                }}
                            />
                        ))
                    )}
                </AnimatePresence>
            </div>

            {/* Eraser Dust / Imperfections (Subtle) */}
            <div className="absolute top-10 right-10 w-32 h-32 bg-slate-900/[0.02] blur-3xl rounded-full pointer-events-none" />
        </div>
    );
}


function TypewriterText({ text = "", isActive, isPast, isSpeaking, className, onFinished }: {
    text?: string,
    isActive: boolean,
    isPast: boolean,
    isSpeaking: boolean,
    className?: string,
    onFinished?: () => void
}) {
    const [displayedText, setDisplayedText] = useState(isPast ? text : "");
    const [isFinished, setIsFinished] = useState(isPast);
    const [hasStarted, setHasStarted] = useState(isPast);
    const textRef = useRef(text);
    const onFinishedRef = useRef(onFinished);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        onFinishedRef.current = onFinished;
    }, [onFinished]);

    useEffect(() => {
        // Start typing as soon as it's active
        if (isActive && !hasStarted && text) {
            setHasStarted(true);
        }
    }, [isActive, hasStarted, text]);

    useEffect(() => {
        if (!hasStarted || isFinished || !text) {
            if (!text && !isFinished) {
                setIsFinished(true);
                onFinishedRef.current?.();
            }
            return;
        }

        const characters = text.split("");

        const typeNextCharacter = (idx: number) => {
            // Typing continues regardless of speech status to ensure completion

            if (idx < characters.length) {
                setDisplayedText(text.slice(0, idx + 1));

                // Normal speaking rate: faster typing
                const isSpace = characters[idx] === " ";
                const delay = isSpace ? 120 : 30 + Math.random() * 20;

                timeoutRef.current = setTimeout(() => {
                    typeNextCharacter(idx + 1);
                }, delay);
            } else {
                // Trigger finished state
                setIsFinished(true);
                onFinishedRef.current?.();
            }
        };

        // Resumed index from current text length
        typeNextCharacter(displayedText.length);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [hasStarted, text, isFinished, isSpeaking, isPast]);

    // Handle updates to existing items (optional, but keep for robustness)
    useEffect(() => {
        if (text !== textRef.current) {
            if (!isPast) {
                setDisplayedText("");
                setIsFinished(false);
                setHasStarted(false);
            } else {
                setDisplayedText(text);
            }
            textRef.current = text;
        }
    }, [text, isPast]);

    return (
        <span className={cn("relative inline", className)}>
            {displayedText}
            {isActive && !isFinished && (
                <motion.span
                    animate={{
                        x: [0, 2, -1, 0],
                        y: [0, -3, 2, 0],
                        rotate: [15, 20, 15]
                    }}
                    transition={{ duration: 0.15, repeat: Infinity }}
                    className="inline-block align-bottom ml-0.5 text-slate-800 pointer-events-none drop-shadow-sm"
                >
                    <PenLine className="w-5 h-5" />
                </motion.span>
            )}
        </span>
    );
}

function BoardItem({ action, index, isSpeaking, isActive, isPast, onFinished }: {
    action: BoardAction;
    index: number;
    isSpeaking: boolean;
    isActive: boolean;
    isPast: boolean;
    onFinished: () => void;
}) {
    // Unique rotation for each item based on its index
    const rotation = ((index % 3) - 1) * 0.2; // Very subtle tilt (-0.2, 0, 0.2 deg)

    // If it's an image, it "appears" instantly but still signals finished
    useEffect(() => {
        if (action.kind === "SHOW_IMAGE" && isActive) {
            const timer = setTimeout(() => {
                onFinished();
            }, 800); // Image "look" time
            return () => clearTimeout(timer);
        }
    }, [action.kind, isActive, onFinished]);

    const content = () => {
        switch (action.kind) {
            case "WRITE_TITLE":
                return (
                    <motion.h2
                        className="text-2xl font-normal tracking-tight text-blue-900 mb-4 border-b border-blue-100 pb-3 font-handwriting-body"
                    >
                        <TypewriterText text={action.payload.text} isActive={isActive} isPast={isPast} isSpeaking={isSpeaking} onFinished={onFinished} />
                    </motion.h2>
                );

            case "WRITE_BULLET":
                return (
                    <div className="flex items-start gap-4 text-xl font-normal text-slate-800 font-handwriting-body group">
                        <span className={cn(
                            "mt-3 w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0 transition-opacity duration-500",
                            (isActive || isPast) ? "opacity-40" : "opacity-0"
                        )} />
                        <TypewriterText text={action.payload.text} isActive={isActive} isPast={isPast} isSpeaking={isSpeaking} onFinished={onFinished} className="leading-relaxed" />
                    </div>
                );

            case "WRITE_STEP":
                return (
                    <div className="flex items-start gap-4 text-lg font-normal font-handwriting-body text-red-900 bg-red-50/20 p-4 rounded-xl border border-red-100/30">
                        <div className={cn(
                            "mt-0.5 min-w-[24px] h-[24px] flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-bold transition-opacity duration-500",
                            (isActive || isPast) ? "opacity-100" : "opacity-0"
                        )}>
                            {index + 1}
                        </div>
                        <TypewriterText text={action.payload.text} isActive={isActive} isPast={isPast} isSpeaking={isSpeaking} onFinished={onFinished} />
                    </div>
                );
            case "HIGHLIGHT":
                return (
                    <div className="bg-yellow-100/30 border-l-[4px] border-yellow-400/40 pl-5 py-3 rounded-r-xl my-4 font-handwriting-body font-normal">
                        <p className="text-slate-800 text-xl rotate-[-0.3deg]">
                            <TypewriterText text={action.payload.text} isActive={isActive} isPast={isPast} isSpeaking={isSpeaking} onFinished={onFinished} />
                        </p>
                    </div>
                );
            case "SHOW_IMAGE":
                return (
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={(isActive || isPast) ? { opacity: 1, y: 0 } : { opacity: 0 }}
                        className="rounded-2xl overflow-hidden border-2 border-white shadow-[0_15px_40px_rgba(0,0,0,0.08)] my-6 relative group"
                    >
                        <div className="bg-slate-50 aspect-video flex items-center justify-center flex-col gap-3 text-slate-300">
                            <ImageIcon className="w-12 h-12 opacity-30" />
                            <span className="text-[10px] uppercase tracking-widest font-bold font-sans">{action.payload.alt || "CONCEPT VISUALIZATION"}</span>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
                    </motion.div>
                );

            case "DRAW_DIAGRAM":
                return (
                    <div className="font-handwriting-body text-lg leading-relaxed bg-slate-50/30 p-5 rounded-xl border border-slate-100/50 text-blue-800 overflow-x-auto shadow-inner">
                        <TypewriterText text={action.payload.code || action.payload.text || ""} isActive={isActive} isPast={isPast} isSpeaking={isSpeaking} onFinished={onFinished} />
                    </div>
                );

            default:
                return null;
        }
    };

    const item = content();
    if (!item) return null;

    return (
        <motion.div
            initial={{ opacity: 0, x: -5 }}
            animate={(isActive || isPast) ? {
                opacity: 1,
                x: 0,
                rotate: rotation
            } : { opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full origin-left"
        >
            {item}
        </motion.div>
    );
}
