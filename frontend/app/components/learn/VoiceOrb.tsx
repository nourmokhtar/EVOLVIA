"use client";

import React, { useEffect, useState } from "react";
import { Mic, MicOff, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceOrbProps {
    isRecording: boolean;
    onToggle: () => void;
    volume?: number;
    disabled?: boolean;
    size?: "sm" | "md" | "lg";
    showLabel?: boolean;
    className?: string; // Add className prop
}

export function VoiceOrb({
    isRecording,
    onToggle,
    volume = 0,
    disabled,
    size = "lg",
    showLabel = true,
    className
}: VoiceOrbProps) {
    // Visual state for the orb
    const [pulseScale, setPulseScale] = useState(1);

    // Simulate volume pulsing
    useEffect(() => {
        if (!isRecording) {
            setPulseScale(1);
            return;
        }
        const interval = setInterval(() => {
            setPulseScale(1 + Math.random() * 0.2);
        }, 150);
        return () => clearInterval(interval);
    }, [isRecording]);

    const sizeClasses = {
        sm: "w-8 h-8",
        md: "w-12 h-12",
        lg: "w-16 h-16"
    };

    const iconSizes = {
        sm: "w-4 h-4",
        md: "w-6 h-6",
        lg: "w-8 h-8"
    };

    return (
        <button
            onClick={onToggle}
            disabled={disabled}
            className={cn(
                "relative flex items-center justify-center transition-all duration-300 outline-none focus:scale-105 active:scale-95",
                disabled && "opacity-50 cursor-not-allowed",
                className
            )}
            title={isRecording ? "Stop Recording" : "Start Recording"}
        >
            {/* Outer Glow / Ripple */}
            <div
                className={cn(
                    "absolute inset-0 rounded-full transition-all duration-300",
                    isRecording ? "bg-red-500/20 animate-ping" : "bg-transparent"
                )}
            />

            {/* Main Orb */}
            <div
                className={cn(
                    "relative rounded-full flex items-center justify-center shadow-lg transition-all duration-300 border-2",
                    isRecording
                        ? "bg-gradient-to-br from-red-500 to-red-600 border-red-400 shadow-red-500/30"
                        : "bg-gradient-to-br from-primary to-blue-600 border-blue-400 shadow-blue-500/30 hover:shadow-blue-500/50",
                    sizeClasses[size]
                )}
                style={{
                    transform: isRecording ? `scale(${pulseScale})` : "scale(1)",
                }}
            >
                {isRecording ? (
                    <div className="flex gap-0.5">
                        <div className={cn("bg-white rounded-full animate-[bounce_1s_infinite_100ms]", size === "sm" ? "w-0.5 h-2" : "w-1 h-4")} />
                        <div className={cn("bg-white rounded-full animate-[bounce_1s_infinite_300ms]", size === "sm" ? "w-0.5 h-3" : "w-1 h-6")} />
                        <div className={cn("bg-white rounded-full animate-[bounce_1s_infinite_500ms]", size === "sm" ? "w-0.5 h-2" : "w-1 h-4")} />
                    </div>
                ) : (
                    <Mic className={cn("text-white drop-shadow-md", iconSizes[size])} />
                )}
            </div>

            {/* Label */}
            {showLabel && (
                <div className={cn(
                    "absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs font-medium whitespace-nowrap transition-all duration-300 px-2 py-0.5 rounded-full",
                    isRecording ? "text-red-400 bg-red-950/30" : "text-muted-foreground"
                )}>
                    {isRecording ? "Listening..." : "Tap to Speak"}
                </div>
            )}
        </button>
    );
}
