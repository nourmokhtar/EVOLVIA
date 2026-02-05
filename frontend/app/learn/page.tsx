"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  MessageSquare,
  Sparkles,
  ChevronLeft,
  Send,
  AlertCircle,
  Loader,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Mic,
  RefreshCw,
} from "lucide-react";
import { QuizModal } from "../components/learn/QuizModal";
import { LevelUpPopup } from "../components/learn/LevelUpPopup";
import { SourceSidebar } from "../components/learn/SourceSidebar";
import { StudioSidebar } from "../components/learn/StudioSidebar";
import { VirtualBoard } from "../components/learn/VirtualBoard";


import { cn } from "@/lib/utils";
import useLearnWebSocket, {
  TeacherTextFinalEvent,
  BoardAction,
} from "@/lib/hooks/useLearnWebSocket";
import useTTS from "@/lib/hooks/useTTS";
import useVoiceSystem from "@/lib/hooks/useVoiceSystem";


interface Message {
  role: "user" | "teacher" | "system";
  text: string;
  isInterruption?: boolean;
  timestamp?: number;
  isFinal?: boolean; // track if message is complete
  quiz?: any; // payload for inline quiz
}

export default function LearnPage() {
  const searchParams = useSearchParams();
  const lessonId = searchParams.get("lesson") || "lesson-001";
  const userId = searchParams.get("user") || "user-001";

  const ws = useLearnWebSocket({ apiUrl: process.env.NEXT_PUBLIC_API_URL });
  const tts = useTTS({ provider: "web-audio" });

  const voice = useVoiceSystem({
    onAudioChunk: (chunk) => {
      if (isVoiceRecordingRef.current) {
        console.log("🎤 Sending audio chunk to backend...");
        ws.sendAudioChunk(chunk);
      }
    },
    threshold: 0.05, // Slightly higher for manual focus
    silenceDuration: 1000
  });

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [boardActions, setBoardActions] = useState<BoardAction[]>([]);
  const [chatOpen, setChatOpen] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentTeacherTextRef = useRef("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const thinkingVideoRef = useRef<HTMLVideoElement>(null);
  const talkingVideoRef = useRef<HTMLVideoElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  const [hasStarted, setHasStarted] = useState(false);

  // Initialize session ONLY after user interaction
  const startLearning = () => {
    setHasStarted(true);

    // Initialize audio context
    if (tts.resume) tts.resume();

    // Start WebSocket session
    const initSession = async () => {
      setIsLoading(true);
      const success = await ws.startSession(lessonId, userId);
      if (!success) {
        addSystemMessage("Failed to connect to teacher", "error");
        setIsLoading(false);
      }
    };
    initSession();

    // Start listening for voice
    voice.startListening();
  };

  const [quizPayload, setQuizPayload] = useState<any>(null);
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const isQuizOpenRef = useRef(false);

  // Level Up State
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpAmount, setLevelUpAmount] = useState(1);

  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const isVoiceRecordingRef = useRef(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  useEffect(() => {
    isVoiceRecordingRef.current = isVoiceRecording;
  }, [isVoiceRecording]);

  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);

  const [voiceCount, setVoiceCount] = useState(0);

  // Set mounted state to prevent hydration mismatches
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const updateVoices = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        setVoiceCount(window.speechSynthesis.getVoices().length);
      }
    };

    updateVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);



  useEffect(() => {
    // Check if the last action is a quiz
    const lastAction = boardActions[boardActions.length - 1];

    // Debug logging
    if (lastAction) {
      console.log("Latest Board Action:", lastAction.kind, lastAction.payload);
    }

    if (lastAction?.kind === "SHOW_QUIZ") {
      console.log("Triggering QUIZ MODAL!", lastAction.payload);
      setQuizPayload(lastAction.payload);
      setIsQuizOpen(true);
      isQuizOpenRef.current = true;
      // Stop audio immediately
      tts.stop();
      setIsSpeaking(false);
    }
  }, [boardActions]);

  const isQuizAnsweredRef = useRef(false);

  const [currentLevel, setCurrentLevel] = useState(1);
  const [currentLevelTitle, setCurrentLevelTitle] = useState("Beginner");

  const scrollToBottom = useCallback(() => {
    setTimeout(
      () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
      100
    );
  }, []);

  const addSystemMessage = useCallback((text: string, type = "info") => {
    setMessages((prev) => [
      ...prev,
      {
        role: "system", // Ensure this is a valid role
        text,
        timestamp: Date.now(),
        isFinal: true,
      },
    ]);
  }, []);

  // Ref for currentLevel to access inside useEffect without triggering re-run
  const currentLevelRef = useRef(currentLevel);
  useEffect(() => {
    currentLevelRef.current = currentLevel;
  }, [currentLevel]);

  // Use ref to avoid re-triggering the main effect when state changes
  const hasStartedRef = useRef(hasStarted);
  useEffect(() => {
    hasStartedRef.current = hasStarted;
  }, [hasStarted]);

  // Handle global disconnect ONLY on unmount
  useEffect(() => {
    return () => {
      console.log("Component unmounting, disconnecting WebSocket");
      ws.disconnect();
    };
  }, [ws.disconnect]);

  const handleSendMessage = useCallback(async (textOverride?: string) => {
    const textToSend = typeof textOverride === 'string' ? textOverride : input;

    if (!textToSend.trim() || !ws.sessionId) return;

    const userMessage: Message = {
      role: "user",
      text: textToSend,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Only clear input if we sent what was in the input box
    if (!textOverride) {
      setInput("");
    }

    // Check if we're interrupting before setting loading state
    const wasInterrupting = isPaused || isSpeaking || tts.isPlaying || isLoading;

    // Stop any ongoing speech/audio when user sends a new message (interruption)
    if (isSpeaking || tts.isPlaying) {
      setIsSpeaking(false);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      tts.stop();
      // Clear any streaming text
      currentTeacherTextRef.current = "";
    }

    // Only flag as interruption if the teacher was actually generating or speaking
    const isActuallyInterruption = isSpeaking || tts.isPlaying || isLoading;

    setIsLoading(true);

    if (isPaused) {
      setIsPaused(false);
    }

    const success = ws.sendUserMessage(textToSend, isActuallyInterruption);
    if (!success) {
      addSystemMessage("Failed to send message", "error");
      setIsLoading(false);
    }

    scrollToBottom();
  }, [input, ws.sessionId, ws.sendUserMessage, isPaused, isSpeaking, tts.isPlaying, isLoading, addSystemMessage, scrollToBottom]);

  useEffect(() => {
    const unsubscribeConnected = ws.on("connected", () => {
      console.log("Connected to learning session");
      setIsLoading(false);
      addSystemMessage("Connected to teacher! Ready to learn.");
    });

    // Status updates (includes level changes and progress)
    const unsubscribeStatus = ws.on("status", (event: any) => {
      if (event.difficulty_level) setCurrentLevel(event.difficulty_level);
      if (event.difficulty_title) setCurrentLevelTitle(event.difficulty_title);
    });

    const unsubscribeTeacherDelta = ws.on("teacher_text_delta", (event: any) => {
      currentTeacherTextRef.current += event.delta;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === "teacher" && !last.isFinal && !last.quiz) { // Ensure it's not a final message or quiz
          // Update existing teacher message
          return [
            ...prev.slice(0, -1),
            { ...last, text: currentTeacherTextRef.current },
          ];
        } else {
          // New teacher message block
          // If we are starting a stream, and last was user or final teacher, add new.
          if (!last || last.role === "user" || last.isFinal || last.quiz) {
            return [...prev, { role: "teacher", text: currentTeacherTextRef.current, timestamp: Date.now() }];
          }
          return prev;
        }
      });
      scrollToBottom();
    });

    // Realtime board updates
    const unsubscribeBoardAction = ws.on("board_action", (event: any) => {
      if (event.action.kind === "SHOW_QUIZ") {
        setQuizPayload(event.action.payload);
        setIsQuizOpen(true);
      } else if (event.action.kind === "SHOW_REWARD") {
        console.log("REWARD ACTION RECEIVED:", event.action.payload);
        if (event.action.payload?.type === "LEVEL_UP") {
          setLevelUpAmount(event.action.payload.level || currentLevelRef.current + 1);
          setShowLevelUp(true);
        }
      } else {
        console.log("Realtime board action:", event.action);
        setBoardActions((prev) => {
          const newActions = [...prev];
          const action = event.action;
          if (action.kind === "CLEAR") {
            newActions.length = 0;
          } else {
            newActions.push(action);
          }
          return newActions.slice(-10);
        });
      }
    });

    const unsubscribeTeacherFinal = ws.on(
      "teacher_text_final",
      (event: TeacherTextFinalEvent) => {
        setIsLoading(false); // Teacher finished responding - allow new interactions

        // Trigger history refresh to update session list/titles in sidebar
        setHistoryRefreshTrigger(prev => prev + 1);

        // Mark last message as final
        // Also reset current ref for next turn? 
        // Actually we set state one last time to be sure.
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === "teacher" && !last.quiz) { // Ensure it's not a quiz message
            return [
              ...prev.slice(0, -1),
              { ...last, text: event.text, isFinal: true },
            ];
          } else if (!last || last.role === "user" || last.isFinal || last.quiz) {
            // If the last message was user, or already final, or a quiz, add a new final message
            return [
              ...prev,
              { role: "teacher", text: event.text, timestamp: Date.now(), isFinal: true },
            ];
          }
          return prev;
        });
        currentTeacherTextRef.current = "";
        setIsSpeaking(false);

        // Check for quiz action in this very event to prevent race condition
        const hasQuizAction = event.board_actions?.some((a: any) => a.kind === "SHOW_QUIZ");

        // Ensure we speak something even if streaming failed
        // But ONLY if quiz is NOT open currently OR we just answered it (feedback)
        // AND no new quiz arrived
        if ((!isQuizOpenRef.current || isQuizAnsweredRef.current) && !hasQuizAction) {
          if (currentTeacherTextRef.current.length < 5 && event.text.length > 5) {
            console.log("Streaming likely failed - relying on backend audio synthesis");
            // tts.speak(event.text); // DISABLED browser voice for high-quality backend voice
          } else {
            // tts.finalizeSpeech(); // DISABLED browser voice
          }
        } else {
          console.log("Quiz active or received - suppressing final speech");
          // tts.stop(); // DISABLED browser voice command
        }

        if (event.board_actions && event.board_actions.length > 0) {
          console.log("Received final board actions:", event.board_actions);
          // Merge or overwrite? Usually final has everything or just the summary. 
          // If we listened to realtime, we might duplicate if we just append.
          // Let's replace if we have a full set, or just rely on realtime? 
          // Learn.py sends ALL actions in final. So replacing is safer to ensure sync.
          setBoardActions(event.board_actions);
        }
        currentTeacherTextRef.current = "";
        scrollToBottom();
      }
    );

    const unsubscribeError = ws.on("error", (event: any) => {
      setIsLoading(false);
      addSystemMessage(`Error: ${event.message}`, "error");
    });

    const unsubscribeDisconnected = ws.on("disconnected", () => {
      setIsLoading(false);
      if (hasStartedRef.current) {
        addSystemMessage("Connection lost. Attempting to reconnect...");
      }
    });

    // History restoration
    const unsubscribeHistory = ws.on("history", (event: { history: any[] }) => {
      console.log("Restoring history:", event.history);
      const restoredMessages = event.history.map((msg, idx) => ({
        role: (msg.role === "user" ? "user" : "teacher") as "user" | "teacher",
        text: msg.content,
        timestamp: Date.now() - (event.history.length - idx) * 1000, // fake timestamp
        isFinal: true
      }));
      setMessages(restoredMessages);
      // Ensure we clear the current streaming buffer so it doesn't duplicate
      currentTeacherTextRef.current = "";
      scrollToBottom();
    });

    const unsubscribeTranscription = ws.on("voice_transcription", (event: { text: string }) => {
      console.log("📝 Received voice transcription:", event.text);
      setIsTranscribing(false);

      if (event.text && event.text.trim()) {
        const text = event.text.trim();
        // Show the text in the input bar for debugging
        setInput(text);

        // Brief delay so user can see it before it sends
        setTimeout(() => {
          handleSendMessage(text);
          // Only clear if the current input is still the auto-transcribed text
          setInput(prev => (prev === text || prev.trim() === text) ? "" : prev);
        }, 1200);
      } else {
        addSystemMessage("Could not hear you clearly. Please try again.", "info");
      }
    });

    return () => {
      unsubscribeConnected();
      unsubscribeStatus();
      unsubscribeTeacherDelta();
      unsubscribeBoardAction();
      unsubscribeTeacherFinal();
      unsubscribeError();
      unsubscribeDisconnected();
      unsubscribeHistory();
      unsubscribeTranscription();
    };
  }, [ws.on, addSystemMessage, scrollToBottom, handleSendMessage]);

  // Monitor voice errors
  useEffect(() => {
    if (voice.error) {
      addSystemMessage(voice.error, "error");
    }
  }, [voice.error, addSystemMessage]);

  // Handle audio output from backend (Piper TTS)
  useEffect(() => {
    const unsubscribeAudio = ws.on("audio_output", (audioBuffer: ArrayBuffer) => {
      console.log("Received audio output from teacher");

      // Stop any existing speech
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const blob = new Blob([audioBuffer], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onplay = () => setIsSpeaking(true);
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
      };

      audio.play().catch(e => console.error("Error playing teacher voice:", e));
    });

    return () => unsubscribeAudio();
  }, [ws.on]);

  // Explicit Video Control for Avatar Sync
  useEffect(() => {
    if (isSpeaking && talkingVideoRef.current) {
      talkingVideoRef.current.play().catch(e => console.warn("Avatar video play failed:", e));
    } else if (!isSpeaking && talkingVideoRef.current) {
      talkingVideoRef.current.pause();
      talkingVideoRef.current.currentTime = 0;
    }

    if (isLoading && !isSpeaking && thinkingVideoRef.current) {
      thinkingVideoRef.current.play().catch(e => console.warn("Thinking video play failed:", e));
    } else if (thinkingVideoRef.current) {
      thinkingVideoRef.current.pause();
      thinkingVideoRef.current.currentTime = 0;
    }
  }, [isSpeaking, isLoading]);


  const handleInterrupt = () => {
    setIsPaused(true);
    setIsSpeaking(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    tts.stop();
    ws.interrupt(); // No reason needed for manual pause
    addSystemMessage("Teaching paused. You can now speak or ask questions. Click resume to continue normally.");

    // Focus chat input for convenience
    setTimeout(() => chatInputRef.current?.focus(), 100);
  };

  const handleResume = () => {
    setIsPaused(false);
    ws.resume();
    addSystemMessage("Resuming...");
  };

  const togglePause = () => {
    if (isPaused) {
      handleResume();
    } else {
      handleInterrupt();
    }
  };

  const handleToggleVoice = () => {
    if (!ws.connected) return;

    if (!isVoiceRecording) {
      // START RECORDING
      setIsVoiceRecording(true);
      isVoiceRecordingRef.current = true;

      // Interrupt teacher if they are speaking
      if (!isPaused) {
        handleInterrupt();
      }

      ws.toggleVoice("start");
      console.log("Started manual voice recording - chunks should now send");
    } else {
      // STOP RECORDING
      setIsVoiceRecording(false);
      isVoiceRecordingRef.current = false;
      setIsTranscribing(true);
      ws.toggleVoice("stop");
      console.log("Stopped manual voice recording, waiting for transcription");
    }
  };

  const uploadFile = async (file: File) => {
    if (!ws.sessionId) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(
        `${apiUrl}/api/v1/learn/session/${ws.sessionId}/upload-course`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to upload file');
      }

      const result = await response.json();
      setUploadedFileName(file.name);
      addSystemMessage(result.message || `Course file "${file.name}" uploaded successfully!`, "info");
    } catch (error) {
      console.error('File upload error:', error);
      addSystemMessage(
        error instanceof Error ? error.message : 'Failed to upload course file',
        "error"
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadCourse = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await uploadFile(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (tts.isPlaying) {
      setIsSpeaking(true);
    } else {
      setIsSpeaking(false);
    }
  }, [tts.isPlaying]);

  // Control videos with priority: speaking > thinking > waiting
  useEffect(() => {
    if (!isMounted) return;

    const thinkingVideo = thinkingVideoRef.current;
    const talkingVideo = talkingVideoRef.current;

    // Helper function to safely play video
    const safePlay = (video: HTMLVideoElement | null, videoName: string) => {
      if (!video) return;

      // Use requestAnimationFrame to ensure any pending operations complete
      requestAnimationFrame(() => {
        if (!video) return;
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            // Ignore AbortError and NotAllowedError - they're expected in some cases
            if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') {
              console.error(`Error playing ${videoName} video:`, error);
            }
          });
        }
      });
    };

    // Helper function to safely stop video
    const safeStop = (video: HTMLVideoElement | null) => {
      if (!video) return;
      try {
        video.pause();
        video.currentTime = 0;
      } catch (error) {
        // Ignore errors when stopping
      }
    };

    if (isSpeaking) {
      // Priority 1: Speaking - stop thinking, play talking
      safeStop(thinkingVideo);
      if (talkingVideo) {
        talkingVideo.loop = true;
        talkingVideo.currentTime = 0;
        safePlay(talkingVideo, 'talking');
      }
    } else if (isLoading) {
      // Priority 2: Thinking - stop talking, play thinking
      safeStop(talkingVideo);
      if (thinkingVideo) {
        thinkingVideo.currentTime = 0;
        safePlay(thinkingVideo, 'thinking');
      }
    } else {
      // Priority 3: Waiting - stop both videos
      safeStop(thinkingVideo);
      safeStop(talkingVideo);
      if (talkingVideo) {
        talkingVideo.loop = false;
      }
    }
  }, [isLoading, isSpeaking, isMounted]);

  return (
    <div className="flex flex-col h-screen bg-background relative overflow-hidden">
      {/* Top: Course Upload Bar */}
      {/* Header - Minimalist */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-surface/50 backdrop-blur-md">
        <h1 className="font-bold text-xl flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white">
            <Sparkles className="w-5 h-5" />
          </div>
          Evolvia Notebook
        </h1>
        <div className="flex items-center gap-4">
          <div className="text-xs font-mono bg-primary/10 text-primary px-2 py-1 rounded">
            {ws.connected ? "Connected" : "Disconnected"}
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 border-2 border-surface shadow-sm"></div>
        </div>
      </div>

      {/* Hidden File Input for Sidebar */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.doc,.txt,.md"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Main Content */}

      <QuizModal
        isOpen={isQuizOpen}
        payload={quizPayload}
        onClose={() => {
          setIsQuizOpen(false);
          isQuizOpenRef.current = false;
        }}
        onAnswer={(correct) => {
          console.log("Quiz result:", correct);
          isQuizAnsweredRef.current = true; // Allow speech for feedback

          // Find correct option text
          const correctIndex = quizPayload.correct_index;
          const correctOptionText = quizPayload.options && quizPayload.options[correctIndex]
            ? quizPayload.options[correctIndex]
            : "Unknown";

          // Send result to backend with context
          const resultMsg = correct
            ? `[QUIZ_RESULT: CORRECT] Question: "${quizPayload.question}" Answer: "${correctOptionText}"`
            : `[QUIZ_RESULT: INCORRECT] Question: "${quizPayload.question}" Correct Answer: "${correctOptionText}"`;

          ws.sendUserMessage(resultMsg);
        }}
        currentLevel={currentLevel}
      />
      <LevelUpPopup
        isVisible={showLevelUp}
        level={levelUpAmount}
        onClose={() => setShowLevelUp(false)}
      />
      {/* Main Content Area */}
      <div className="flex-1 min-h-0 container mx-auto p-4 md:p-6 lg:p-8 max-w-[1800px]">
        {/* 3-Column Layout */}
        <div className="grid grid-cols-12 gap-6 h-full">


          {/* LEFT COLUMN: Sources (20%) */}
          <div className="col-span-12 lg:col-span-3 h-full overflow-hidden">
            <SourceSidebar
              uploadedFileName={uploadedFileName}
              onUpload={uploadFile}
              onRemove={() => setUploadedFileName(null)}
              isUploading={isUploading}
              refreshTrigger={historyRefreshTrigger}
              onSelectSession={(id) => {
                if (id === ws.sessionId) return;
                console.log("Switching to session:", id);

                // USER REQUEST: Stop TTS and Avatar immediately
                tts.stop();
                setIsSpeaking(false);

                ws.connect(id);
                setHasStarted(true);
                setMessages([]);
                setBoardActions([]);
              }}
              currentSessionId={ws.sessionId}
              onNewSession={async () => {
                console.log("Starting new session...");

                // USER REQUEST: Stop TTS and Avatar immediately
                tts.stop();
                setIsSpeaking(false);

                await ws.disconnect();
                setMessages([]);
                setBoardActions([]);
                setIsQuizOpen(false);
                setShowLevelUp(false);
                // Correct signature: startSession(lessonId, userId)
                // Backend will generate the session ID
                await ws.startSession(lessonId, userId);
              }}
            />
          </div>

          {/* CENTER COLUMN: Discussion (60%) */}
          <div className="col-span-12 lg:col-span-6 h-full flex flex-col gap-6 overflow-hidden">

            {/* Avatar & Board Section (Top) */}
            <div className="h-[40%] flex gap-4 min-h-0">
              {/* Avatar - Vertical / Phone Aspect */}
              <div className="relative w-[30%] max-w-[300px] text-center glass-card rounded-2xl overflow-hidden border border-border shadow-2xl">
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  {isMounted ? (
                    <>
                      <video
                        ref={thinkingVideoRef}
                        src="/avatars3/avatar-thinking.mp4"
                        className={cn(
                          "absolute inset-0 w-full h-full object-cover",
                          isLoading && !isSpeaking ? "block" : "hidden"
                        )}
                        playsInline
                        muted
                        onEnded={() => thinkingVideoRef.current?.pause()}
                      />
                      <video
                        ref={talkingVideoRef}
                        src="/avatars3/avatar-talking.mp4"
                        className={cn(
                          "absolute inset-0 w-full h-full object-cover",
                          isSpeaking ? "block" : "hidden"
                        )}
                        playsInline
                        muted
                        loop
                      />
                      {!isLoading && !isSpeaking && (
                        <Image
                          src="/avatars3/avatar-waiting.png"
                          alt="AI Teacher"
                          width={400}
                          height={711}
                          className="object-cover w-full h-full"
                          priority
                        />
                      )}
                    </>
                  ) : null}
                </div>
              </div>

              {/* Virtual Board - Takes remaining width */}
              <div className="flex-1 min-w-0">
                <VirtualBoard
                  actions={boardActions}
                  isSpeaking={isSpeaking}
                  className="h-full w-full"
                />
              </div>
            </div>

            {/* Chat Section (Bottom) */}
            <div className="flex-1 flex flex-col glass-card border border-border rounded-lg overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-50">
                    <MessageSquare className="w-12 h-12 mb-4" />
                    <p className="text-lg font-medium">Start the discussion</p>
                    <p className="text-sm">Ask a question or upload a source to begin.</p>
                  </div>
                )}

                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex w-full mb-4 animate-fadeIn",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-5 py-3 shadow-sm text-sm leading-relaxed",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-none"
                          : "bg-surface/80 border border-border backdrop-blur-sm rounded-tl-none"
                      )}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 bg-background/30 border-t border-border backdrop-blur-md">
                <div className="flex gap-2 items-center bg-surface/50 p-1.5 rounded-xl border border-white/10 shadow-inner">
                  <button
                    onClick={togglePause}
                    className={cn(
                      "p-2.5 rounded-lg transition-all",
                      isPaused
                        ? "bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30"
                        : "hover:bg-white/5 text-muted-foreground"
                    )}
                    title={isPaused ? "Resume" : "Pause"}
                  >
                    {isPaused ? <Play className="w-5 h-5 fill-current" /> : <Pause className="w-5 h-5 fill-current" />}
                  </button>

                  <button
                    onClick={handleToggleVoice}
                    disabled={!ws.connected || isTranscribing}
                    className={cn(
                      "p-2.5 rounded-lg transition-all flex items-center justify-center relative",
                      isVoiceRecording ? "text-primary animate-pulse bg-primary/10 shadow-[0_0_15px_rgba(59,130,246,0.3)]" :
                        isTranscribing ? "text-muted-foreground cursor-wait bg-white/5" :
                          isSpeaking ? "text-red-400 hover:bg-red-500/10 animate-pulse bg-red-500/5" :
                            "text-muted-foreground/30 hover:bg-white/5"
                    )}
                    title={isVoiceRecording ? "Stop recording" : isTranscribing ? "Transcribing..." : "Click to record voice"}
                  >
                    {isTranscribing ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Mic className={cn("w-5 h-5", (isVoiceRecording || isSpeaking) && "fill-current")} />
                    )}

                    {isVoiceRecording && (
                      <span className="absolute -top-1 -right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                      </span>
                    )}
                    {isSpeaking && !isVoiceRecording && !isTranscribing && (
                      <span className="absolute -top-1 -right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </span>
                    )}
                  </button>

                  <input
                    ref={chatInputRef}
                    type="text"
                    placeholder={
                      isPaused
                        ? "Speak now..."
                        : "Ask a question..."
                    }
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    disabled={!ws.connected}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm px-2 py-1"
                  />

                  <button
                    onClick={() => handleSendMessage()}
                    disabled={!input.trim() || !ws.connected}
                    className="p-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Studio (20%) */}
          <div className="col-span-12 lg:col-span-3 h-full overflow-hidden">
            <StudioSidebar
              onAction={(text: string) => handleSendMessage(text)}
              disabled={!ws.connected || isLoading}
            />
          </div>

        </div>
      </div>





      {/* Start Session Overlay */}
      {
        !hasStarted && (
          <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface border border-border rounded-xl p-8 max-w-md w-full text-center shadow-2xl">
              <h2 className="text-2xl font-bold mb-4">Ready to Learn?</h2>
              <p className="text-muted-foreground mb-8">
                Click start to connect to your AI teacher and enable audio.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={startLearning}
                  className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold text-lg transition-transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                  suppressHydrationWarning
                >
                  <Play className="w-6 h-6 fill-current" />
                  Start Session
                </button>

                <button
                  onClick={() => {
                    console.log("Testing audio...");
                    tts.speak("Checking audio system. One, two, three.");
                  }}
                  className="w-full py-3 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-xl font-medium flex items-center justify-center gap-2"
                  suppressHydrationWarning
                >
                  <Volume2 className="w-5 h-5" />
                  Test Audio (Click me first)
                </button>

                <div className="text-xs text-muted-foreground mt-2 bg-muted/50 p-2 rounded">
                  <p>Status: {tts.error ? `Error: ${tts.error}` : tts.isPlaying ? "Playing..." : "Ready"}</p>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}
