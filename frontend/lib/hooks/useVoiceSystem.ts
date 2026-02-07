"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface VoiceSystemOptions {
    onSpeechStart?: () => void;
    onSpeechEnd?: () => void;
    onAudioChunk?: (chunk: ArrayBuffer) => void;
    threshold?: number; // RMS energy threshold (0.01 to 0.1 usually)
    silenceDuration?: number; // ms of silence before ending speech
    sampleRate?: number; // Backend expects 16000
}

export function useVoiceSystem(options: VoiceSystemOptions = {}) {
    const {
        onSpeechStart,
        onSpeechEnd,
        onAudioChunk,
        threshold = 0.02,
        silenceDuration = 800,
        sampleRate = 16000,
    } = options;

    const [isListening, setIsListening] = useState(false);
    const [isUserSpeaking, setIsUserSpeaking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const audioContextRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isSpeakingRef = useRef(false);
    const confirmedFramesRef = useRef(0);
    const MIN_CONFIRMED_FRAMES = 3; // ~100-150ms of sustained sound

    const stopListening = useCallback(() => {
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (sourceRef.current) {
            sourceRef.current.disconnect();
            sourceRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        setIsListening(false);
        setIsUserSpeaking(false);
        isSpeakingRef.current = false;
        confirmedFramesRef.current = 0;
        setError(null);
    }, []);

    const startListening = useCallback(async () => {
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
            const audioContext = new AudioContextClass({ sampleRate });
            audioContextRef.current = audioContext;

            const source = audioContext.createMediaStreamSource(stream);
            sourceRef.current = source;

            console.log(`🎙️ Voice system active. Sample rate: ${audioContext.sampleRate}Hz`);

            // ScriptProcessorNode for simplicity (deprecated but working for this use case)
            const processor = audioContext.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);

                // Calculate RMS energy
                let sum = 0;
                for (let i = 0; i < inputData.length; i++) {
                    sum += inputData[i] * inputData[i];
                }
                const rms = Math.sqrt(sum / inputData.length);

                // ALWAYS send audio chunk if callback is provided
                if (onAudioChunk) {
                    const pcmData = new Int16Array(inputData.length);
                    for (let i = 0; i < inputData.length; i++) {
                        const s = Math.max(-1, Math.min(1, inputData[i]));
                        pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                    }
                    onAudioChunk(pcmData.buffer);
                }

                if (rms > threshold) {
                    confirmedFramesRef.current++;

                    if (confirmedFramesRef.current >= MIN_CONFIRMED_FRAMES) {
                        // User is definitely speaking
                        if (!isSpeakingRef.current) {
                            isSpeakingRef.current = true;
                            setIsUserSpeaking(true);
                            if (onSpeechStart) onSpeechStart();
                        }

                        // Clear silence timeout
                        if (silenceTimeoutRef.current) {
                            clearTimeout(silenceTimeoutRef.current);
                            silenceTimeoutRef.current = null;
                        }
                    }
                } else {
                    confirmedFramesRef.current = Math.max(0, confirmedFramesRef.current - 1);

                    // User is silent
                    if (isSpeakingRef.current && !silenceTimeoutRef.current) {
                        silenceTimeoutRef.current = setTimeout(() => {
                            isSpeakingRef.current = false;
                            setIsUserSpeaking(false);
                            confirmedFramesRef.current = 0;
                            if (onSpeechEnd) onSpeechEnd();
                            silenceTimeoutRef.current = null;
                        }, silenceDuration);
                    }
                }
            };

            source.connect(processor);
            processor.connect(audioContext.destination);

            setIsListening(true);
        } catch (err: any) {
            console.error("Microphone access denied or error:", err);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setError("Microphone permission denied. Please enable it in your browser settings.");
            } else {
                setError("Could not access microphone. Please check your connection.");
            }
        }
    }, [threshold, silenceDuration, sampleRate, onSpeechStart, onSpeechEnd, onAudioChunk]);

    useEffect(() => {
        return () => {
            stopListening();
        };
    }, [stopListening]);

    return {
        isListening,
        isUserSpeaking,
        startListening,
        stopListening,
        error
    };
}

export default useVoiceSystem;
