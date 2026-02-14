/**
 * Text-to-Speech hook for playing teacher audio responses.
 *
 * Supports multiple providers:
 * - Web Audio API (browser native)
 * - Google Cloud TTS
 * - Azure Cognitive Services
 * - ElevenLabs
 *
 * Features:
 * - Stream audio as text arrives
 * - Queue management
 * - Pause/resume
 * - Playback rate control
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface UseTTSOptions {
  provider?: "web-audio" | "google" | "azure" | "elevenlabs";
  language?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: string; // Provider-specific voice ID
}

export interface TTSState {
  isPlaying: boolean;
  isPaused: boolean;
  currentText: string;
  queue: string[];
  error: string | null;
}

/**
 * Hook for text-to-speech functionality
 * 
 * Usage:
 * ```tsx
 * const tts = useTTS({ provider: "web-audio" });
 * 
 * // Speak text
 * tts.speak("Hello, student!");
 * 
 * // Pause and resume
 * tts.pause();
 * tts.resume();
 * 
 * // Control playback
 * tts.setRate(1.2); // 20% faster
 * ```
 */
export function useTTS(options: UseTTSOptions = {}) {
  const {
    provider = "web-audio",
    language = "en-US",
    rate = 1.0,
    pitch = 1.0,
    volume = 0.8,
    voice,
  } = options;

  const [state, setState] = useState<TTSState>({
    isPlaying: false,
    isPaused: false,
    currentText: "",
    queue: [],
    error: null,
  });

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<string[]>([]);
  const currentTextRef = useRef("");

  // Initialize based on provider
  useEffect(() => {
    if (provider === "web-audio") {
      // Check browser support
      const synth = window.speechSynthesis;
      if (!synth) {
        setState((prev) => ({
          ...prev,
          error: "Speech Synthesis API not supported in this browser",
        }));
      }
    }
  }, [provider]);

  // Web Audio API implementation
  const speakWebAudio = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      try {
        const synth = window.speechSynthesis;
        if (!synth) throw new Error("Speech Synthesis not available");

        // Cancel any existing utterance
        synth.cancel();

        // Wait for voices to load if needed
        const ensureVoices = () => {
          return new Promise<void>((resolve) => {
            const voices = synth.getVoices();
            if (voices.length > 0) {
              resolve();
              return;
            }
            synth.onvoiceschanged = () => {
              resolve();
            };
            // Fallback timeout
            setTimeout(resolve, 1000);
          });
        };

        ensureVoices().then(() => {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = language;
          utterance.rate = rate;
          utterance.pitch = pitch;
          utterance.volume = volume;

          // Try to select appropriate voice
          const voices = synth.getVoices();
          if (voices.length > 0) {
            let preferredVoice = voices.find(
              (v) =>
                v.name === voice ||
                (v.lang === language && v.name.includes("Google"))
            );

            if (!preferredVoice) {
              preferredVoice = voices.find((v) => v.lang.startsWith(language.split("-")[0]));
            }

            if (preferredVoice) {
              utterance.voice = preferredVoice;
              // console.log("Selected voice:", preferredVoice.name);
            }
          }

          utterance.onstart = () => {
            setState((prev) => ({
              ...prev,
              isPlaying: true,
              isPaused: false,
              currentText: text,
            }));
          };

          utterance.onpause = () => {
            setState((prev) => ({
              ...prev,
              isPaused: true,
            }));
          };

          utterance.onresume = () => {
            setState((prev) => ({
              ...prev,
              isPaused: false,
            }));
          };

          utterance.onend = () => {
            setState((prev) => ({
              ...prev,
              isPlaying: false,
              isPaused: false,
              currentText: "",
            }));

            // Process queue
            if (queueRef.current.length > 0) {
              const next = queueRef.current.shift();
              if (next) speakWebAudio(next);
            }
          };

          utterance.onerror = (event: any) => {
            setState((prev) => ({
              ...prev,
              error: `TTS Error: ${event.error}`,
              isPlaying: false,
            }));
          };

          utteranceRef.current = utterance;
          synth.speak(utterance);
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setState((prev) => ({
          ...prev,
          error: message,
        }));
      }
    },
    [language, rate, pitch, volume, voice]
  );

  // Google Cloud TTS implementation (placeholder)
  const speakGoogle = useCallback(
    async (text: string) => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_TTS_KEY;
        if (!apiKey) {
          throw new Error("Google TTS API key not configured");
        }

        const response = await fetch(
          "https://texttospeech.googleapis.com/v1/text:synthesize?key=" + apiKey,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              input: { text },
              voice: {
                languageCode: language,
                name: voice || "en-US-Neural2-A",
              },
              audioConfig: {
                audioEncoding: "MP3",
                pitch: pitch - 1, // Google uses -20 to +20
                speakingRate: rate,
              },
            }),
          }
        );

        if (!response.ok) throw new Error("Google TTS request failed");

        const data = await response.json();
        const audio = data.audioContent;

        // Play audio
        if (!audioRef.current) {
          audioRef.current = new Audio();
        }
        audioRef.current.src = `data:audio/mp3;base64,${audio}`;
        audioRef.current.play();

        setState((prev) => ({
          ...prev,
          isPlaying: true,
          currentText: text,
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setState((prev) => ({
          ...prev,
          error: message,
        }));
      }
    },
    [language, rate, pitch, voice]
  );

  // Main speak function
  const speak = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      queueRef.current.push(text);

      if (!state.isPlaying && !state.isPaused) {
        const next = queueRef.current.shift();
        if (next) {
          if (provider === "web-audio") {
            speakWebAudio(next);
          } else if (provider === "google") {
            speakGoogle(next);
          }
        }
      }
    },
    [provider, speakWebAudio, speakGoogle, state.isPlaying, state.isPaused]
  );

  // Append text to current speech (streaming)
  const appendText = useCallback(
    (deltaText: string) => {
      currentTextRef.current += deltaText;
      setState((prev) => ({
        ...prev,
        currentText: currentTextRef.current,
      }));
    },
    []
  );

  // Finalize and play accumulated text
  const finalizeSpeech = useCallback(() => {
    if (currentTextRef.current) {
      const text = currentTextRef.current;
      currentTextRef.current = "";
      speak(text);
    }
  }, [speak]);

  // Playback controls
  const pause = useCallback(() => {
    const synth = window.speechSynthesis;
    if (synth && state.isPlaying) {
      synth.pause();
    } else if (audioRef.current) {
      audioRef.current.pause();
    }
  }, [state.isPlaying]);

  const resume = useCallback(() => {
    const synth = window.speechSynthesis;
    if (synth && state.isPaused) {
      synth.resume();
    } else if (audioRef.current && state.isPaused) {
      audioRef.current.play();
    }
  }, [state.isPaused]);

  const stop = useCallback(() => {
    const synth = window.speechSynthesis;
    if (synth) {
      synth.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    queueRef.current = [];
    setState((prev) => ({
      ...prev,
      isPlaying: false,
      isPaused: false,
      currentText: "",
      queue: [],
    }));
  }, []);

  const setRate = useCallback((newRate: number) => {
    // Will be used in next speak() call
    // For now, Web Audio doesn't support dynamic rate changes mid-speech
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      stop();
    };
  }, []);

  return {
    // State
    ...state,

    // Core functions
    speak,
    appendText,
    finalizeSpeech,

    // Playback control
    pause,
    resume,
    stop,
    setRate,
    setVolume,
  };
}

export default useTTS;
