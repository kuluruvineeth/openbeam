"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const BAND_RANGES = [
  { lo: 80, hi: 200 },
  { lo: 200, hi: 400 },
  { lo: 400, hi: 800 },
  { lo: 800, hi: 1600 },
  { lo: 1600, hi: 4000 },
];

const FFT_SIZE = 256;
const SMOOTHING = 0.7;
const SAMPLE_RATE = 44_100;

function frequencyToBin(freq: number, binCount: number): number {
  return Math.round((freq / (SAMPLE_RATE / 2)) * binCount);
}

function extractBands(data: Uint8Array, binCount: number): number[] {
  return BAND_RANGES.map(({ lo, hi }) => {
    const loIdx = Math.max(0, frequencyToBin(lo, binCount));
    const hiIdx = Math.min(binCount - 1, frequencyToBin(hi, binCount));
    if (loIdx >= hiIdx) {
      return 0;
    }

    let sum = 0;
    let count = 0;
    for (let i = loIdx; i <= hiIdx; i += 1) {
      sum += data[i] ?? 0;
      count += 1;
    }
    return count > 0 ? sum / count / 255 : 0;
  });
}

type UseMicrophoneVisualizerReturn = {
  bands: number[];
  volume: number;
  isActive: boolean;
  start: (stream: MediaStream) => void;
  stop: () => void;
};

export function useMicrophoneVisualizer(): UseMicrophoneVisualizerReturn {
  const [bands, setBands] = useState<number[]>([0, 0, 0, 0, 0]);
  const [volume, setVolume] = useState(0);
  const [isActive, setIsActive] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number>(0);

  const draw = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) {
      return;
    }

    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);

    const extracted = extractBands(data, analyser.frequencyBinCount);
    setBands(extracted);

    let sum = 0;
    for (const value of data) {
      sum += value;
    }
    setVolume(sum / (data.length * 255));

    rafRef.current = requestAnimationFrame(draw);
  }, []);

  const stop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    analyserRef.current?.disconnect();
    analyserRef.current = null;
    if (audioContextRef.current?.state !== "closed") {
      audioContextRef.current?.close();
    }
    audioContextRef.current = null;
    setBands([0, 0, 0, 0, 0]);
    setVolume(0);
    setIsActive(false);
  }, []);

  const start = useCallback(
    (stream: MediaStream) => {
      stop();

      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyser.smoothingTimeConstant = SMOOTHING;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = source;
      setIsActive(true);

      rafRef.current = requestAnimationFrame(draw);
    },
    [stop, draw]
  );

  useEffect(
    () => () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      sourceRef.current?.disconnect();
      analyserRef.current?.disconnect();
      if (audioContextRef.current?.state !== "closed") {
        audioContextRef.current?.close();
      }
    },
    []
  );

  return { bands, volume, isActive, start, stop };
}
