"use client";

import type { GeneratedAudio } from "@openbeam/types/canvas";
import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "../../../utils";
import { Button } from "../../button";
import { Icons } from "../../icons";
import { Skeleton } from "../../skeleton";
import { Slider } from "../../slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../tooltip";
import { AudioWaveform } from "./audio-waveform";

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export interface AudioPlayerProps {
  audio?: GeneratedAudio;
  isLoading?: boolean;
  onDownload?: (audio: GeneratedAudio) => void;
  compact?: boolean;
  showWaveform?: boolean;
  className?: string;
}

export const AudioPlayer = memo(
  forwardRef<HTMLDivElement, AudioPlayerProps>(function AudioPlayerComponent(
    {
      audio,
      isLoading = false,
      onDownload,
      compact = false,
      showWaveform = false,
      className,
    },
    ref
  ) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);

    const togglePlay = useCallback(() => {
      if (!audioRef.current) {
        return;
      }

      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }, [isPlaying]);

    const handleTimeUpdate = useCallback(() => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
    }, []);

    const handleLoadedMetadata = useCallback(() => {
      if (audioRef.current) {
        setDuration(audioRef.current.duration);
      }
    }, []);

    const handleEnded = useCallback(() => {
      setIsPlaying(false);
      setCurrentTime(0);
    }, []);

    const handleSeek = useCallback((value: number[]) => {
      if (audioRef.current && value[0] !== undefined) {
        audioRef.current.currentTime = value[0];
        setCurrentTime(value[0]);
      }
    }, []);

    const handleVolumeChange = useCallback((value: number[]) => {
      const vol = value[0];
      if (audioRef.current && vol !== undefined) {
        audioRef.current.volume = vol;
        setVolume(vol);
        setIsMuted(vol === 0);
      }
    }, []);

    const toggleMute = useCallback(() => {
      if (audioRef.current) {
        if (isMuted) {
          audioRef.current.volume = volume || 1;
          setIsMuted(false);
        } else {
          audioRef.current.volume = 0;
          setIsMuted(true);
        }
      }
    }, [isMuted, volume]);

    const handleDownload = useCallback(async () => {
      if (!audio) {
        return;
      }

      if (onDownload) {
        onDownload(audio);
        return;
      }

      const response = await fetch(audio.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audio-${audio.id}.${audio.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, [audio, onDownload]);

    const handleWaveformSeek = useCallback((time: number) => {
      if (audioRef.current) {
        audioRef.current.currentTime = time;
        setCurrentTime(time);
      }
    }, []);

    useEffect(() => {
      const audioEl = audioRef.current;
      return () => {
        if (audioEl) {
          audioEl.pause();
        }
      };
    }, []);

    if (isLoading) {
      return (
        <div
          className={cn(
            "flex items-center gap-3 rounded-md border bg-muted/30 p-3",
            className
          )}
          ref={ref}
        >
          <Skeleton className="size-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-1.5 w-full rounded-full" />
            <div className="flex justify-between">
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-3 w-8" />
            </div>
          </div>
        </div>
      );
    }

    if (!audio) {
      return (
        <div
          className={cn(
            "flex flex-col items-center justify-center rounded-md border border-dashed bg-muted/30 p-6",
            className
          )}
          ref={ref}
        >
          <Icons.Speaker className="mb-2 text-muted-foreground/50" size={32} />
          <span className="text-muted-foreground text-sm">
            No audio generated yet
          </span>
        </div>
      );
    }

    if (compact) {
      return (
        <div
          className={cn(
            "flex items-center gap-2 rounded-md border bg-muted/30 p-2",
            className
          )}
          ref={ref}
        >
          {/* biome-ignore lint/a11y/useMediaCaption: AI-generated audio has no captions */}
          <audio
            onEnded={handleEnded}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            ref={audioRef}
            src={audio.url}
          />
          <Button
            className="size-7 shrink-0"
            onClick={togglePlay}
            size="icon"
            variant="ghost"
          >
            {isPlaying ? <Icons.Pause size={14} /> : <Icons.Play size={14} />}
          </Button>
          <Slider
            className="flex-1"
            max={duration || 1}
            min={0}
            onValueChange={handleSeek}
            step={0.1}
            value={[currentTime]}
          />
          <span className="w-14 text-right text-[10px] text-muted-foreground tabular-nums">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      );
    }

    return (
      <div
        className={cn("space-y-3 rounded-md border bg-muted/30 p-3", className)}
        ref={ref}
      >
        {/* biome-ignore lint/a11y/useMediaCaption: AI-generated audio has no captions */}
        <audio
          onEnded={handleEnded}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          ref={audioRef}
          src={audio.url}
        />

        <div className="flex items-center gap-3">
          <Button
            className="size-10 shrink-0 rounded-full"
            onClick={togglePlay}
            size="icon"
            variant="secondary"
          >
            {isPlaying ? (
              <Icons.Pause size={20} />
            ) : (
              <Icons.Play className="ml-0.5" size={20} />
            )}
          </Button>

          <div className="flex-1 space-y-1">
            {showWaveform ? (
              <AudioWaveform
                audioUrl={audio.url}
                currentTime={currentTime}
                duration={duration}
                isPlaying={isPlaying}
                onSeek={handleWaveformSeek}
              />
            ) : (
              <Slider
                className="w-full"
                max={duration || 1}
                min={0}
                onValueChange={handleSeek}
                step={0.1}
                value={[currentTime]}
              />
            )}
            <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              className="size-7"
              onClick={toggleMute}
              size="icon"
              variant="ghost"
            >
              {isMuted ? (
                <Icons.VolumeX size={14} />
              ) : (
                <Icons.Volume2 size={14} />
              )}
            </Button>
            <Slider
              className="w-20"
              max={1}
              min={0}
              onValueChange={handleVolumeChange}
              step={0.1}
              value={[isMuted ? 0 : volume]}
            />
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="size-7"
                onClick={handleDownload}
                size="icon"
                variant="ghost"
              >
                <Icons.Download size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Download</TooltipContent>
          </Tooltip>
        </div>
      </div>
    );
  })
);

AudioPlayer.displayName = "AudioPlayer";
