/**
 * WebSocket hook for learning sessions - real-time bidirectional communication.
 *
 * Handles:
 * - Connecting to learning session WebSocket
 * - Sending user events (messages, interrupts, resume)
 * - Receiving teacher responses with streaming
 * - Auto-reconnect on disconnect
 * - Session state management
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Event types matching backend schemas
export type InboundEvent =
  | StartLessonEvent
  | UserMessageEvent
  | InterruptEvent
  | ResumeEvent
  | ChangeDifficultyEvent
  | ToggleVoiceEvent
  | RequestQuizEvent
  | RequestFlashcardsEvent
  | StatusEvent;

export interface RequestQuizEvent {
  type: "REQUEST_QUIZ";
  session_id: string;
}

export interface RequestFlashcardsEvent {
  type: "REQUEST_FLASHCARDS";
  session_id: string;
}

export type OutboundEvent =
  | TeacherTextDeltaEvent
  | TeacherTextFinalEvent
  | BoardActionEvent
  | CheckpointEvent
  | ErrorEvent
  | StatusEvent
  | HistoryEvent
  | VoiceTranscriptionEvent;

export interface HistoryEvent {
  type: "HISTORY";
  session_id: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface StartLessonEvent {
  type: "START_LESSON";
  lesson_id: string;
  user_id: string;
  context?: string;
}

export interface UserMessageEvent {
  type: "USER_MESSAGE";
  session_id: string;
  text: string;
  is_interruption?: boolean;
  timestamp?: number;
}

export interface InterruptEvent {
  type: "INTERRUPT";
  session_id: string;
  reason?: string;
}

export interface ResumeEvent {
  type: "RESUME";
  session_id: string;
  from_checkpoint?: string;
}

export interface StatusEvent {
  type: "STATUS";
  session_id: string;
  status: "idle" | "teaching" | "paused" | "answering" | "resuming" | "IDLE" | "TEACHING" | "PAUSED" | "ANSWERING" | "RESUMING"; // Allow both cases from backend
  difficulty_level?: number;
  difficulty_title?: string;
}

export interface ChangeDifficultyEvent {
  type: "CHANGE_DIFFICULTY";
  session_id: string;
  level: number;
}

export interface ToggleVoiceEvent {
  type: "TOGGLE_VOICE";
  session_id: string;
  action: "start" | "stop";
}

// Outbound events from teacher
export interface TeacherTextDeltaEvent {
  type: "TEACHER_TEXT_DELTA";
  session_id: string;
  step_id: number;
  delta: string;
  speech_segment?: string;
}

export interface TeacherTextFinalEvent {
  type: "TEACHER_TEXT_FINAL";
  session_id: string;
  step_id?: number;
  text: string;
  board_actions: BoardAction[];
}

export interface BoardAction {
  kind: "WRITE_TITLE" | "WRITE_BULLET" | "WRITE_STEP" | "CLEAR" | "HIGHLIGHT" | "SHOW_QUIZ" | "SHOW_FLASHCARDS" | "SHOW_IMAGE" | "DRAW_DIAGRAM";
  payload: Record<string, any>;
}

export interface BoardActionEvent {
  type: "BOARD_ACTION";
  session_id: string;
  action: BoardAction;
}

export interface CheckpointEvent {
  type: "CHECKPOINT";
  session_id: string;
  checkpoint_id: string;
  title: string;
  description: string;
}

export interface VoiceTranscriptionEvent {
  type: "VOICE_TRANSCRIPTION";
  session_id: string;
  text: string;
}

export interface ErrorEvent {
  type: "ERROR";
  session_id: string;
  error_code: string;
  message: string;
}

export interface WebSocketState {
  connected: boolean;
  sessionId: string | null;
  status: "idle" | "teaching" | "paused" | "answering" | "resuming";
  currentTeacherText: string;
  boardActions: BoardAction[];
  error: string | null;
  isReconnecting: boolean;
  difficultyLevel: number;
  difficultyTitle: string;
}

export interface UseWebSocketOptions {
  apiUrl?: string;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

/**
 * Hook for managing WebSocket connection to learning session
 * 
 * Usage:
 * ```tsx
 * const ws = useLearnWebSocket({apiUrl: "http://localhost:8000"});
 * 
 * // Start a session
 * ws.startSession("lesson-123", "user-456");
 * 
 * // Send a message
 * ws.sendUserMessage("I don't understand this part");
 * 
 * // Listen for events
 * useEffect(() => {
 *   ws.on("teacher_text_final", (event) => {
 *     console.log("Teacher said:", event.text);
 *   });
 * }, []);
 * ```
 */
export function useLearnWebSocket(
  options: UseWebSocketOptions = {}
) {
  const {
    apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
    autoConnect = false,
    reconnectAttempts = 5,
    reconnectDelay = 3000,
  } = options;

  // State
  const [state, setState] = useState<WebSocketState>({
    connected: false,
    sessionId: null,
    status: "idle",
    currentTeacherText: "",
    boardActions: [],
    error: null,
    isReconnecting: false,
    difficultyLevel: 1,
    difficultyTitle: "Beginner",
  });

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const eventHandlersRef = useRef<Map<string, Function[]>>(new Map());
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    sessionIdRef.current = state.sessionId;
  }, [state.sessionId]);

  // Event listener registration
  const on = useCallback((eventType: string, handler: Function) => {
    if (!eventHandlersRef.current.has(eventType)) {
      eventHandlersRef.current.set(eventType, []);
    }
    eventHandlersRef.current.get(eventType)!.push(handler);

    return () => {
      const handlers = eventHandlersRef.current.get(eventType);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }, []);

  // Emit events to listeners
  const emit = useCallback((eventType: string, data: any) => {
    const handlers = eventHandlersRef.current.get(eventType);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }, []);

  // Connect to WebSocket
  const connect = useCallback(
    (sessionId: string) => {
      if (!sessionId) return;

      // Use ref to check session without triggering dependency changes
      // Guard against multiple connection attempts to the SAME session if already connecting or open
      if (wsRef.current &&
        (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) &&
        sessionIdRef.current === sessionId) {
        return;
      }

      // If connected to a DIFFERENT session or closed, ensure old socket is cleaned up
      if (wsRef.current) {
        // Prevent onclose from attempting to reconnect the old session
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }

      // Update state and ref immediately to reflect the intention
      sessionIdRef.current = sessionId;
      setState(prev => ({ ...prev, sessionId, error: null }));

      const wsUrl = new URL(apiUrl);
      wsUrl.protocol = wsUrl.protocol === "https:" ? "wss:" : "ws:";
      wsUrl.pathname = `/api/v1/learn/ws/${sessionId}`;

      const finalUrl = wsUrl.toString();
      console.log("Connecting to WebSocket:", finalUrl);

      try {
        const ws = new WebSocket(finalUrl);
        ws.binaryType = "arraybuffer";

        ws.onopen = () => {
          console.log("WebSocket connected:", sessionId);
          setState((prev) => ({
            ...prev,
            connected: true,
            sessionId,
            error: null,
            isReconnecting: false,
          }));
          reconnectCountRef.current = 0;
          emit("connected", { sessionId });
        };

        ws.onmessage = (event) => {
          if (event.data instanceof ArrayBuffer) {
            // Binary audio from backend
            emit("audio_output", event.data);
          } else {
            try {
              const data = JSON.parse(event.data);
              handleWebSocketMessage(data);
            } catch (e) {
              console.error("Failed to parse WebSocket message:", e);
            }
          }
        };

        ws.onerror = (event) => {
          console.error("WebSocket error:", event, "URL was:", finalUrl);
          console.error("WebSocket ready state:", ws.readyState);
          setState((prev) => ({
            ...prev,
            error: "Connection error - check console for details",
          }));
          emit("error", { error: event });
        };

        ws.onclose = (event) => {
          console.log("WebSocket disconnected", event.code, event.reason);
          setState((prev) => ({
            ...prev,
            connected: false,
          }));
          emit("disconnected", {});

          // Stop reconnection if session not found (4004) or normal closure (1000)
          if (event.code === 4004 || event.code === 1000) {
            console.log("Session ended or not found. Stopping reconnection.");
            setState((prev) => ({
              ...prev,
              error: "Session ended. Please reload the page to start a new session.",
              isReconnecting: false
            }));
            return;
          }

          // Auto-reconnect
          if (
            reconnectCountRef.current < reconnectAttempts &&
            state.sessionId
          ) {
            reconnectCountRef.current++;
            setState((prev) => ({
              ...prev,
              isReconnecting: true,
            }));
            setTimeout(() => {
              connect(state.sessionId!);
            }, reconnectDelay);
          }
        };

        wsRef.current = ws;
      } catch (e) {
        console.error("Failed to create WebSocket:", e);
        setState((prev) => ({
          ...prev,
          error: String(e),
        }));
      }
    },
    [apiUrl, reconnectAttempts, reconnectDelay, state.sessionId, emit]
  );

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = useCallback(
    (data: OutboundEvent) => {
      switch (data.type) {
        case "STATUS":
          const statusEvent = data as StatusEvent;
          setState((prev) => ({
            ...prev,
            status: statusEvent.status.toLowerCase() as any, // mapping to internal lower case types
            difficultyLevel: statusEvent.difficulty_level || prev.difficultyLevel,
            difficultyTitle: statusEvent.difficulty_title || prev.difficultyTitle,
          }));
          emit("status", data);
          break;

        case "TEACHER_TEXT_DELTA":
          const deltaData = data as TeacherTextDeltaEvent;
          if (deltaData.speech_segment) {
            console.log("Received speech segment:", deltaData.speech_segment.substring(0, 20) + "...");
          }
          setState((prev) => ({
            ...prev,
            currentTeacherText:
              prev.currentTeacherText + deltaData.delta,
          }));
          emit("teacher_text_delta", data);
          break;

        case "TEACHER_TEXT_FINAL":
          const finalEvent = data as TeacherTextFinalEvent;
          setState((prev) => ({
            ...prev,
            currentTeacherText: finalEvent.text,
            // Don't overwrite board actions here - let the stream handle it to preserve state logic
            // boardActions: finalEvent.board_actions || [], 
          }));
          emit("teacher_text_final", data);
          break;


        case "HISTORY":
          const historyEvent = data as any; // Cast to specific type if defined
          // History event structure: { type: "HISTORY", history: [{role: "user"|"assistant", content: "..."}] }
          emit("history", historyEvent);
          break;

        case "BOARD_ACTION":
          const action = (data as BoardActionEvent).action;
          if (action.kind === "CLEAR") {
            setState((prev) => ({
              ...prev,
              boardActions: [],
            }));
          } else {
            setState((prev) => ({
              ...prev,
              boardActions: [...prev.boardActions, action],
            }));
          }
          emit("board_action", data);
          break;

        case "CHECKPOINT":
          emit("checkpoint", data);
          break;

        case "VOICE_TRANSCRIPTION":
          emit("voice_transcription", data);
          break;

        case "ERROR":
          setState((prev) => ({
            ...prev,
            error: (data as ErrorEvent).message,
          }));
          emit("error", data);
          break;
      }
    },
    [emit]
  );

  // Send message to WebSocket
  const sendMessage = useCallback((message: InboundEvent) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket not connected");
      return false;
    }

    try {
      wsRef.current.send(JSON.stringify(message));
      return true;
    } catch (e) {
      console.error("Failed to send WebSocket message:", e);
      return false;
    }
  }, []);

  // Send audio chunk (binary)
  const sendAudioChunk = useCallback((chunk: ArrayBuffer) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return false;
    }
    try {
      wsRef.current.send(chunk);
      return true;
    } catch (e) {
      console.error("Failed to send audio chunk:", e);
      return false;
    }
  }, []);

  // Convenience methods
  const startSession = useCallback(
    async (lessonId: string, userId: string, context?: string) => {
      try {
        // First, create session via HTTP endpoint
        const body: any = {
          type: "START_LESSON",
          lesson_id: lessonId,
        };

        // Only include user_id if it looks like a valid UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(userId)) {
          body.user_id = userId;
        }

        if (context) {
          body.context = context;
        }

        const response = await fetch(`${apiUrl}/api/v1/learn/session/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("Start session error response:", errorData);
          throw new Error(`Failed to start session: ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const sessionId = data.session_id;

        // Then connect to WebSocket with the session ID
        connect(sessionId);

        return sessionId;
      } catch (e) {
        console.error(`[useLearnWebSocket] Failed to startSession via ${apiUrl}/api/v1/learn/session/start:`, e);
        setState((prev) => ({
          ...prev,
          error: String(e),
        }));
        return null;
      }
    },
    [apiUrl, connect]
  );

  const sendUserMessage = useCallback(
    (text: string, isInterruption?: boolean) => {
      if (!state.sessionId) return false;
      return sendMessage({
        type: "USER_MESSAGE",
        session_id: state.sessionId,
        text,
        is_interruption: isInterruption,
      });
    },
    [state.sessionId, sendMessage]
  );

  const interrupt = useCallback(
    (reason?: string) => {
      if (!state.sessionId) return false;
      return sendMessage({
        type: "INTERRUPT",
        session_id: state.sessionId,
        reason,
      });
    },
    [state.sessionId, sendMessage]
  );

  const resume = useCallback(
    (fromCheckpoint?: string) => {
      if (!state.sessionId) return false;
      return sendMessage({
        type: "RESUME",
        session_id: state.sessionId,
        from_checkpoint: fromCheckpoint,
      });
    },
    [state.sessionId, sendMessage]
  );

  const getStatus = useCallback(() => {
    if (!state.sessionId) return false;
    return sendMessage({
      type: "STATUS",
      session_id: state.sessionId,
      status: "IDLE", // Dummy status to satisfy type, though backend treats this as outbound-only usually
    });
  }, [state.sessionId, sendMessage]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setState((prev) => ({
      ...prev,
      connected: false,
      sessionId: null,
    }));
  }, []);

  // Auto-connect on mount if requested
  useEffect(() => {
    if (autoConnect) {
      // Note: Can't auto-connect without a session ID
      // Client should call connect(sessionId) explicitly
    }
  }, [autoConnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    // State
    ...state,

    // Connection
    connect,
    disconnect,

    // Message sending
    sendMessage,
    sendUserMessage,
    interrupt,
    resume,
    getStatus,
    startSession,
    sendAudioChunk,

    toggleVoice: (action: "start" | "stop") => {
      if (!state.sessionId) return false;
      return sendMessage({
        type: "TOGGLE_VOICE",
        session_id: state.sessionId,
        action,
      });
    },

    requestQuiz: () => {
      if (!state.sessionId) return false;
      return sendMessage({
        type: "REQUEST_QUIZ",
        session_id: state.sessionId,
      } as RequestQuizEvent);
    },

    requestFlashcards: () => {
      if (!state.sessionId) return false;
      return sendMessage({
        type: "REQUEST_FLASHCARDS",
        session_id: state.sessionId,
      } as RequestFlashcardsEvent);
    },

    restoreBoardAction: (action: BoardAction) => {
      // We can define it inline here if we want, or outside.
      // Since I can't easily insert outside without risk, I'll define it inline here 
      // OR rely on the definition I will add next. 
      // Let's define it INLINE to be safe and atomic.
      setState((prev) => ({
        ...prev,
        boardActions: [{ kind: "CLEAR", payload: {} } as BoardAction, action],
        status: "teaching"
      }));
    },

    // Event listeners
    on,
  };
}

export default useLearnWebSocket;
