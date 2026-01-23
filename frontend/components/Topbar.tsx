"use client";

import { Bell, Search, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import ThemeToggle from './ThemeToggle';

export default function Topbar() {
    return (
        <header className="h-20 border-b border-border bg-background/50 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-8">
            <div className="relative w-96 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <input
                    type="text"
                    placeholder="Search modules, skills, or AI help..."
                    className="w-full bg-surface/50 border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
            </div>

            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/10 border border-secondary/20">
                    <Zap className="w-4 h-4 text-secondary fill-secondary" />
                    <span className="text-sm font-bold text-secondary">12 Day Streak</span>
                </div>

                <ThemeToggle />

                <button className="relative p-2 rounded-xl border border-border bg-surface hover:bg-white/5 transition-colors">
                    <Bell className="w-5 h-5 text-muted-foreground" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full border-2 border-background" />
                </button>

                <div className="flex items-center gap-3 pl-4 border-l border-border">
                    <div className="text-right">
                        <p className="text-sm font-semibold leading-tight">Alex Rivera</p>
                        <p className="text-xs text-muted-foreground lowercase">Pro Learner</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-accent to-secondary p-0.5">
                        <div className="w-full h-full rounded-[10px] bg-surface flex items-center justify-center overflow-hidden">
                            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" alt="Avatar" />
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
