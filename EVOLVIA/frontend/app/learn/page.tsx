"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
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
} from "lucide-react";
import { QuizModal } from "../components/learn/QuizModal";
import { cn } from "@/lib/utils";
import useLearnWebSocket, {
  TeacherTextFinalEvent,
  BoardAction,
} from "@/lib/hooks/useLearnWebSocket";
import useTTS from "@/lib/hooks/useTTS";


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
  };

  const [quizPayload, setQuizPayload] = useState<any>(null);
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const isQuizOpenRef = useRef(false);

  const [voiceCount, setVoiceCount] = useState(0);

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

  useEffect(() => {
    // Only run effects if started
    if (!hasStarted) return;

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
            console.log("Streaming likely failed, speaking full text fallback");
            tts.speak(event.text);
          } else {
            tts.finalizeSpeech();
          }
        } else {
          console.log("Quiz active or received - suppressing final speech");
          tts.stop();
        }

        setIsSpeaking(true);
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
      addSystemMessage(`Error: ${event.message}`, "error");
    });

    const unsubscribeDisconnected = ws.on("disconnected", () => {
      if (hasStarted) {
        addSystemMessage("Connection lost. Attempting to reconnect...");
      }
    });

    return () => {
      unsubscribeConnected();
      unsubscribeTeacherDelta();
      unsubscribeBoardAction();
      unsubscribeTeacherFinal();
      unsubscribeError();
      unsubscribeDisconnected();
      ws.disconnect();
    };
  }, [lessonId, userId, hasStarted]);

  const scrollToBottom = () => {
    setTimeout(
      () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
      100
    );
  };

  const addSystemMessage = (text: string, type = "info") => {
    setMessages((prev) => [
      ...prev,
      {
        role: "teacher",
        text: `[${type.toUpperCase()}] ${text}`,
        timestamp: Date.now(),
      },
    ]);
    scrollToBottom();
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !ws.sessionId) return;

    const userMessage: Message = {
      role: "user",
      text: input,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    const messageText = input;
    setInput("");

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

    const success = ws.sendUserMessage(messageText, isActuallyInterruption);
    if (!success) {
      addSystemMessage("Failed to send message", "error");
      setIsLoading(false);
    }

    scrollToBottom();
  };

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
  };

  const handleResume = () => {
    setIsPaused(false);
    ws.resume();
    addSystemMessage("Resuming...");
  };

  useEffect(() => {
    if (tts.isPlaying) {
      setIsSpeaking(true);
    } else {
      setIsSpeaking(false);
    }
  }, [tts.isPlaying]);

  return (
    <div className="flex flex-col h-screen bg-background relative overflow-hidden">
      {/* Top: Course Upload Bar */}
      <div className="border-b border-border bg-surface/50 px-4 py-3 flex items-center gap-4">
        <h1 className="text-lg font-bold">Evolvia Learning</h1>

        {/* Level Badge */}
        {hasStarted && (
          <div className="flex items-center gap-2 animate-fadeIn">
            <div className={cn(
              "px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-2 transition-all",
              currentLevel === 1 ? "bg-blue-500/10 border-blue-500/20 text-blue-500" :
                currentLevel === 2 ? "bg-green-500/10 border-green-500/20 text-green-500" :
                  currentLevel === 3 ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-500" :
                    currentLevel >= 4 ? "bg-purple-500/10 border-purple-500/20 text-purple-500" :
                      "bg-muted/50 text-muted-foreground"
            )}>
              <Sparkles className="w-3 h-3" />
              <span>Level {currentLevel}: {currentLevelTitle}</span>
            </div>
          </div>
        )}

        <button
          className="ml-auto px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
          title="Upload a new course"
          suppressHydrationWarning
        >
          <span>+</span> Upload Course
        </button>
      </div>

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
      />
      <div className="h-[calc(100vh-160px)] flex gap-4 overflow-hidden p-4">
        <div
          className={cn(
            "glass-card flex flex-col transition-all duration-300 overflow-hidden rounded-lg border border-border",
            chatOpen ? "flex-1" : "w-12"
          )}
        >
          <div className="p-4 border-b border-border flex items-center justify-between bg-surface/50">
            {chatOpen && (
              <h3 className="font-bold flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-primary" />
                Virtual Teacher
                {ws.status && <span className="text-xs text-muted-foreground">({ws.status})</span>}
              </h3>
            )}
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className="p-1 hover:bg-white/10 rounded-lg"
              suppressHydrationWarning
            >
              {chatOpen ? (
                <ChevronLeft className="w-5 h-5" />
              ) : (
                <MessageSquare className="w-5 h-5" />
              )}
            </button>
          </div>

          {chatOpen && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && !isLoading && (
                  <div className="text-center text-muted-foreground text-sm pt-8">
                    <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Initializing teacher...</p>
                  </div>
                )}

                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex gap-2",
                      msg.role === "user" ? "justify-end" : "justify-start",
                      msg.quiz && "flex-col items-start" // Adjust layout for quiz messages
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-xs px-3 py-2 rounded-lg text-sm group relative",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-surface/80 border border-border/50"
                      )}
                    >
                      {msg.text && msg.text.includes("[") ? (
                        <p className="text-xs opacity-75">{msg.text}</p>
                      ) : (
                        <div>
                          <p>{msg.text || ""}</p>
                          {msg.role === "teacher" && (
                            <button
                              onClick={() => {
                                console.log("Replaying:", msg.text);
                                tts.speak(msg.text);
                              }}
                              className="absolute -right-8 top-1 p-1.5 rounded-full bg-surface/50 hover:bg-surface text-muted-foreground hover:text-primary transition-all opacity-0 group-hover:opacity-100"
                              title="Replay audio"
                            >
                              <Volume2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {currentTeacherTextRef.current && (
                  <div className="flex gap-2">
                    <div className="max-w-xs px-3 py-2 rounded-lg text-sm bg-surface/80 border border-primary/30 animate-pulse">
                      <p>{currentTeacherTextRef.current}</p>
                    </div>
                  </div>
                )}

                {isLoading && !currentTeacherTextRef.current && (
                  <div className="flex gap-2">
                    <Loader className="w-4 h-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Teacher is thinking...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {ws.error && (
                <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/30 flex gap-2 text-xs text-red-600">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{ws.error}</span>
                </div>
              )}

              {!ws.connected && (
                <div className="px-4 py-2 bg-yellow-500/10 border-t border-yellow-500/30 text-xs text-yellow-600">
                  {ws.isReconnecting ? "Reconnecting..." : "Disconnected"}
                </div>
              )}

              <div className="border-t border-border p-3 bg-surface/50 space-y-2">
                <div className="flex gap-2">
                  <button
                    onClick={isPaused ? handleResume : handleInterrupt}
                    className={cn(
                      "p-2 rounded-lg transition-colors",
                      isPaused
                        ? "bg-primary/20 hover:bg-primary/30 text-primary"
                        : "bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-600"
                    )}
                    title={isPaused ? "Resume" : "Pause"}
                    suppressHydrationWarning
                  >
                    {isPaused ? (
                      <Play className="w-4 h-4" />
                    ) : (
                      <Pause className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    onClick={tts.isPlaying ? tts.pause : tts.resume}
                    className={cn(
                      "p-2 rounded-lg transition-colors",
                      tts.isPlaying
                        ? "bg-blue-500/20 hover:bg-blue-500/30 text-blue-600"
                        : "bg-gray-500/20 hover:bg-gray-500/30 text-gray-600"
                    )}
                    title={tts.isPlaying ? "Pause audio" : "Replay audio"}
                    suppressHydrationWarning
                  >
                    {tts.isPlaying ? (
                      <Volume2 className="w-4 h-4" />
                    ) : (
                      <VolumeX className="w-4 h-4" />
                    )}
                  </button>

                  <input
                    type="text"
                    placeholder={
                      isPaused
                        ? "Speak now (interrupt mode)..."
                        : isLoading
                          ? "Type to interrupt teacher..."
                          : "Ask a question..."
                    }
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) =>
                      e.key === "Enter" && handleSendMessage()
                    }
                    disabled={!ws.connected}
                    className="flex-1 bg-background/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                    suppressHydrationWarning
                  />

                  <button
                    onClick={handleSendMessage}
                    disabled={!ws.connected || !input.trim()}
                    className="p-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex-1 glass-card rounded-lg border border-border overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border bg-surface/50">
            <h3 className="font-bold flex items-center gap-2 text-sm">
              🤖 Virtual Board & Teacher
            </h3>
          </div>

          <div className="flex-1 flex gap-4 p-4 overflow-hidden bg-gradient-to-br from-surface/30 to-background/50">
            <div className="w-1/2 flex flex-col transition-all duration-300 -ml-4">
              <div className="rounded-lg overflow-hidden shadow-2xl border border-white/10 bg-black/50 backdrop-blur-md relative w-full h-full flex items-center justify-center">
                <iframe
                  src="https://www.canva.com/design/DAG_c54c93M/bFOEXv357Hbui8v-D2dLTg/view?embed"
                  title="Canva video player"
                  className="h-full aspect-video max-w-none"
                  allow="encrypted-media; autoplay; microphone; camera; display-capture"
                  allowFullScreen
                  id="canva-iframe"
                ></iframe>
              </div>
            </div>



            <div className="flex-1 overflow-auto">
              {boardActions.length === 0 ? (
                <div className="text-center text-muted-foreground pt-12">
                  <p className="text-sm">Board content will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {boardActions.map((action, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "bg-white/5 border border-white/10 rounded-lg p-3 animate-fadeIn shadow-sm hover:border-primary/30 transition-colors",
                        action.kind === "HIGHLIGHT" && "border-yellow-500/50 bg-yellow-500/5"
                      )}
                    >
                      {action.kind === "WRITE_TITLE" && (
                        <h4 className="font-bold text-lg text-primary border-b border-primary/20 pb-1 mb-2">
                          {action.payload.text}
                        </h4>
                      )}
                      {action.kind === "WRITE_BULLET" && (
                        <div className="flex gap-3 items-start">
                          <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                          <p className="text-sm leading-relaxed">{action.payload.text}</p>
                        </div>
                      )}
                      {action.kind === "WRITE_STEP" && (
                        <div className="flex gap-3 items-start bg-primary/5 rounded p-2">
                          <div className="bg-primary text-primary-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                            {action.payload.position}
                          </div>
                          <p className="text-sm font-medium">{action.payload.text}</p>
                        </div>
                      )}
                      {action.kind === "HIGHLIGHT" && (
                        <div className="flex gap-2 items-center text-yellow-500">
                          <Sparkles className="w-4 h-4" />
                          <p className="text-sm font-bold italic">{action.payload.text}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
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
