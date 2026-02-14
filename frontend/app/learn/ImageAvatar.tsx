"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface ImageAvatarProps {
    isSpeaking: boolean;
    className?: string;
}

export function ImageAvatar({ isSpeaking, className }: ImageAvatarProps) {
    const [scale, setScale] = useState(1);

    // Animation loop for speaking effect
    useEffect(() => {
        let animationFrame: number;
        let startTime: number;

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;

            // Simple sine wave for talking animation
            // Oscillate between 1.0 and 1.05 scale
            const newScale = 1 + Math.sin(elapsed * 0.01) * 0.03;
            setScale(newScale);

            if (isSpeaking) {
                animationFrame = requestAnimationFrame(animate);
            } else {
                setScale(1);
            }
        };

        if (isSpeaking) {
            animationFrame = requestAnimationFrame(animate);
        } else {
            setScale(1);
        }

        return () => {
            if (animationFrame) cancelAnimationFrame(animationFrame);
        };
    }, [isSpeaking]);

    return (
        <div className={cn("relative w-full h-full min-h-[300px] flex items-center justify-center bg-gradient-to-b from-blue-900/20 to-blue-900/40", className)}>
            <div
                className="relative w-64 h-64 transition-transform duration-100 ease-out"
                style={{ transform: `scale(${scale})` }}
            >
                <Image
                    src="/avatars/teacher.png"
                    alt="AI Teacher"
                    fill
                    className="object-contain drop-shadow-2xl"
                    priority
                />

                {/* Glow effect when speaking */}
                {isSpeaking && (
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse -z-10" />
                )}
            </div>

            {/* Speaking indicator */}
            <div className={cn(
                "absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/50 backdrop-blur-md text-xs font-medium text-white transition-opacity duration-300",
                isSpeaking ? "opacity-100" : "opacity-0"
            )}>
                Speaking...
            </div>
        </div>
    );
}
