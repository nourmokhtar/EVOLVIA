"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Mic, Square, Upload, Loader2, RefreshCw, Volume2 } from "lucide-react";
import { API } from "@/lib/api";
import { cn } from "@/lib/utils";

type LanguageCode = "en" | "fr" | "es" | "it" | "ar";

interface FluencyMetrics {
  speech_rate_wpm: number;
  articulation_rate_wpm: number;
  pause_frequency_per_min: number;
  long_pauses: { start: number; end: number; duration: number }[];
  filler_counts: Record<string, number>;
  repetition_estimate: { count: number; examples: string[] };
  normalized_against_level: boolean;
  fluency_score: number;
  notes: string[];
}

interface PronunciationDiagnostics {
  overall_score: number;
  method: string;
  suspect_words: {
    word: string;
    start: number;
    end: number;
    confidence: number;
    reason: string;
    certainty: "likely" | "possible";
  }[];
  issues_summary: {
    label: string;
    description: string;
    example_words: string[];
    certainty: "likely" | "possible";
  }[];
}

interface CoachingOutput {
  grammar_score?: number;
  grammar_feedback?: string;
  vocabulary_score?: number;
  vocabulary_feedback?: string;
  top_priorities: {
    id: string;
    title: string;
    reason: string;
  }[];
  explanations: {
    priority_id: string;
    simple_explanation: string;
    language_specific_notes: string;
  }[];
  micro_drills: {
    priority_id: string;
    title: string;
    instructions: string;
    estimated_seconds: number;
  }[];
  example_sentences: {
    priority_id: string;
    sentence: string;
    phonetic_hint: string;
  }[];
  retry_goal: {
    description: string;
    metrics_target?: {
      max_long_pauses?: number;
      max_filler_words?: number;
      target_fluency_score?: number;
      target_pronunciation_score?: number;
    };
  };
}

interface AnalysisResponse {
  attempt_id: string;
  asr: { transcript: string; language_code: string };
  fluency: FluencyMetrics;
  pronunciation: PronunciationDiagnostics;
  coaching: CoachingOutput;
}

const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  en: "English",
  fr: "Français",
  es: "Español",
  it: "Italiano",
  ar: "العربية",
};

export default function LanguageImprovementPage() {
  const searchParams = useSearchParams();
  const lessonId = searchParams.get("lesson") || "lesson-001";
  const initialLang = (searchParams.get("lang") as LanguageCode) || "en";

  const [language, setLanguage] = useState<LanguageCode>(initialLang);
  const [userLevel, setUserLevel] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  const [goal, setGoal] = useState<"conversation" | "exam" | "business">("conversation");

  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = useCallback(async () => {
    setError(null);
    setAnalysis(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/ogg";

      const recorder = new MediaRecorder(stream, { mimeType });
      recordedChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (e: any) {
      console.error("Recording error", e);
      setError("Could not access microphone. Please check permissions.");
    }
  }, [audioUrl]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      setAnalysis(null);
      setAudioBlob(file);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
    },
    [audioUrl]
  );

  const analyzeAudio = useCallback(async () => {
    if (!audioBlob) {
      setError("Please record or upload audio first.");
      return;
    }
    setIsAnalyzing(true);
    setError(null);
    setAnalysis(null);

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "speech.webm");
      formData.append("language_code", language);
      formData.append("user_level", userLevel);
      formData.append("goal", goal);
      formData.append("exercise_type", "free_speaking");
      formData.append("exercise_id", lessonId);

      const res = await fetch(API.languageImprovement.analyze, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        let detail = "Failed to analyze audio.";
        try {
          const errJson = await res.json();
          if (errJson?.detail) detail = errJson.detail;
        } catch {
          // ignore
        }
        throw new Error(detail);
      }

      const data = (await res.json()) as AnalysisResponse;
      setAnalysis(data);
    } catch (e: any) {
      console.error("Analyze error", e);
      setError(e?.message || "Unexpected error during analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [audioBlob, language, userLevel, goal, lessonId]);

  const lastFluencyScore = analysis?.fluency?.fluency_score ?? null;
  const lastPronScore = analysis?.pronunciation?.overall_score ?? null;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-heading">
            Language Improvement
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Analyze your {LANGUAGE_LABELS[language]} speaking for fluency and pronunciation,
            then get targeted drills.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as LanguageCode)}
            className="px-3 py-2 rounded-lg bg-surface border border-border text-sm"
          >
            <option value="en">English</option>
            <option value="fr">Français</option>
            <option value="es">Español</option>
            <option value="it">Italiano</option>
            <option value="ar">العربية</option>
          </select>
          <select
            value={userLevel}
            onChange={(e) =>
              setUserLevel(e.target.value as "beginner" | "intermediate" | "advanced")
            }
            className="px-3 py-2 rounded-lg bg-surface border border-border text-sm"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
          <select
            value={goal}
            onChange={(e) =>
              setGoal(e.target.value as "conversation" | "exam" | "business")
            }
            className="px-3 py-2 rounded-lg bg-surface border border-border text-sm"
          >
            <option value="conversation">Conversation</option>
            <option value="exam">Exam</option>
            <option value="business">Business</option>
          </select>
        </div>
      </div>

      {/* Recording / Upload card */}
      <div className="glass-card border border-border rounded-xl p-5 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="space-y-2">
          <h2 className="font-semibold">Record or upload your speech</h2>
          <p className="text-xs text-muted-foreground max-w-md">
            Speak for 20–40 seconds in {LANGUAGE_LABELS[language]}. We&apos;ll analyze your
            fluency and pronunciation and suggest micro-drills just for you.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              isRecording
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {isRecording ? (
              <>
                <Square className="w-4 h-4" />
                Stop recording
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                Record
              </>
            )}
          </button>

          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm cursor-pointer hover:bg-surface/70">
            <Upload className="w-4 h-4" />
            <span>Upload audio</span>
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>

          <button
            onClick={analyzeAudio}
            disabled={!audioBlob || isAnalyzing}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
              !audioBlob || isAnalyzing
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            )}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Analyze speech
              </>
            )}
          </button>

          {audioUrl && (
            <button
              onClick={() => {
                const audio = new Audio(audioUrl);
                audio.play();
              }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-xs hover:bg-surface/70"
            >
              <Volume2 className="w-4 h-4" />
              Play my attempt
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Results */}
      {analysis && (
        <div className="space-y-6">
          {/* Scores row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fluency card */}
            <div className="glass-card border border-border rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Fluency</h3>
                <span className="text-xs text-muted-foreground">
                  Level: {userLevel.charAt(0).toUpperCase() + userLevel.slice(1)}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">
                  {Math.round(lastFluencyScore ?? 0)}
                </span>
                <span className="text-xs text-muted-foreground">/ 100</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Speech rate</p>
                  <p className="font-medium">
                    {analysis.fluency.speech_rate_wpm.toFixed(0)} WPM
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Articulation rate</p>
                  <p className="font-medium">
                    {analysis.fluency.articulation_rate_wpm.toFixed(0)} WPM
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Long pauses &gt; 0.8s</p>
                  <p className="font-medium">
                    {analysis.fluency.long_pauses.length}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Filler words</p>
                  <p className="font-medium">
                    {Object.values(analysis.fluency.filler_counts).reduce(
                      (a, b) => a + b,
                      0
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Pronunciation card */}
            <div className="glass-card border border-border rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Pronunciation</h3>
                <span className="text-xs text-muted-foreground">
                  Method: {analysis.pronunciation.method}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">
                  {Math.round(lastPronScore ?? 0)}
                </span>
                <span className="text-xs text-muted-foreground">/ 100</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Suspect words</p>
                  <p className="font-medium">
                    {analysis.pronunciation.suspect_words.length}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Top issues</p>
                  <p className="font-medium">
                    {analysis.pronunciation.issues_summary.length || "None"}
                  </p>
                </div>
              </div>
              {analysis.pronunciation.issues_summary.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Some issues are marked as <span className="font-semibold">“likely”</span> or{" "}
                  <span className="font-semibold">“possible”</span> based on heuristic signals.
                </p>
              )}
            </div>
          </div>

          {/* Grammar & Vocabulary Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Grammar card */}
            <div className="glass-card border border-border rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Grammar</h3>
                <span className="text-xs text-muted-foreground">AI Assessment</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">
                  {analysis.coaching.grammar_score ?? 0}
                </span>
                <span className="text-xs text-muted-foreground">/ 100</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {analysis.coaching.grammar_feedback || "No specific feedback."}
              </p>
            </div>

            {/* Vocabulary card */}
            <div className="glass-card border border-border rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Vocabulary</h3>
                <span className="text-xs text-muted-foreground">AI Assessment</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">
                  {analysis.coaching.vocabulary_score ?? 0}
                </span>
                <span className="text-xs text-muted-foreground">/ 100</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {analysis.coaching.vocabulary_feedback || "No specific feedback."}
              </p>
            </div>
          </div>


          {/* Top 3 fixes */}
          <div className="glass-card border border-border rounded-xl p-5 space-y-3">
            <h3 className="font-semibold">Top 3 fixes</h3>
            <div className="space-y-3">
              {analysis.coaching.top_priorities.map((p, idx) => {
                const explanation = analysis.coaching.explanations.find(
                  (e) => e.priority_id === p.id
                );
                return (
                  <div
                    key={p.id}
                    className="rounded-lg bg-surface/60 border border-border/60 p-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex w-5 h-5 items-center justify-center rounded-full bg-primary/10 text-[11px] text-primary">
                        {idx + 1}
                      </span>
                      <p className="text-sm font-semibold">{p.title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">{p.reason}</p>
                    {explanation && (
                      <p className="text-xs">
                        <span className="font-semibold">How to change:</span>{" "}
                        {explanation.simple_explanation}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Micro-drills & examples */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="glass-card border border-border rounded-xl p-5 space-y-3">
              <h3 className="font-semibold">Micro-drills (30–60 seconds)</h3>
              <div className="space-y-3 text-sm">
                {analysis.coaching.micro_drills.map((d) => (
                  <div
                    key={d.title}
                    className="rounded-lg bg-surface/60 border border-border/60 p-3"
                  >
                    <p className="font-semibold mb-1">{d.title}</p>
                    <p className="text-xs text-muted-foreground mb-1">
                      {d.instructions}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      ~{d.estimated_seconds} seconds
                    </p>
                  </div>
                ))}
                {analysis.coaching.micro_drills.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No drills returned. Try another attempt.
                  </p>
                )}
              </div>
            </div>

            <div className="glass-card border border-border rounded-xl p-5 space-y-3">
              <h3 className="font-semibold">Example sentences</h3>
              <div className="space-y-3 text-sm">
                {analysis.coaching.example_sentences.map((ex, idx) => (
                  <div
                    key={`${ex.sentence}-${idx}`}
                    className="rounded-lg bg-surface/60 border border-border/60 p-3"
                  >
                    <p className="font-medium">{ex.sentence}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {ex.phonetic_hint}
                    </p>
                  </div>
                ))}
                {analysis.coaching.example_sentences.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No example sentences returned for this attempt.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Retry CTA */}
          <div className="glass-card border border-primary/40 rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h3 className="font-semibold mb-1">
                Retry with this goal: {analysis.coaching.retry_goal.description}
              </h3>

            </div>
            <button
              onClick={() => {
                setAnalysis(null);
                setAudioBlob(null);
                if (audioUrl) URL.revokeObjectURL(audioUrl);
                setAudioUrl(null);
                setError(null);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
            >
              <RefreshCw className="w-4 h-4" />
              Retry with new attempt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
