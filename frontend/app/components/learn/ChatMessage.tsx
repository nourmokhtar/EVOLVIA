"use client";

import { cn } from "@/lib/utils";
import { MessageSquare, User, GraduationCap } from "lucide-react";

interface ChatMessageProps {
  role: "user" | "teacher" | "system";
  text: string;
  isFinal?: boolean;
}

import { CodeBlock } from "./CodeBlock";
import { InlineCode } from "./InlineCode";

/**
 * Custom Markdown-like parser for the chat.
 * Supports: 
 * - Code blocks (```lang code```)
 * - **bold**, headers (###), and bullet points (-).
 */
const MarkdownText = ({ text }: { text: string }) => {
  // 1. Split by code blocks first
  // Regex captures: [entire match, lang, code]
  // We use ([^\s`]+) to capture language (no spaces, no backticks)
  // and (?:\s+)? to consume optional whitespace/newline before code starts
  const parts = text.split(/```([^\s`]*)(?:\s+)?([\s\S]*?)```/g);

  // The split result will look like: 
  // [text, lang, code, text, lang, code, text...]

  const elements = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    // If we are at an index which is a code block (pattern: text, LANG, CODE, text...)
    // Actually split with capture groups works like: [pre, lang, code, post, lang, code...]
    // So:
    // i=0: text
    // i=1: lang (if match)
    // i=2: code (if match)
    // i=3: text

    if (i % 3 === 0) {
      // TEXT BLOCK
      if (part) {
        elements.push(<TextBlock key={i} text={part} />);
      }
    } else if (i % 3 === 1) {
      // LANG (skip, handled with code)
      continue;
    } else if (i % 3 === 2) {
      // CODE BLOCK
      const lang = parts[i - 1]; // language is at previous index
      const code = part;
      // Trim newline at the end if present (often produced by split)
      const cleanCode = code.endsWith('\n') ? code.slice(0, -1) : code;

      elements.push(
        <CodeBlock key={i} language={lang || 'text'} code={cleanCode} />
      );
    }
  }

  return <div className="space-y-1">{elements}</div>;
};

// Sub-component for regular markdown text (headers, lists)
const TextBlock = ({ text }: { text: string }) => {
  const lines = text.split("\n");

  return (
    <>
      {lines.map((line, i) => {
        // Headers (### Header)
        if (line.trim().startsWith("###")) {
          return (
            <h3 key={i} className="text-base font-bold text-primary mt-2 mb-1">
              {line.replace("###", "").trim()}
            </h3>
          );
        }

        // List items (- Item)
        if (line.trim().startsWith("- ")) {
          const content = line.trim().substring(2);
          return (
            <div key={i} className="flex gap-2 ml-1">
              <span className="text-primary">•</span>
              <p className="flex-1">{parseInline(content)}</p>
            </div>
          );
        }

        // Regular line
        return line.trim() === "" ? (
          <div key={i} className="h-2" />
        ) : (
          <p key={i}>{parseInline(line)}</p>
        );
      })}
    </>
  );
};

// Helper for bold and simple code spans
const parseInline = (text: string) => {
  // Matches **bold** or `code`
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-bold text-primary">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <InlineCode key={i} code={part.slice(1, -1)} />
      );
    }
    return part;
  });
};

export function ChatMessage({ role, text, isFinal }: ChatMessageProps) {
  const isUser = role === "user";
  const isSystem = role === "system";

  if (isSystem) {
    return (
      <div className="flex justify-start my-4 animate-fadeIn px-1">
        <div className="bg-muted/30 text-muted-foreground px-4 py-1.5 rounded-full text-xs font-medium border border-border/50">
          {text}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex w-full mb-6 gap-3 group animate-fadeIn",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar Circle */}
      <div
        className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-sm transition-transform group-hover:scale-105",
          isUser
            ? "bg-primary text-primary-foreground border-primary/20"
            : "bg-surface border-border text-primary"
        )}
      >
        {isUser ? (
          <User className="w-5 h-5" />
        ) : (
          <GraduationCap className="w-5 h-5" />
        )}
      </div>

      {/* Bubble Container */}
      <div
        className={cn(
          "flex flex-col max-w-[85%] sm:max-w-[75%]",
          isUser ? "items-end" : "items-start"
        )}
      >
        {/* Role Label & Timestamp (Optional) */}
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 px-1">
          {isUser ? "You" : "Teacher AI"}
        </span>

        {/* The Actual Bubble */}
        <div
          className={cn(
            "relative px-5 py-3.5 rounded-2xl shadow-sm text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-none"
              : "bg-surface/80 border border-border backdrop-blur-sm shadow-inner rounded-tl-none ring-1 ring-white/10"
          )}
        >
          {/* Markdown Content */}
          <MarkdownText text={text} />

          {/* Thinking Dots (Optional UI indicator for streaming) */}
          {!isFinal && !isUser && (
            <div className="flex gap-1 mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
