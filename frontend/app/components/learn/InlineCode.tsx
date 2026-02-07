import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface InlineCodeProps {
    code: string;
}

export function InlineCode({ code }: InlineCodeProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy code", err);
        }
    };

    return (
        <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 align-middle mx-1">
            <code className="font-mono text-[13px] text-zinc-100 leading-none pb-[1px]">
                {code}
            </code>
            <button
                onClick={handleCopy}
                className={cn(
                    "flex items-center justify-center p-0.5 rounded hover:bg-white/10 transition-colors",
                    copied ? "text-green-400" : "text-zinc-500 hover:text-zinc-300"
                )}
                title="Copy code"
                aria-label="Copy code snippet"
            >
                {copied ? (
                    <Check className="w-3 h-3" strokeWidth={3} />
                ) : (
                    <Copy className="w-3 h-3" strokeWidth={2.5} />
                )}
            </button>
        </span>
    );
}
