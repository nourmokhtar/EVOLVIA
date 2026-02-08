"use client";

import {
    Flame,
    Trophy,
    Calendar,
    Clock,
    Star,
    Mic2,
    Brain,
    Award,
    ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ProfilePage() {
    return (
        <div className="space-y-12 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row gap-8 items-center bg-surface/30 p-12 rounded-[32px] border border-border">
                <div className="w-32 h-32 rounded-3xl bg-gradient-to-tr from-primary to-accent p-1">
                    <div className="w-full h-full rounded-[20px] bg-surface flex items-center justify-center overflow-hidden">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" alt="Avatar" className="w-full h-full object-cover" />
                    </div>
                </div>
                <div className="text-center md:text-left flex-1">
                    <h1 className="text-4xl font-heading font-bold mb-2">Alex Rivera</h1>
                    <p className="text-muted-foreground mb-6 flex items-center justify-center md:justify-start gap-2">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" /> Professional Learner • Joined Jan 2026
                    </p>
                    <div className="flex flex-wrap justify-center md:justify-start gap-4">
                        <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
                            <Flame className="w-4 h-4 text-orange-500" />
                            <span className="font-bold">12 Day Streak</span>
                        </div>
                        <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-yellow-500" />
                            <span className="font-bold">Elite Tier</span>
                        </div>
                    </div>
                </div>
                <button className="btn-primary">Edit Profile</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Experience Stats */}
                <div className="lg:col-span-2 space-y-8">
                    <section className="glass-card p-8">
                        <h2 className="text-2xl font-bold font-heading mb-8 flex items-center gap-3">
                            <Brain className="w-6 h-6 text-primary" /> Mastery Analytics
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <p className="text-sm font-bold text-muted-foreground uppercase flex justify-between">
                                    Hard Skills <span>85%</span>
                                </p>
                                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary w-[85%]" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm font-bold text-muted-foreground uppercase flex justify-between">
                                    Soft Skills <span>72%</span>
                                </p>
                                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-secondary w-[72%]" />
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 grid grid-cols-3 gap-4 text-center">
                            <div className="p-4 rounded-2xl bg-white/5">
                                <p className="text-2xl font-black mb-1">42</p>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Lessons</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-white/5">
                                <p className="text-2xl font-black mb-1">128</p>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Exercises</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-white/5">
                                <p className="text-2xl font-black mb-1">15</p>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Certificates</p>
                            </div>
                        </div>
                    </section>

                    <section className="glass-card p-8">
                        <h2 className="text-2xl font-bold font-heading mb-6 flex items-center gap-3">
                            <Award className="w-6 h-6 text-accent" /> Recent Achievements
                        </h2>
                        <div className="grid grid-cols-4 gap-4">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="aspect-square rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center p-4 hover:border-accent/40 transition-colors cursor-pointer group">
                                    <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                        <Star className="w-6 h-6 text-accent" />
                                    </div>
                                    <p className="text-[8px] font-bold uppercase tracking-tighter text-center">Master Orator</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Sidebar Stats */}
                <div className="space-y-6">
                    <div className="glass-card p-6">
                        <h3 className="font-bold mb-4 flex items-center gap-2">
                            <Mic2 className="w-4 h-4 text-primary" /> Speech Insight
                        </h3>
                        <div className="space-y-4">
                            <div className="text-center py-4 bg-white/5 rounded-2xl">
                                <p className="text-sm text-muted-foreground mb-1">Average Clarity</p>
                                <p className="text-2xl font-black text-primary">88%</p>
                            </div>
                            <p className="text-xs text-muted-foreground text-center italic">
                                "Your tone is naturally encouraging. Focus on enunciation in presentations."
                            </p>
                        </div>
                    </div>

                    <div className="glass-card p-8 bg-gradient-to-br from-primary/20 to-transparent">
                        <h3 className="font-bold mb-2">Weekly Goal</h3>
                        <p className="text-xs text-muted-foreground mb-6">Complete 3 soft-skill simulations</p>
                        <div className="flex justify-between items-center mb-2 text-xs font-bold">
                            <span>2/3 Finished</span>
                            <span className="text-primary tracking-widest uppercase">Almost there!</span>
                        </div>
                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-primary w-2/3" />
                        </div>
                        <button className="w-full mt-6 py-2 text-[10px] font-bold uppercase tracking-widest border border-primary/40 rounded-lg hover:bg-primary/10 transition-colors">
                            View Path
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
