"use client";

import type { GeneratedVideo } from "@openbeam/types/canvas";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "../../dialog";
import { Icons } from "../../icons";
import { Skeleton } from "../../skeleton";
import { Slider } from "../../slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../tooltip";

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export interface VideoPlayerProps {
  video?: GeneratedVideo;
  isLoading?: boolean;
  onDownload?: (video: GeneratedVideo) => void;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  showFramePreview?: boolean;
  className?: string;
}

export const VideoPlayer = memo(
  forwardRef<HTMLDivElement, VideoPlayerProps>(function VideoPlayerComponent(
    {
      video,
      isLoading = false,
      onDownload,
      autoPlay = false,
      loop = true,
      muted: initialMuted = true,
      showFramePreview = true,
      className,
    },
    ref
  ) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const previewVideoRef = useRef<HTMLVideoElement>(null);
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);
    const sliderContainerRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(autoPlay);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(initialMuted);
    const [showControls, setShowControls] = useState(false);
    const [previewTime, setPreviewTime] = useState<number | null>(null);
    const [previewPosition, setPreviewPosition] = useState(0);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    const togglePlay = useCallback(() => {
      if (!videoRef.current) {
        return;
      }

      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }, [isPlaying]);

    const handleTimeUpdate = useCallback(() => {
      if (videoRef.current) {
        setCurrentTime(videoRef.current.currentTime);
      }
    }, []);

    const handleLoadedMetadata = useCallback(() => {
      if (videoRef.current) {
        setDuration(videoRef.current.duration);
      }
    }, []);

    const handleEnded = useCallback(() => {
      if (!loop) {
        setIsPlaying(false);
        setCurrentTime(0);
      }
    }, [loop]);

    const handleSeek = useCallback((value: number[]) => {
      if (videoRef.current && value[0] !== undefined) {
        videoRef.current.currentTime = value[0];
        setCurrentTime(value[0]);
      }
    }, []);

    const toggleMute = useCallback(() => {
      if (videoRef.current) {
        videoRef.current.muted = !isMuted;
        setIsMuted(!isMuted);
      }
    }, [isMuted]);

    const handleSliderHover = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!(showFramePreview && duration && sliderContainerRef.current)) {
          return;
        }

        const rect = sliderContainerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const ratio = Math.max(0, Math.min(1, x / rect.width));
        const time = ratio * duration;

        setPreviewTime(time);
        setPreviewPosition(x);

        if (previewVideoRef.current && previewCanvasRef.current) {
          previewVideoRef.current.currentTime = time;
        }
      },
      [showFramePreview, duration]
    );

    const handleSliderLeave = useCallback(() => {
      setPreviewTime(null);
      setPreviewImage(null);
    }, []);

    const captureFrame = useCallback(() => {
      if (!(previewVideoRef.current && previewCanvasRef.current)) {
        return;
      }

      const previewEl = previewVideoRef.current;
      const canvas = previewCanvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }

      canvas.width = 160;
      canvas.height = 90;
      ctx.drawImage(previewEl, 0, 0, canvas.width, canvas.height);
      setPreviewImage(canvas.toDataURL("image/jpeg", 0.7));
    }, []);

    const handleDownload = useCallback(async () => {
      if (!video) {
        return;
      }

      if (onDownload) {
        onDownload(video);
        return;
      }

      const response = await fetch(video.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `video-${video.id}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, [video, onDownload]);

    useEffect(() => {
      const videoEl = videoRef.current;
      if (videoEl && autoPlay) {
        videoEl.play().catch(() => {
          setIsPlaying(false);
        });
      }
      return () => {
        if (videoEl) {
          videoEl.pause();
        }
      };
    }, [autoPlay]);

    if (isLoading) {
      return (
        <div
          className={cn(
            "aspect-video overflow-hidden rounded-md border bg-muted/30",
            className
          )}
          ref={ref}
        >
          <Skeleton className="size-full" />
        </div>
      );
    }

    if (!video) {
      return (
        <div
          className={cn(
            "flex aspect-video flex-col items-center justify-center rounded-md border border-dashed bg-muted/30",
            className
          )}
          ref={ref}
        >
          <Icons.Video className="mb-2 text-muted-foreground/50" size={32} />
          <span className="text-muted-foreground text-sm">
            No video generated yet
          </span>
        </div>
      );
    }

    return (
      <div className={cn("space-y-2", className)} ref={ref}>
        <Dialog>
          <DialogTrigger asChild>
            {/* biome-ignore lint/a11y/noStaticElementInteractions: Mouse events control visual overlay state */}
            {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: Mouse events control visual overlay state */}
            <div
              className="group relative aspect-video cursor-pointer overflow-hidden rounded-md border bg-black"
              onMouseEnter={() => setShowControls(true)}
              onMouseLeave={() => setShowControls(false)}
            >
              <video
                className="size-full object-contain"
                loop={loop}
                muted={isMuted}
                onEnded={handleEnded}
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                poster={video.thumbnailUrl}
                ref={videoRef}
                src={video.url}
              />
              {showFramePreview && (
                <>
                  <video
                    className="hidden"
                    muted
                    onSeeked={captureFrame}
                    preload="metadata"
                    ref={previewVideoRef}
                    src={video.url}
                  />
                  <canvas className="hidden" ref={previewCanvasRef} />
                </>
              )}

              <div
                className={cn(
                  "absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity",
                  showControls || !isPlaying ? "opacity-100" : "opacity-0"
                )}
              >
                <Button
                  className="size-12 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlay();
                  }}
                  size="icon"
                  variant="ghost"
                >
                  {isPlaying ? (
                    <Icons.Pause className="text-white" size={24} />
                  ) : (
                    <Icons.Play className="ml-1 text-white" size={24} />
                  )}
                </Button>
              </div>

              <div
                className={cn(
                  "absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/60 to-transparent p-2 transition-opacity",
                  showControls ? "opacity-100" : "opacity-0"
                )}
              >
                {/* biome-ignore lint/a11y/noStaticElementInteractions: Mouse events control preview tooltip position */}
                {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: Mouse events control preview tooltip position */}
                <div
                  className="relative flex items-center gap-2"
                  onMouseLeave={handleSliderLeave}
                  onMouseMove={handleSliderHover}
                  ref={sliderContainerRef}
                >
                  {showFramePreview && previewTime !== null && previewImage && (
                    <div
                      className="-translate-x-1/2 pointer-events-none absolute bottom-full mb-2"
                      style={{ left: previewPosition }}
                    >
                      <div className="overflow-hidden rounded border border-white/20 bg-black shadow-lg">
                        {/* eslint-disable-next-line @next/next/no-img-element -- Preview frame from canvas capture */}
                        {/* biome-ignore lint/performance/noImgElement: Preview frame from canvas capture */}
                        <img
                          alt="Preview"
                          className="block h-[90px] w-[160px] object-cover"
                          height={90}
                          src={previewImage}
                          width={160}
                        />
                        <div className="bg-black/80 px-2 py-0.5 text-center text-[10px] text-white tabular-nums">
                          {formatTime(previewTime)}
                        </div>
                      </div>
                    </div>
                  )}
                  <Slider
                    className="flex-1"
                    max={duration || 1}
                    min={0}
                    onValueChange={handleSeek}
                    step={0.1}
                    value={[currentTime]}
                  />
                  <span className="text-[10px] text-white/80 tabular-nums">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>
              </div>

              <div className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
                <Icons.Expand className="text-white" size={16} />
              </div>
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-4xl p-0">
            <DialogTitle className="sr-only">Video Preview</DialogTitle>
            <DialogDescription className="sr-only">
              Full size preview of the generated video
            </DialogDescription>
            {/* biome-ignore lint/a11y/useMediaCaption: AI-generated video has no captions */}
            <video
              autoPlay
              className="w-full rounded-lg"
              controls
              loop={loop}
              src={video.url}
            />
          </DialogContent>
        </Dialog>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
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
            <span className="text-muted-foreground text-xs">
              {video.width}×{video.height}
            </span>
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

VideoPlayer.displayName = "VideoPlayer";
