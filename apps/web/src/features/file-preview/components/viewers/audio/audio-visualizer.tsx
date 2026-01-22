"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type AudioVisualizerProps = {
  frequencyData: Uint8Array;
  isActive: boolean;
  className?: string;
};

const BAR_WIDTH = 3;
const BAR_GAP = 2;
const BAR_MIN_HEIGHT = 2;

export function AudioVisualizer({
  frequencyData,
  isActive,
  className,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animatedHeightsRef = useRef<number[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!(canvas && container)) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const centerY = height / 2;

    const barCount = Math.floor(width / (BAR_WIDTH + BAR_GAP));
    const totalWidth = barCount * (BAR_WIDTH + BAR_GAP) - BAR_GAP;
    const startX = (width - totalWidth) / 2;

    if (animatedHeightsRef.current.length !== barCount) {
      animatedHeightsRef.current = new Array(barCount).fill(BAR_MIN_HEIGHT);
    }

    const isDark = document.documentElement.classList.contains("dark");
    const baseColor = isDark ? "251, 251, 251" : "37, 37, 37";

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const step = Math.max(1, Math.floor(frequencyData.length / barCount));

      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.min(i * step, frequencyData.length - 1);
        const value = frequencyData[dataIndex] || 0;
        const normalized = value / 255;

        const targetHeight = isActive
          ? BAR_MIN_HEIGHT + normalized * (height * 0.85 - BAR_MIN_HEIGHT)
          : BAR_MIN_HEIGHT;

        animatedHeightsRef.current[i] +=
          (targetHeight - animatedHeightsRef.current[i]) * 0.25;

        const barHeight = Math.max(
          BAR_MIN_HEIGHT,
          animatedHeightsRef.current[i]
        );
        const x = startX + i * (BAR_WIDTH + BAR_GAP);
        const halfHeight = barHeight / 2;

        const opacity = isActive ? 0.12 + normalized * 0.68 : 0.08;
        ctx.fillStyle = `rgba(${baseColor}, ${opacity})`;

        ctx.fillRect(x, centerY - halfHeight, BAR_WIDTH, halfHeight);
        ctx.fillRect(x, centerY, BAR_WIDTH, halfHeight);
      }
    };

    render();

    let animationId: number;
    if (isActive) {
      const animate = () => {
        render();
        animationId = requestAnimationFrame(animate);
      };
      animationId = requestAnimationFrame(animate);
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [frequencyData, isActive]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!(container && canvas)) {
      return;
    }

    const observer = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      animatedHeightsRef.current = [];
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={cn("h-20 w-full", className)} ref={containerRef}>
      <canvas
        className="h-full w-full"
        ref={canvasRef}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
