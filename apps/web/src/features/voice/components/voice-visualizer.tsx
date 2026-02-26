"use client";

import { useEffect, useRef } from "react";
import { MODE_ACCENT, WAVEFORM } from "../constants";
import { useVoiceStore } from "../stores/voice-store";
import type { AgentState, VoiceMode } from "../types";

function computeTargetHeight(
  index: number,
  total: number,
  phase: number,
  state: AgentState
): number {
  const pos = index / (total - 1);

  switch (state) {
    case "listening": {
      const primary = Math.sin(pos * Math.PI * 2.5 + phase) * 0.4;
      const harmonic = Math.sin(pos * Math.PI * 5 + phase * 1.4) * 0.15;
      return 0.5 + primary + harmonic;
    }
    case "thinking":
      return 0.12 + Math.sin(phase * 0.35) * 0.08;
    case "speaking": {
      const wave = Math.sin(pos * Math.PI * 3.5 + phase * 1.8) * 0.32;
      const envelope = Math.sin(pos * Math.PI) * 0.12;
      return 0.42 + wave + envelope;
    }
    case "connecting":
    case "initializing": {
      const shimmer = Math.sin(pos * Math.PI * 2 - phase * 2) * 0.5 + 0.5;
      return 0.06 + shimmer * 0.18;
    }
    default:
      return 0.06;
  }
}

function resolveAccent(mode: VoiceMode): string {
  if (mode === "dictation") {
    return MODE_ACCENT.dictation;
  }
  if (mode === "action") {
    return MODE_ACCENT.action;
  }
  return "#71717a";
}

export function VoiceVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const phaseRef = useRef(0);
  const heightsRef = useRef(
    Array.from({ length: WAVEFORM.BAR_COUNT }, () => 0.06)
  );
  const agentState = useVoiceStore((s) => s.agentState);
  const mode = useVoiceStore((s) => s.mode);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const w =
      WAVEFORM.BAR_COUNT * WAVEFORM.BAR_WIDTH +
      (WAVEFORM.BAR_COUNT - 1) * WAVEFORM.BAR_GAP;
    const h = WAVEFORM.MAX_HEIGHT;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    const accent = resolveAccent(mode);
    const heights = heightsRef.current;

    function tick() {
      if (!ctx) {
        return;
      }
      phaseRef.current += 0.06;
      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < WAVEFORM.BAR_COUNT; i++) {
        const target = computeTargetHeight(
          i,
          WAVEFORM.BAR_COUNT,
          phaseRef.current,
          agentState
        );
        heights[i] += (target - heights[i]) * WAVEFORM.LERP_SPEED;

        const barH = Math.max(WAVEFORM.MIN_HEIGHT, heights[i] * h);
        const x = i * (WAVEFORM.BAR_WIDTH + WAVEFORM.BAR_GAP);
        const y = (h - barH) / 2;

        ctx.globalAlpha = 0.45 + heights[i] * 0.55;
        ctx.fillStyle = accent;
        ctx.fillRect(x, y, WAVEFORM.BAR_WIDTH, barH);
      }

      ctx.globalAlpha = 1;
      frameRef.current = requestAnimationFrame(tick);
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [agentState, mode]);

  return <canvas className="shrink-0" ref={canvasRef} />;
}
