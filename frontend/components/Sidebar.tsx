"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    BookOpen,
    Mic2,
    BrainCircuit,
    User,
    Settings,
    ChevronLeft,
    ChevronRight,
    Sparkles,
    Languages
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/learn', label: 'Learning', icon: BookOpen },
    { href: '/language-improvement', label: 'Language Coach', icon: Languages },
    { href: '/practice', label: 'Soft Skills', icon: Mic2 },
    { href: '/personality', label: 'Personality', icon: BrainCircuit },
    { href: '/profile', label: 'Profile', icon: User },
    { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // During SSR/hydration, always render as expanded to avoid mismatch
    const displayCollapsed = isMounted ? collapsed : false;

    return (
        <aside
            className={cn(
                "fixed left-0 top-0 h-screen bg-surface border-r border-border transition-all duration-300 z-50 flex flex-col",
                displayCollapsed ? "w-20" : "w-64"
            )}
        >
            <div className="p-6 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-white" />
                </div>
                {!displayCollapsed && (
                    <span className="font-heading font-bold text-xl tracking-tight text-gradient">
                        Evolvia
                    </span>
                )}
            </div>

            <nav className="flex-1 px-3 space-y-1 mt-4">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-3 rounded-xl transition-all group",
                                isActive
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                            )}
                        >
                            <Icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                            {!displayCollapsed && (
                                <span className="font-medium">{item.label}</span>
                            )}
                            {isActive && !displayCollapsed && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-border">
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-white/5 transition-colors text-muted-foreground"
                    suppressHydrationWarning
                >
                    {displayCollapsed ? <ChevronRight className="w-5 h-5" /> : (
                        <div className="flex items-center gap-2 w-full px-2">
                            <ChevronLeft className="w-5 h-5" />
                            <span className="text-sm font-medium">Collapse</span>
                        </div>
                    )}
                </button>
            </div>
        </aside>
    );
}
