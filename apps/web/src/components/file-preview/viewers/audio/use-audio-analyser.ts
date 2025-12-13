import { type RefObject, useEffect, useRef, useState } from "react";

type UseAudioAnalyserOptions = {
  fftSize?: number;
  smoothing?: number;
};

type AudioAnalyserState = {
  frequencyData: Uint8Array;
  isActive: boolean;
};

type AudioNodeCache = {
  context: AudioContext;
  analyser: AnalyserNode;
  source: MediaElementAudioSourceNode;
};

const audioNodeCache = new WeakMap<HTMLAudioElement, AudioNodeCache>();

function getOrCreateAudioNodes(
  audio: HTMLAudioElement,
  fftSize: number,
  smoothing: number
): AudioNodeCache | null {
  const existing = audioNodeCache.get(audio);
  if (existing) {
    existing.analyser.fftSize = fftSize;
    existing.analyser.smoothingTimeConstant = smoothing;
    return existing;
  }

  try {
    const context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = fftSize;
    analyser.smoothingTimeConstant = smoothing;

    const source = context.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(context.destination);

    const cache: AudioNodeCache = { context, analyser, source };
    audioNodeCache.set(audio, cache);
    return cache;
  } catch {
    return null;
  }
}

export function useAudioAnalyser(
  audioRef: RefObject<HTMLAudioElement | null>,
  { fftSize = 64, smoothing = 0.8 }: UseAudioAnalyserOptions = {}
): AudioAnalyserState {
  const nodesRef = useRef<AudioNodeCache | null>(null);
  const animationRef = useRef<number | null>(null);
  const [frequencyData, setFrequencyData] = useState<Uint8Array>(
    () => new Uint8Array(fftSize / 2)
  );
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const handlePlay = () => {
      if (!nodesRef.current) {
        nodesRef.current = getOrCreateAudioNodes(audio, fftSize, smoothing);
      }
      if (nodesRef.current) {
        const { context } = nodesRef.current;
        if (context.state === "suspended") {
          context.resume();
        }
        setIsActive(true);
      }
    };

    const handlePause = () => setIsActive(false);
    const handleEnded = () => setIsActive(false);

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    if (!audio.paused) {
      handlePlay();
    }

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      if (nodesRef.current?.context.state === "running") {
        nodesRef.current.context.suspend();
      }
    };
  }, [audioRef, fftSize, smoothing]);

  useEffect(() => {
    const nodes = nodesRef.current;
    if (!(isActive && nodes)) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const { analyser } = nodes;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const update = () => {
      analyser.getByteFrequencyData(dataArray);
      setFrequencyData(new Uint8Array(dataArray));
      animationRef.current = requestAnimationFrame(update);
    };

    update();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive]);

  return { frequencyData, isActive };
}
