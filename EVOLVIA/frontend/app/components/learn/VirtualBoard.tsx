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

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [actions]);

    return (
        <div className={cn(
            "flex flex-col h-full rounded-2xl border border-border overflow-hidden shadow-2xl relative",
            "bg-[#1a1c1e] bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]",
            className
        )}>
            {/* Whiteboard Sheen / Reflection Effect */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-white/5 via-transparent to-transparent opacity-30" />

            {/* Header - Modern Slate Look */}
            <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/10 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-500/20 border border-slate-500/50" />
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-500/20 border border-slate-500/50" />
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-500/20 border border-slate-500/50" />
                    </div>
                    <div className="h-4 w-[1px] bg-white/10 mx-1" />
                    <span className="text-xs font-bold tracking-widest text-slate-100/60 uppercase">VIRTUAL WHITEBOARD</span>
                </div>
                <div className="flex gap-2">
                    <div className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                        <span className="text-[10px] text-blue-400 font-mono">LIVE_WRITE</span>
                    </div>
                </div>
            </div>

            <div
                ref={scrollRef}
                className="flex-1 p-8 overflow-y-auto space-y-6 relative z-10 scroll-smooth"
            >
                <AnimatePresence mode="popLayout">
                    {actions.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="h-full flex flex-col items-center justify-center text-white/10 gap-4"
                        >
                            <div className="p-6 rounded-3xl bg-white/5 border border-white/10 shadow-inner">
                                <ImageIcon className="w-12 h-12 opacity-20" />
                            </div>
                            <p className="text-sm font-medium tracking-widest uppercase opacity-40">Ready for teacher key points...</p>
                        </motion.div>
                    ) : (
                        actions.map((action, idx) => (
                            <BoardItem key={idx} action={action} index={idx} isSpeaking={isSpeaking} />
                        ))
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}


function TypewriterText({ text = "", isSpeaking, className }: { text?: string, isSpeaking: boolean, className?: string }) {
    const [displayedText, setDisplayedText] = useState("");
    const [isFinished, setIsFinished] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const textRef = useRef(text);

    useEffect(() => {
        if (isSpeaking && !hasStarted && text) {
            setHasStarted(true);
        }
    }, [isSpeaking, hasStarted, text]);

    useEffect(() => {
        if (!hasStarted || isFinished || !text) {
            if (!text) setIsFinished(true);
            return;
        }

        const words = text.split(" ");
        let currentWordIndex = 0;

        const interval = setInterval(() => {
            if (currentWordIndex < words.length) {
                setDisplayedText(words.slice(0, currentWordIndex + 1).join(" "));
                currentWordIndex++;
            } else {
                setIsFinished(true);
                clearInterval(interval);
            }
        }, 50); // Faster word writing

        return () => clearInterval(interval);
    }, [hasStarted, text, isFinished]);

    useEffect(() => {
        if (text !== textRef.current) {
            setDisplayedText("");
            setIsFinished(false);
            setHasStarted(false);
            textRef.current = text;
        }
    }, [text]);

    return (
        <span className={cn("relative inline", className)}>
            {displayedText}
            {isSpeaking && !isFinished && (
                <motion.span
                    animate={{
                        x: [0, 1, 0],
                        y: [0, -1, 0],
                        rotate: [12, 15, 12]
                    }}
                    transition={{ duration: 0.2, repeat: Infinity }}
                    className="inline-block align-bottom ml-1 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                >
                    <PenLine className="w-5 h-5" />
                </motion.span>
            )}
        </span>
    );
}

function BoardItem({ action, index, isSpeaking }: { action: BoardAction; index: number; isSpeaking: boolean }) {
    const content = () => {
        switch (action.kind) {
            case "WRITE_TITLE":
                return (
                    <motion.h2
                        className="text-2xl font-bold tracking-tight text-white mb-4 border-b border-white/10 pb-4 flex items-center gap-3"
                    >
                        <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                        <TypewriterText text={action.payload.text} isSpeaking={isSpeaking} />
                    </motion.h2>
                );

            case "WRITE_BULLET":
                return (
                    <div className="flex items-start gap-4 text-lg text-slate-100 group">
                        <span className="mt-3 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 shadow-[0_0_8px_rgba(129,140,248,0.5)]" />
                        <TypewriterText text={action.payload.text} isSpeaking={isSpeaking} className="font-light leading-relaxed" />
                    </div>
                );

            case "WRITE_STEP":
                return (
                    <div className="flex items-start gap-4 text-base font-medium text-slate-100 bg-white/5 p-4 rounded-xl border border-white/10">
                        <div className="mt-0.5 min-w-[24px] h-[24px] flex items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 text-xs font-mono border border-blue-500/30">
                            {index + 1}
                        </div>
                        <TypewriterText text={action.payload.text} isSpeaking={isSpeaking} />
                    </div>
                );
            case "HIGHLIGHT":
                return (
                    <div className="bg-amber-500/5 border-l-4 border-amber-500/50 pl-5 py-3 rounded-r-xl my-4">
                        <p className="text-amber-100/90 italic text-sm">
                            <TypewriterText text={action.payload.text} isSpeaking={isSpeaking} />
                        </p>
                    </div>
                );
            case "SHOW_IMAGE":
                return (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="rounded-2xl overflow-hidden border border-white/10 my-4 shadow-2xl overflow-hidden relative group"
                    >
                        <div className="bg-slate-900 aspect-video flex items-center justify-center flex-col gap-3 text-white/20">
                            <ImageIcon className="w-10 h-10" />
                            <span className="text-xs uppercase tracking-[0.2em] font-bold">{action.payload.alt || "CONCEPT VISUALIZATION"}</span>
                        </div>
                    </motion.div>
                );

            case "DRAW_DIAGRAM":
                return (
                    <div className="font-mono text-sm leading-relaxed bg-black/40 p-5 rounded-xl border border-white/10 text-emerald-400/90 overflow-x-auto shadow-inner">
                        <TypewriterText text={action.payload.code || action.payload.text || ""} isSpeaking={isSpeaking} />
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
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full"
        >
            {item}
        </motion.div>
    );
}
