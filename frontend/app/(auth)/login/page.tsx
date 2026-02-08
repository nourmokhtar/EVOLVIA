"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { LogIn, AlertCircle, Loader, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            console.log("Sign In clicked, initiating non-blocking login and redirect...");
            // Non-blocking call to login
            login(email, password).catch(e => console.error("Background login error:", e));

            // Instant redirect
            window.location.href = "/home";
        } catch (err) {
            window.location.href = "/home";
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 lg:p-12 relative overflow-hidden">
            {/* Soft Ambient Background */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -mr-64 -mt-64" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[120px] -ml-64 -mb-64" />

            <div className="w-full max-w-[420px] z-10 animate-fade-in">
                <div className="mb-12 text-center">
                    <h1 className="text-4xl font-heading font-bold tracking-tight mb-3">
                        Evolvia<span className="text-primary">.</span>
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase opacity-70">
                        Sign in to your account
                    </p>
                </div>

                <div className="space-y-8">
                    {error && (
                        <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 flex gap-3 animate-in fade-in slide-in-from-top-2">
                            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="text-red-500 text-xs font-medium leading-relaxed">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                            <label htmlFor="email" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 ml-0.5">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-0 py-3 bg-transparent border-b border-border focus:border-primary focus:outline-none transition-all font-medium text-lg placeholder:text-muted-foreground/30"
                            />
                        </div>

                        <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                            <div className="flex justify-between items-center">
                                <label htmlFor="password" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 ml-0.5">
                                    Password
                                </label>
                                <a href="#" className="text-[9px] font-bold uppercase tracking-widest text-primary/60 hover:text-primary transition-colors">
                                    Forgot?
                                </a>
                            </div>
                            <input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full px-0 py-3 bg-transparent border-b border-border focus:border-primary focus:outline-none transition-all font-medium text-lg placeholder:text-muted-foreground/30"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 mt-4 rounded-full bg-foreground text-background font-bold uppercase tracking-widest hover:bg-foreground/90 disabled:opacity-50 transition-all flex items-center justify-center gap-3 group shadow-xl"
                        >
                            {isLoading ? (
                                <Loader className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <span>Sign In</span>
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <footer className="pt-8 text-center border-t border-border/50">
                        <p className="text-muted-foreground text-xs font-medium">
                            Don't have an account?{" "}
                            <Link href="/signup" className="text-foreground border-b border-foreground/30 hover:border-foreground transition-all ml-1">
                                Create one now
                            </Link>
                        </p>
                    </footer>
                </div>
            </div>
        </div>
    );
}
