import { useEffect, useState } from "react";
import { Sparkles, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface LevelUpPopupProps {
    isVisible: boolean;
    level: number;
    onClose: () => void;
}

export function LevelUpPopup({ isVisible, level, onClose }: LevelUpPopupProps) {
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (isVisible) {
            setShow(true);
            // Auto-hide after 5 seconds
            const timer = setTimeout(() => {
                handleClose();
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [isVisible]);

    const handleClose = () => {
        setShow(false);
        setTimeout(onClose, 300); // Wait for exit animation
    };

    if (!isVisible && !show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div
                className={cn(
                    "bg-black/80 backdrop-blur-xl border border-yellow-500/50 p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4 transition-all duration-500 transform",
                    show ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-90 translate-y-10"
                )}
            >
                <div className="relative">
                    <div className="absolute inset-0 bg-yellow-500/20 blur-xl rounded-full animate-pulse" />
                    <Trophy className="w-16 h-16 text-yellow-500 relative z-10 animate-bounce" />
                </div>

                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-yellow-300 to-yellow-600 bg-clip-text text-transparent">
                        Level Up!
                    </h2>
                    <p className="text-white/80 text-lg">
                        You've reached <span className="text-yellow-400 font-bold">Level {level}</span>
                    </p>
                </div>

                <div className="flex gap-2 items-center text-xs text-white/50">
                    <Sparkles className="w-4 h-4" />
                    <span>Difficulty Increased</span>
                    <Sparkles className="w-4 h-4" />
                </div>
            </div>
        </div>
    );
}
