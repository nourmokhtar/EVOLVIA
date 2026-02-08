"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { UserPlus, AlertCircle, Loader, Camera, ArrowRight, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function SignupPage() {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        age: "",
        profession: "",
        dob: "",
    });
    const [pfp, setPfp] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPfp(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (step === 1) {
            setStep(2);
            return;
        }

        setError("");
        setIsLoading(true);

        try {
            // Simulated signup
            await new Promise(resolve => setTimeout(resolve, 1500));
            router.push("/login");
        } catch (err) {
            setError("Signup failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 lg:p-12 relative overflow-hidden">
            {/* Soft Ambient Background */}
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[120px] -ml-64 -mt-64" />
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -mr-64 -mb-64" />

            <div className="w-full max-w-[480px] z-10 animate-fade-in">
                <div className="mb-12 text-center">
                    <h1 className="text-4xl font-heading font-bold tracking-tight mb-3">
                        Join Evolvia<span className="text-secondary">.</span>
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase opacity-70">
                        {step === 1 ? "Create your profile" : "Account details"}
                    </p>
                </div>

                <div className="space-y-8">
                    {error && (
                        <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 flex gap-3 animate-in fade-in slide-in-from-top-2">
                            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="text-red-500 text-xs font-medium leading-relaxed">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {step === 1 ? (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                {/* Minimalist PFP Selector */}
                                <div className="flex flex-col items-center gap-4 mb-4">
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="relative w-24 h-24 rounded-full bg-muted border border-border flex items-center justify-center overflow-hidden cursor-pointer hover:border-secondary transition-all group"
                                    >
                                        {pfp ? (
                                            <img src={pfp} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <Camera className="w-6 h-6 text-muted-foreground group-hover:scale-110 transition-all" />
                                        )}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                            <span className="text-[9px] font-bold uppercase tracking-widest text-white">Upload</span>
                                        </div>
                                    </div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        accept="image/*"
                                        className="hidden"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                                        <label htmlFor="firstName" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 ml-0.5">
                                            First Name
                                        </label>
                                        <input
                                            id="firstName"
                                            type="text"
                                            placeholder="John"
                                            value={formData.firstName}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-0 py-2 bg-transparent border-b border-border focus:border-secondary focus:outline-none transition-all font-medium text-base placeholder:text-muted-foreground/30"
                                        />
                                    </div>

                                    <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                                        <label htmlFor="lastName" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 ml-0.5">
                                            Last Name
                                        </label>
                                        <input
                                            id="lastName"
                                            type="text"
                                            placeholder="Doe"
                                            value={formData.lastName}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-0 py-2 bg-transparent border-b border-border focus:border-secondary focus:outline-none transition-all font-medium text-base placeholder:text-muted-foreground/30"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                                    <label htmlFor="profession" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 ml-0.5">
                                        Profession
                                    </label>
                                    <input
                                        id="profession"
                                        type="text"
                                        placeholder="Product Designer"
                                        value={formData.profession}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-0 py-2 bg-transparent border-b border-border focus:border-secondary focus:outline-none transition-all font-medium text-base placeholder:text-muted-foreground/30"
                                    />
                                </div>

                                <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                                    <label htmlFor="age" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 ml-0.5">
                                        Age
                                    </label>
                                    <input
                                        id="age"
                                        type="number"
                                        placeholder="24"
                                        value={formData.age}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-0 py-2 bg-transparent border-b border-border focus:border-secondary focus:outline-none transition-all font-medium text-base placeholder:text-muted-foreground/30"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="w-full py-4 mt-4 rounded-full bg-foreground text-background font-bold uppercase tracking-widest hover:bg-foreground/90 transition-all flex items-center justify-center gap-3 group shadow-xl"
                                >
                                    <span>Continue</span>
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-4"
                                >
                                    <ArrowLeft className="w-3 h-3" /> Go Back
                                </button>

                                <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                                    <label htmlFor="dob" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 ml-0.5">
                                        Date of Birth
                                    </label>
                                    <input
                                        id="dob"
                                        type="date"
                                        value={formData.dob}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-0 py-2 bg-transparent border-b border-border focus:border-secondary focus:outline-none transition-all font-medium text-base placeholder:text-muted-foreground/30 [color-scheme:dark]"
                                    />
                                </div>

                                <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                                    <label htmlFor="email" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 ml-0.5">
                                        Email Address
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        placeholder="name@example.com"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-0 py-2 bg-transparent border-b border-border focus:border-secondary focus:outline-none transition-all font-medium text-base placeholder:text-muted-foreground/30"
                                    />
                                </div>

                                <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                                    <label htmlFor="password" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 ml-0.5">
                                        Password
                                    </label>
                                    <input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-0 py-2 bg-transparent border-b border-border focus:border-secondary focus:outline-none transition-all font-medium text-base placeholder:text-muted-foreground/30"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-4 mt-4 rounded-full bg-secondary text-white font-bold uppercase tracking-widest hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-3 group shadow-xl shadow-secondary/10"
                                >
                                    {isLoading ? (
                                        <Loader className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <span>Start Journey</span>
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </form>

                    <footer className="pt-8 text-center border-t border-border/50">
                        <p className="text-muted-foreground text-xs font-medium">
                            Already have an account?{" "}
                            <Link href="/login" className="text-foreground border-b border-foreground/30 hover:border-foreground transition-all ml-1">
                                Sign In
                            </Link>
                        </p>
                    </footer>
                </div>
            </div>
        </div>
    );
}
