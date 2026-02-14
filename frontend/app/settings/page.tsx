"use client";

import {
    Bell,
    Moon,
    Sun,
    User,
    Globe,
    Shield,
    Smartphone,
    CreditCard,
    LogOut
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Prevent hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    const isDark = theme === 'dark';

    const sections = [
        { title: "Account", icon: User, items: ["Profile Information", "Email & Notification Preferences", "Language Settings"] },
        { title: "Learning", icon: Smartphone, items: ["Offline Access", "Download Quality", "Auto-play Video"] },
        { title: "Security", icon: Shield, items: ["Password", "Two-Factor Authentication", "Logged in Devices"] },
        { title: "Subscription", icon: CreditCard, items: ["Billing History", "Upgrade to Pro", "Manage Subscription"] },
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-12 animate-fade-in">
            <header>
                <h1 className="text-4xl font-heading font-bold mb-2">Settings</h1>
                <p className="text-muted-foreground">Manage your account and platform experience.</p>
            </header>

            <div className="glass-card overflow-hidden">
                <div className="p-8 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                            {isDark ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
                        </div>
                        <div>
                            <h3 className="font-bold">Dark Mode</h3>
                            <p className="text-sm text-muted-foreground">Easier on the eyes during late night learning sessions.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setTheme(isDark ? 'light' : 'dark')}
                        className={cn(
                            "w-12 h-6 rounded-full transition-colors relative",
                            isDark ? "bg-primary" : "bg-slate-300 dark:bg-slate-700"
                        )}
                    >
                        <div className={cn(
                            "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                            isDark ? "left-7" : "left-1"
                        )} />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2">
                    {sections.map((section, idx) => (
                        <div key={idx} className={cn(
                            "p-8 border-border",
                            idx % 2 === 0 ? "md:border-r" : "",
                            idx < 2 ? "border-b" : ""
                        )}>
                            <div className="flex items-center gap-3 mb-6">
                                <section.icon className="w-5 h-5 text-muted-foreground" />
                                <h3 className="font-bold text-lg">{section.title}</h3>
                            </div>
                            <ul className="space-y-4">
                                {section.items.map(item => (
                                    <li key={item} className="text-sm text-muted-foreground hover:text-primary cursor-pointer transition-colors flex items-center justify-between group">
                                        {item}
                                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="p-8 bg-black/20 border-t border-border flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">V 1.0.4 Pre-Alpha</p>
                    <button className="flex items-center gap-2 text-red-500 font-bold text-sm uppercase tracking-widest hover:text-red-400 transition-colors">
                        <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
}

function ArrowRight(props: any) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24" height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
        </svg>
    );
}
