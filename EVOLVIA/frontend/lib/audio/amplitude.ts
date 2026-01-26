/**
 * Web Audio API amplitude extraction for VRM avatar mouth animation
 * Computes RMS (root mean square) amplitude in real-time
 * Includes caching to avoid multiple AudioContexts per element
 */

import * as React from "react";

interface AmplitudeAnalyzer {
  analyser: AnalyserNode;
  dataArray: Uint8Array;
  cleanup: () => void;
}

// Cache to store one analyzer per audio element
const analyzerCache = new WeakMap<HTMLAudioElement, AmplitudeAnalyzer>();

/**
 * Get or create an amplitude analyzer for an audio element
 * Uses Web Audio API to compute real-time RMS amplitude
 *
 * @param audioElement - The HTML audio element to analyze
 * @returns Object with analyser, data array, and cleanup function
 */
function getOrCreateAnalyzer(audioElement: HTMLAudioElement): AmplitudeAnalyzer {
  // Check cache first
  if (analyzerCache.has(audioElement)) {
    return analyzerCache.get(audioElement)!;
  }

  // Create audio context (or get existing one)
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

  // Create analyser
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 256; // Smaller FFT for better responsiveness
  analyser.smoothingTimeConstant = 0.3; // Smoothing for less jitter

  // Create media element audio source
  const source = audioContext.createMediaElementSource(audioElement);
  source.connect(analyser);
  analyser.connect(audioContext.destination);

  // Data array for frequency data
  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  const analyzer: AmplitudeAnalyzer = {
    analyser,
    dataArray,
    cleanup: () => {
      analyser.disconnect();
      source.disconnect();
      audioContext.close().catch(() => {
        // Context may already be closed or not closeable on some browsers
      });
      analyzerCache.delete(audioElement);
    },
  };

  // Cache it
  analyzerCache.set(audioElement, analyzer);
  return analyzer;
}

/**
 * Compute RMS (Root Mean Square) amplitude from frequency data
 * Returns value normalized to 0..1 range
 *
 * @param dataArray - Uint8Array from AnalyserNode
 * @returns Normalized amplitude (0..1)
 */
function computeRMSAmplitude(dataArray: Uint8Array): number {
  if (!dataArray || dataArray.length === 0) return 0;

  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    const normalized = dataArray[i] / 255; // Normalize to 0..1
    sum += normalized * normalized; // Square
  }

  const mean = sum / dataArray.length;
  const rms = Math.sqrt(mean); // Square root

  // Scale up for better mouth movement (roughly 0..1 when speaking normally)
  return Math.min(rms * 2, 1);
}

/**
 * Get current amplitude from an audio element
 * Automatically manages AudioContext and cache
 *
 * @param audioElement - The HTML audio element
 * @returns Amplitude value 0..1 (0 when silent/stopped)
 */
export function getAmplitude(audioElement: HTMLAudioElement | null): number {
  if (!audioElement) return 0;

  // If audio is paused or ended, quickly return 0
  if (audioElement.paused || audioElement.ended) {
    return 0;
  }

  try {
    const { analyser, dataArray } = getOrCreateAnalyzer(audioElement);
    analyser.getByteFrequencyData(dataArray as any);
    return computeRMSAmplitude(dataArray);
  } catch (error) {
    console.error("Error computing amplitude:", error);
    return 0;
  }
}

/**
 * Clean up analyzer for an audio element
 * Call this when audio element is no longer needed
 *
 * @param audioElement - The HTML audio element
 */
export function cleanupAmplitudeAnalyzer(
  audioElement: HTMLAudioElement | null
): void {
  if (!audioElement) return;

  const analyzer = analyzerCache.get(audioElement);
  if (analyzer) {
    analyzer.cleanup();
  }
}

/**
 * Hook to get live amplitude updates in a React component
 * Manages analyzer lifecycle automatically
 */
export function useAmplitude(audioElement: HTMLAudioElement | null): number {
  const [amplitude, setAmplitude] = React.useState(0);

  React.useEffect(() => {
    if (!audioElement) {
      setAmplitude(0);
      return;
    }

    // Update amplitude on every frame for smooth animation
    let animationId: number;

    const updateAmplitude = () => {
      const currentAmplitude = getAmplitude(audioElement);
      setAmplitude(currentAmplitude);
      animationId = requestAnimationFrame(updateAmplitude);
    };

    animationId = requestAnimationFrame(updateAmplitude);

    return () => {
      cancelAnimationFrame(animationId);
      // Don't cleanup analyzer here - keep it cached for reuse
    };
  }, [audioElement]);

  return amplitude;
}
