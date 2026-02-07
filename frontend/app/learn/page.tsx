"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
  Trophy,
} from "lucide-react";
import { QuizModal } from "../components/learn/QuizModal";
import { FlashcardModal } from "../components/learn/FlashcardModal";
import { LevelUpPopup } from "../components/learn/LevelUpPopup";
import { StudyHubModal } from "../components/learn/StudyHubModal";
import { SourceSidebar } from "../components/learn/SourceSidebar";
import { StudioSidebar } from "../components/learn/StudioSidebar";
import { VirtualBoard } from "../components/learn/VirtualBoard";
import { ChatMessage } from "../components/learn/ChatMessage";


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
  const router = useRouter();
  const searchParams = useSearchParams();
  const lessonId = searchParams.get("lesson") || "lesson-001";
  const userId = searchParams.get("user") || "user-001";
  const sessionIdParam = searchParams.get("session_id");

  const ws = useLearnWebSocket({ apiUrl: process.env.NEXT_PUBLIC_API_URL });


  // 2. Sync URL with current session ID
  const tts = useTTS({ provider: "web-audio" });

  const voice = useVoiceSystem({
    onAudioChunk: (chunk) => {
      if (isVoiceRecordingRef.current) {
        if (voiceCount % 50 === 0) {
          console.log(`🎤 Sending chunk ${voiceCount}, size: ${chunk.byteLength} bytes`);
        }
        setVoiceCount(prev => prev + 1);
        ws.sendAudioChunk(chunk);
      }
    },
    threshold: 0.01, // Lower threshold for better sensitivity
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

  // Initialize session on mount
  useEffect(() => {
    setIsMounted(true);

    const init = async () => {
      // Small delay to ensure everything is ready
      await new Promise(resolve => setTimeout(resolve, 500));

      // Initialize audio context (may still require first click elsewhere for some browsers)
      if (tts.resume) tts.resume();

      // Start WebSocket session
      setIsLoading(true);
      const currentSessionId = await ws.startSession(lessonId, userId);

      if (!currentSessionId) {
        addSystemMessage("Failed to connect to teacher", "error");
        setIsLoading(false);
      }
    };

    init();
  }, []);

  const [quizPayload, setQuizPayload] = useState<any>(null);
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const isQuizOpenRef = useRef(false);

  const [isFlashcardsOpen, setIsFlashcardsOpen] = useState(false);
  const [flashcardPayload, setFlashcardPayload] = useState<any>(null);
  const isFlashcardsOpenRef = useRef(false);

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

  // Study Hub State
  const [isStudyHubOpen, setIsStudyHubOpen] = useState(false);
  const [savedQuizzes, setSavedQuizzes] = useState<any[]>([]);
  const [savedFlashcards, setSavedFlashcards] = useState<any[]>([]);
  // const [studyHubSessionTitle, setStudyHubSessionTitle] = useState(""); // Removed, handled per item now

  const fetchStudyHubItems = async () => {
    if (!ws.sessionId) {
      addSystemMessage("Please start a session to view the Study Hub.", "info");
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      // Fetch items for the CURRENT session only
      const res = await fetch(`${apiUrl}/api/v1/learn/sessions/${ws.sessionId}`);

      if (res.ok) {
        const data = await res.json();
        console.log("Session Study Hub Data:", data);
        setSavedQuizzes(data.quizzes || []);
        setSavedFlashcards(data.flashcards || []);
        setIsStudyHubOpen(true);
      } else {
        console.error("Study Hub Fetch Failed:", res.status, res.statusText);
        addSystemMessage("Could not load Study Hub items for this session.", "error");
      }
    } catch (err: any) {
      console.error("Study Hub Error:", err);
      addSystemMessage(`Error loading Study Hub: ${err.message}`, "error");
    }
  };

  const handleOpenStudyHub = () => {
    fetchStudyHubItems();
  };

  const handleDeleteArtifact = async (item: any, type: "quiz" | "flashcards", index: number) => {
    // Note: index passed here is the index in the VIEW list, but we need the original_index from the item metadata
    // The item object itself contains source_title, session_id, and original_index.

    const sessionId = item.session_id;
    const originalIndex = item.original_index;

    if (!sessionId || originalIndex === undefined) {
      addSystemMessage("Cannot delete this item: missing metadata.", "error");
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/api/v1/learn/sessions/${sessionId}/artifacts?type=${type}&index=${originalIndex}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        addSystemMessage("Item deleted successfully.", "success");
        // Refresh the list
        fetchStudyHubItems();
      } else {
        const err = await res.json().catch(() => ({}));
        addSystemMessage(`Delete failed: ${err.detail || res.statusText}`, "error");
      }
    } catch (err: any) {
      addSystemMessage(`Delete error: ${err.message}`, "error");
    }
  };

  const handleRestoreFromStudyHub = (action: any) => {
    console.log("Restoring from Study Hub:", action);
    if (action.kind === "SHOW_FLASHCARDS") {
      setFlashcardPayload(action.payload);
      setIsFlashcardsOpen(true);
    } else if (action.kind === "SHOW_QUIZ") {
      setQuizPayload(action.payload);
      setIsQuizOpen(true);
    }
  };

  // Handle session loss (e.g. server restart or invalid session)
  useEffect(() => {
    if (ws.error && (ws.error.includes("Session ended") || ws.error.toLowerCase().includes("not found"))) {
      console.warn("Session ended or invalid. Resetting state.");
      setIsLoading(false);

      // CRITICAL: Clear the URL so we don't try to auto-resume this dead session
      const params = new URLSearchParams(searchParams.toString());
      if (params.has("session_id")) {
        params.delete("session_id");
        router.replace(`?${params.toString()}`);
      }
    }
  }, [ws.error, router, searchParams]);

  const [voiceCount, setVoiceCount] = useState(0);

  // Set mounted state to prevent hydration mismatches

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
    const lastAction = boardActions.find(a => a.kind === "SHOW_QUIZ");

    if (lastAction && !isQuizOpenRef.current && !isQuizAnsweredRef.current) {
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


  // Handle global disconnect ONLY on unmount
  useEffect(() => {
    return () => {
      console.log("Component unmounting, disconnecting WebSocket");
      ws.disconnect();
    };
  }, [ws.disconnect]);

  const handleSendMessage = useCallback(async (textOverride?: string, displayText?: string) => {
    const textToSend = typeof textOverride === 'string' ? textOverride : input;

    if (!textToSend.trim() || !ws.sessionId) return;

    const userMessage: Message = {
      role: "user",
      text: displayText || textToSend,
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
      // Refresh sidebar (titles/list) on any status change
      setHistoryRefreshTrigger(prev => prev + 1);
    });

    const unsubscribeTeacherDelta = ws.on("teacher_text_delta", (event: any) => {
      setIsLoading(false);
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
      setIsLoading(false);
      if (event.action.kind === "SHOW_QUIZ") {
        // Handled by boardActions useEffect to prevent duplication
        return;
      } else if (event.action.kind === "SHOW_REWARD") {
        console.log("REWARD ACTION RECEIVED:", event.action.payload);
        if (event.action.payload?.type === "LEVEL_UP") {
          setLevelUpAmount(event.action.payload.level || currentLevelRef.current + 1);
          setShowLevelUp(true);
        }
      } else if (event.action.kind === "SHOW_FLASHCARDS") {
        console.log("FLASHCARDS ACTION RECEIVED (Stream):", event.action.payload);
        return; // Handled in teacher_text_final to avoid race/duplication
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
        // Check for quiz action in this very event to prevent race condition
        const quizAction = event.board_actions?.find((a: any) => a.kind === "SHOW_QUIZ");

        if (quizAction && !isQuizOpenRef.current) {
          console.log("Found quiz action in final event:", quizAction);
          setQuizPayload(quizAction.payload);
          setIsQuizOpen(true);
          isQuizOpenRef.current = true;
        }

        // Check for flashcards action
        const flashcardsAction = event.board_actions?.find((a: any) => a.kind === "SHOW_FLASHCARDS");
        if (flashcardsAction && !isFlashcardsOpenRef.current) {
          console.log("Found flashcards action in final event:", flashcardsAction);
          setFlashcardPayload(flashcardsAction.payload);
          setIsFlashcardsOpen(true);
          isFlashcardsOpenRef.current = true;
        }

        // Check for streaming failure BEFORE resetting the ref
        if ((!isQuizOpenRef.current || isQuizAnsweredRef.current) && !quizAction) {
          if (currentTeacherTextRef.current.length < 5 && event.text.length > 5) {
            console.warn("Streaming buffer empty - relying on backend final text sync");
          }
        } else {
          console.log("Quiz active or received - suppressing final speech checks");
        }

        if (event.board_actions && event.board_actions.length > 0) {
          console.log("Received final board actions:", event.board_actions);
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
      // If the session is lost (e.g. server restart), we should allow restarting
      if (isMounted) {
        addSystemMessage("Connection lost. If it doesn't reconnect, please refresh the page.", "info");
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

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => {
          if (e.name !== 'AbortError') {
            console.error("Error playing teacher voice:", e);
          }
        });
      }
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

  const handleToggleVoice = async () => {
    if (!ws.connected) return;

    if (!isVoiceRecording) {
      // Ensure mic is actually listening
      if (!voice.isListening) {
        console.log("Initializing microphone for manual recording...");
        try {
          await voice.startListening();
        } catch (err) {
          console.error("Failed to start mic:", err);
          addSystemMessage("Could not access microphone. Please check permissions.", "error");
          return;
        }
      }

      // START RECORDING
      setIsVoiceRecording(true);
      isVoiceRecordingRef.current = true;

      // Interrupt teacher if they are speaking
      if (!isPaused || isSpeaking) {
        handleInterrupt();
      }

      ws.toggleVoice("start");
      console.log("Started manual voice recording - chunks should now send");
    } else {
      // STOP RECORDING
      setIsVoiceRecording(false);
      isVoiceRecordingRef.current = false;
      setIsTranscribing(true);

      // Release microphone resource immediately when stopping
      voice.stopListening();

      ws.toggleVoice("stop");
      console.log("Stopped manual voice recording, released mic, waiting for transcription");
    }
  };

  const uploadFile = async (file: File) => {
    // Force new session creation for upload context
    // This ensures we have a clean slate for the file discussion 
    // as requested by the user ("je veux dans une nouvelle dsicussion")

    setIsUploading(true);
    let targetSessionId = ws.sessionId;

    try {
      // If we want a new session for every upload, we first Start Session
      // Note: ws.startSession generates a new ID and connects
      const newSessionId = await ws.startSession(lessonId, userId);
      if (!newSessionId) {
        throw new Error("Failed to start new session for file upload");
      }

      // Use the returned ID immediately to avoid race condition
      targetSessionId = newSessionId;

      // Now upload to this NEW session
      const formData = new FormData();
      formData.append('file', file);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(
        `${apiUrl}/api/v1/learn/session/${targetSessionId}/upload-course`,
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

      // Clear UI messages for the clean slate (since we just started a session)
      setMessages([]);
      addSystemMessage(`New discussion started for document "${file.name}".`, "info");

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

      <StudyHubModal
        isOpen={isStudyHubOpen}
        onClose={() => setIsStudyHubOpen(false)}
        quizzes={savedQuizzes}
        flashcards={savedFlashcards}
        onRestore={(action) => {
          // Use the WebSocket hook's method to restore state
          ws.restoreBoardAction(action);
        }}
        onDelete={handleDeleteArtifact}
      />

      <QuizModal
        isOpen={isQuizOpen}
        payload={quizPayload}
        onClose={() => {
          setIsQuizOpen(false);
          isQuizOpenRef.current = false;
        }}
        onAnswer={(score, total) => {
          console.log(`Quiz completed. Score: ${score}/${total}`);
          isQuizAnsweredRef.current = true; // Allow speech for feedback

          // Send result to backend with context for motivating feedback
          const percentage = (score / total) * 100;
          let feedbackPrompt = "";

          if (percentage >= 80) {
            feedbackPrompt = `[QUIZ_COMPLETE] Excellent! User scored ${score}/${total} (${percentage}%). Please give a very heartfelt congratulations and encourage them to keep going. Speak at a normal, natural pace.`;
          } else if (percentage >= 50) {
            feedbackPrompt = `[QUIZ_COMPLETE] Good job. User scored ${score}/${total} (${percentage}%). Give them positive reinforcement and briefly mention one thing they could improve. If they missed any specific categories, mention them. Speak at a normal, natural pace.`;
          } else {
            feedbackPrompt = `[QUIZ_COMPLETE] Keep trying! User scored ${score}/${total} (${percentage}%). Provide warm encouragement, and write the correct answers for the topics they missed on the board. Explain that it's part of the process. Speak at a normal, natural pace.`;
          }

          setIsLoading(true);
          ws.sendUserMessage(feedbackPrompt);
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
              onSelectSession={async (id) => {
                if (id === ws.sessionId) return;
                console.log("Switching to session:", id);

                // USER REQUEST: Stop TTS and Avatar immediately
                tts.stop();
                setIsSpeaking(false);

                // Fetch session details to restore file state
                try {
                  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                  const res = await fetch(`${apiUrl}/api/v1/learn/sessions/${id}`);
                  if (res.ok) {
                    const details = await res.json();
                    setUploadedFileName(details.uploaded_file_name || null);
                  }
                } catch (error) {
                  console.error("Failed to fetch session details:", error);
                }

                ws.connect(id);
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
                setIsFlashcardsOpen(false);
                setShowLevelUp(false);
                // Correct signature: startSession(lessonId, userId)
                // Backend will generate the session ID
                await ws.startSession(lessonId, userId);
              }}
            />
          </div>

          {/* CENTER COLUMN: Discussion (60%) */}
          <div className="col-span-12 lg:col-span-6 h-full flex flex-col gap-6 overflow-hidden relative">
            {/* Flashcard Modal */}
            {isFlashcardsOpen && flashcardPayload && (
              <FlashcardModal
                cards={flashcardPayload.cards}
                onClose={() => {
                  setIsFlashcardsOpen(false);
                  isFlashcardsOpenRef.current = false;
                }}
              />
            )}

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
                  <ChatMessage
                    key={idx}
                    role={msg.role}
                    text={msg.text}
                    isFinal={msg.isFinal}
                  />
                ))}

                {/* Thinking Indicator */}
                {isLoading && messages[messages.length - 1]?.role === "user" && (
                  <ChatMessage
                    role="teacher"
                    text=""
                    isFinal={false}
                  />
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 bg-background/30 border-t border-border backdrop-blur-md">
                <div className="flex gap-2 items-center bg-surface/50 p-1.5 rounded-xl border border-white/10 shadow-inner">
                  <button
                    onClick={togglePause}
                    disabled={!ws.connected}
                    className={cn(
                      "p-2.5 rounded-lg transition-all",
                      !ws.connected ? "opacity-30 cursor-not-allowed" :
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

          <div className="col-span-12 lg:col-span-3 h-full overflow-hidden">
            <StudioSidebar
              onAction={(text: string, label?: string) => handleSendMessage(text, label)}
              onStartQuiz={() => {
                setIsLoading(true);
                setMessages((prev) => [...prev, { role: "user", text: "Start Quiz", timestamp: Date.now(), isFinal: true }]);
                isQuizAnsweredRef.current = false;
                isQuizOpenRef.current = false;
                ws.requestQuiz();
              }}
              onStartFlashcards={() => {
                setIsLoading(true);
                setMessages((prev) => [...prev, { role: "user", text: "Flashcards", timestamp: Date.now(), isFinal: true }]);
                isFlashcardsOpenRef.current = false;
                ws.requestFlashcards();
              }}
              onOpenStudyHub={handleOpenStudyHub}
              disabled={!ws.connected || isLoading}
              hasActiveUpload={!!uploadedFileName}
            />
          </div>

        </div>
      </div>





      {isQuizOpen && (
        <QuizModal
          isOpen={isQuizOpen}
          onClose={() => setIsQuizOpen(false)}
          onAnswer={(correct, total) => console.log("Quiz completed:", correct, total)}
          payload={quizPayload}
          currentLevel={1}
        />
      )}

      {isFlashcardsOpen && (
        <FlashcardModal
          cards={flashcardPayload?.cards || []}
          onClose={() => setIsFlashcardsOpen(false)}
        />
      )}

      {showLevelUp && (
        <LevelUpPopup
          isVisible={showLevelUp}
          onClose={() => setShowLevelUp(false)}
          level={levelUpAmount}
        />
      )}

      {isStudyHubOpen && (
        <StudyHubModal
          isOpen={isStudyHubOpen}
          onClose={() => setIsStudyHubOpen(false)}
          quizzes={savedQuizzes}
          flashcards={savedFlashcards}
          onRestore={handleRestoreFromStudyHub}
          onDelete={handleDeleteArtifact}
        />
      )}
    </div >
  );
}
