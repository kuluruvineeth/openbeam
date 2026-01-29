"use client";

import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "../../../utils";

interface AudioWaveformProps {
  audioUrl?: string;
  currentTime: number;
  duration: number;
  isPlaying?: boolean;
  onSeek?: (time: number) => void;
  barWidth?: number;
  barGap?: number;
  barRadius?: number;
  className?: string;
}

const SAMPLE_COUNT = 100;

export const AudioWaveform = memo(
  forwardRef<HTMLDivElement, AudioWaveformProps>(
    function AudioWaveformComponent(
      {
        audioUrl,
        currentTime,
        duration,
        isPlaying = false,
        onSeek,
        barWidth = 2,
        barGap = 1,
        barRadius = 1,
        className,
      },
      ref
    ) {
      const canvasRef = useRef<HTMLCanvasElement>(null);
      const containerRef = useRef<HTMLDivElement>(null);
      const [waveformData, setWaveformData] = useState<number[]>([]);
      const [isHovering, setIsHovering] = useState(false);
      const [hoverPosition, setHoverPosition] = useState(0);

      useEffect(() => {
        if (!audioUrl) {
          return;
        }

        const audioContext = new AudioContext();
        const url = audioUrl;

        async function analyzeAudio() {
          const response = await fetch(url);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

          const rawData = audioBuffer.getChannelData(0);
          const samples: number[] = [];
          const blockSize = Math.floor(rawData.length / SAMPLE_COUNT);

          for (let i = 0; i < SAMPLE_COUNT; i++) {
            let sum = 0;
            for (let j = 0; j < blockSize; j++) {
              const value = rawData[i * blockSize + j];
              if (value !== undefined) {
                sum += Math.abs(value);
              }
            }
            samples.push(sum / blockSize);
          }

          const maxAmplitude = Math.max(...samples);
          const normalized = samples.map((s) =>
            maxAmplitude > 0 ? s / maxAmplitude : 0
          );
          setWaveformData(normalized);
        }

        analyzeAudio().catch(() => {
          setWaveformData(
            Array.from(
              { length: SAMPLE_COUNT },
              () => Math.random() * 0.5 + 0.2
            )
          );
        });

        return () => {
          audioContext.close();
        };
      }, [audioUrl]);

      const drawWaveform = useCallback(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!(canvas && container) || waveformData.length === 0) {
          return;
        }

        const dpr = window.devicePixelRatio || 1;
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return;
        }

        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, rect.width, rect.height);

        const totalBars = waveformData.length;
        const totalBarWidth = barWidth + barGap;
        const startX = (rect.width - totalBars * totalBarWidth + barGap) / 2;
        const centerY = rect.height / 2;
        const maxBarHeight = rect.height * 0.8;

        const progressRatio = duration > 0 ? currentTime / duration : 0;
        const progressX = startX + progressRatio * totalBars * totalBarWidth;

        const hoverX = isHovering
          ? startX + hoverPosition * totalBars * totalBarWidth
          : -1;

        const playedColor = getComputedStyle(document.documentElement)
          .getPropertyValue("--primary")
          .trim();
        const unplayedColor = getComputedStyle(document.documentElement)
          .getPropertyValue("--muted-foreground")
          .trim();

        const playedHsl = `hsl(${playedColor})`;
        const unplayedHsl = `hsl(${unplayedColor} / 0.3)`;
        const hoverHsl = `hsl(${unplayedColor} / 0.5)`;

        waveformData.forEach((amplitude, i) => {
          const x = startX + i * totalBarWidth;
          const barHeight = Math.max(4, amplitude * maxBarHeight);
          const y = centerY - barHeight / 2;

          let fillColor = unplayedHsl;
          if (x < progressX) {
            fillColor = playedHsl;
          } else if (hoverX > 0 && x < hoverX) {
            fillColor = hoverHsl;
          }

          ctx.fillStyle = fillColor;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, barRadius);
          ctx.fill();
        });
      }, [
        waveformData,
        currentTime,
        duration,
        barWidth,
        barGap,
        barRadius,
        isHovering,
        hoverPosition,
      ]);

      useEffect(() => {
        drawWaveform();
      }, [drawWaveform]);

      useEffect(() => {
        const handleResize = () => drawWaveform();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
      }, [drawWaveform]);

      const handleClick = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
          if (!onSeek || duration <= 0 || !containerRef.current) {
            return;
          }

          const rect = containerRef.current.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const ratio = Math.max(0, Math.min(1, x / rect.width));
          onSeek(ratio * duration);
        },
        [onSeek, duration]
      );

      const handleMouseMove = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
          if (!containerRef.current) {
            return;
          }
          const rect = containerRef.current.getBoundingClientRect();
          const x = e.clientX - rect.left;
          setHoverPosition(Math.max(0, Math.min(1, x / rect.width)));
        },
        []
      );

      const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLDivElement>) => {
          if (!onSeek || duration <= 0) {
            return;
          }
          const step = duration * 0.05;
          if (e.key === "ArrowLeft") {
            onSeek(Math.max(0, currentTime - step));
          } else if (e.key === "ArrowRight") {
            onSeek(Math.min(duration, currentTime + step));
          }
        },
        [onSeek, duration, currentTime]
      );

      return (
        <div
          aria-label="Audio waveform seek control"
          aria-valuemax={duration}
          aria-valuemin={0}
          aria-valuenow={currentTime}
          className={cn(
            "relative h-12 w-full cursor-pointer select-none",
            className
          )}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          onMouseMove={handleMouseMove}
          ref={(node) => {
            (
              containerRef as React.MutableRefObject<HTMLDivElement | null>
            ).current = node;
            if (typeof ref === "function") {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
          }}
          role="slider"
          tabIndex={0}
        >
          <canvas className="absolute inset-0" ref={canvasRef} />
          {isPlaying && (
            <div
              className="pointer-events-none absolute top-0 h-full w-0.5 bg-primary transition-[left] duration-75"
              style={{
                left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
              }}
            />
          )}
        </div>
      );
    }
  )
);

AudioWaveform.displayName = "AudioWaveform";
