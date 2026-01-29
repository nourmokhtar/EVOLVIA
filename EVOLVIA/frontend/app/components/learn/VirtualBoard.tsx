import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BoardAction } from "@/lib/hooks/useLearnWebSocket";
import { cn } from "@/lib/utils";
import { Copy, Check, Hash, List, Type, Image as ImageIcon } from "lucide-react";

interface VirtualBoardProps {
    actions: BoardAction[];
    className?: string;
}

// ... imports

export function VirtualBoard({ actions, className }: VirtualBoardProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [actions]);

    return (
        <div className={cn("flex flex-col h-full bg-slate-950/50 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl ring-1 ring-white/5", className)}>
            {/* Header - System Panel Look */}
            <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50" />
                    </div>
                    <div className="h-4 w-[1px] bg-white/10 mx-1" />
                    <span className="text-xs font-semibold tracking-wide text-blue-200/70 uppercase">Virtual Board</span>
                </div>
                <div className="flex gap-2">
                    <Hash className="w-3 h-3 text-white/20" />
                </div>
            </div>

            <div
                ref={scrollRef}
                className="flex-1 p-5 overflow-y-auto space-y-3 font-sans bg-gradient-to-b from-transparent to-black/20"
            >
                <AnimatePresence mode="popLayout">
                    {actions.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="h-full flex flex-col items-center justify-center text-white/20 gap-3"
                        >
                            <div className="p-4 rounded-full bg-white/5 ring-1 ring-white/10">
                                <Type className="w-8 h-8 opacity-40" />
                            </div>
                            <p className="text-xs font-medium tracking-wide">WAITING FOR INPUT...</p>
                        </motion.div>
                    ) : (
                        actions.map((action, idx) => (
                            <BoardItem key={idx} action={action} index={idx} />
                        ))
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

function BoardItem({ action, index }: { action: BoardAction; index: number }) {
    const content = () => {
        switch (action.kind) {
            case "WRITE_TITLE":
                return (
                    <motion.h2
                        className="text-lg font-bold tracking-tight bg-gradient-to-r from-blue-200 via-indigo-200 to-purple-200 bg-clip-text text-transparent border-b border-indigo-500/20 pb-2 mb-3 mt-1"
                    >
                        {action.payload.text}
                    </motion.h2>
                );

            case "WRITE_BULLET":
                return (
                    <div className="flex items-start gap-2.5 text-sm text-slate-300 group hover:text-white transition-colors">
                        <span className="mt-2 w-1 h-1 rounded-full bg-indigo-400 shrink-0 shadow-[0_0_8px_rgba(129,140,248,0.5)]" />
                        <span className="leading-relaxed font-light">{action.payload.text}</span>
                    </div>
                );

            case "WRITE_STEP":
                return (
                    <div className="flex items-start gap-3 text-xs font-medium text-slate-300 bg-indigo-950/20 p-2.5 rounded-lg border border-indigo-500/10 hover:border-indigo-500/20 transition-colors">
                        <div className="mt-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-mono border border-indigo-500/30">
                            {index + 1}
                        </div>
                        <span className="leading-relaxed">{action.payload.text}</span>
                    </div>
                );
            case "HIGHLIGHT":
                return (
                    <div className="bg-amber-500/10 border-l-2 border-amber-500/50 pl-3 py-2 rounded-r my-1.5">
                        <p className="text-amber-200/80 italic text-xs">
                            "{action.payload.text}"
                        </p>
                    </div>
                );
            case "SHOW_IMAGE":
                return (
                    <div className="rounded-lg overflow-hidden border border-white/10 my-1.5 group relative">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="bg-black/40 aspect-video flex items-center justify-center flex-col gap-2 text-white/30">
                            <ImageIcon className="w-6 h-6" />
                            <span className="text-[10px] uppercase tracking-wider">{action.payload.alt || "Visualization"}</span>
                        </div>
                    </div>
                );

            case "DRAW_DIAGRAM":
                return (
                    <div className="font-mono text-[10px] leading-tight bg-slate-950/80 p-3 rounded-lg border border-slate-800 text-emerald-400/90 overflow-x-auto shadow-inner">
                        {action.payload.code || action.payload.text || "Diagram Content"}
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full"
        >
            {item}
        </motion.div>
    );
}
