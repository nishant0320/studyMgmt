import { useEffect, useRef } from "react";
import { useAppStore } from "../store/AppStore";
import { useActiveTimer } from "../components/ActiveTimerProvider";

export function useAmbientSound() {
  const { state } = useAppStore();
  const { running } = useActiveTimer();
  const audioCtx = useRef<AudioContext | null>(null);
  const sourceNode = useRef<AudioBufferSourceNode | null>(null);
  const gainNode = useRef<GainNode | null>(null);

  const { focusSoundEnabled, focusSoundType } = state.settings;

  useEffect(() => {
    if (!focusSoundEnabled || !running || focusSoundType === "silence") {
      if (sourceNode.current) {
        try {
          sourceNode.current.stop();
        } catch (e) {
          // Ignore
        }
        sourceNode.current.disconnect();
        sourceNode.current = null;
      }
      return;
    }

    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const ctx = audioCtx.current;
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const bufferSize = ctx.sampleRate * 2; // 2 seconds of noise
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);

    // Generate noise based on type
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      if (focusSoundType === "whitenoise") {
        output[i] = white;
      } else if (focusSoundType === "rain" || focusSoundType === "forest") {
        // Brown noise approximation for rain/forest
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5; // Compensate gain
      } else if (focusSoundType === "lofi") {
        // Pink noise approximation for a warmer sound
        output[i] = (lastOut + 0.05 * white) / 1.05;
        lastOut = output[i];
        output[i] *= 2.5; 
      } else {
        output[i] = white;
      }
    }

    if (!gainNode.current) {
      gainNode.current = ctx.createGain();
      gainNode.current.connect(ctx.destination);
    }

    // Set volume based on type
    gainNode.current.gain.value = focusSoundType === "whitenoise" ? 0.05 : 0.15;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    
    // Simple lowpass filter to make it sound better
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = focusSoundType === "rain" ? 1000 : focusSoundType === "forest" ? 800 : focusSoundType === "lofi" ? 600 : 3000;
    
    source.connect(filter);
    filter.connect(gainNode.current);
    source.start(0);
    
    sourceNode.current = source;

    return () => {
      try {
        source.stop();
      } catch (e) {
        // Ignore
      }
      source.disconnect();
    };
  }, [focusSoundEnabled, focusSoundType, running]);
}
