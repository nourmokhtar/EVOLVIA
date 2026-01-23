"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export default function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className="w-10 h-10 rounded-xl border border-border bg-surface" />
        );
    }

    const isDark = theme === "dark";

    return (
        <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="relative p-2 rounded-xl border border-border bg-surface hover:bg-white/5 transition-colors group overflow-hidden"
            aria-label="Toggle theme"
        >
            <div className="relative w-5 h-5">
                <Sun
                    className={cn(
                        "w-5 h-5 text-muted-foreground transition-all duration-300 absolute inset-0",
                        isDark ? "-rotate-90 opacity-0" : "rotate-0 opacity-100"
                    )}
                />
                <Moon
                    className={cn(
                        "w-5 h-5 text-muted-foreground transition-all duration-300 absolute inset-0",
                        isDark ? "rotate-0 opacity-100" : "rotate-90 opacity-0"
                    )}
                />
            </div>
        </button>
    );
}
