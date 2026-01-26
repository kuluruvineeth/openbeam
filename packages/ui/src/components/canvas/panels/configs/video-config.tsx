"use client";

import type { VideoNodeConfig } from "@openplane/types/canvas";
import { forwardRef, memo } from "react";
import { Icons } from "../../../icons";
import { Input } from "../../../input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../select";
import { Slider } from "../../../slider";
import { Textarea } from "../../../textarea";
import { ModelSelector, PromptStrengthIndicator } from "../../ai-elements";
import { ConfigField } from "../config-field";
import { ConfigSection } from "../config-section";

const ASPECT_RATIOS = [
  { id: "16:9", name: "16:9", description: "Widescreen (YouTube, TV)" },
  { id: "9:16", name: "9:16", description: "Vertical (TikTok, Reels)" },
  { id: "1:1", name: "1:1", description: "Square (Instagram)" },
  { id: "4:3", name: "4:3", description: "Standard (Classic TV)" },
  { id: "21:9", name: "21:9", description: "Cinematic (Ultra-wide)" },
] as const;

const RESOLUTIONS = [
  { id: "720p", name: "720p HD", description: "1280×720, faster" },
  { id: "1080p", name: "1080p Full HD", description: "1920×1080, balanced" },
  { id: "4k", name: "4K Ultra HD", description: "3840×2160, highest quality" },
] as const;

const FPS_OPTIONS = [
  { id: "24", name: "24 fps", description: "Cinematic look" },
  { id: "30", name: "30 fps", description: "Standard video" },
  { id: "60", name: "60 fps", description: "Smooth motion" },
] as const;

interface VideoConfigPanelProps {
  config: VideoNodeConfig;
  onChange: (config: Partial<VideoNodeConfig>) => void;
  prompt?: string;
}

export const VideoConfigPanel = memo(
  forwardRef<HTMLDivElement, VideoConfigPanelProps>(
    function VideoConfigPanelComponent({ config, onChange, prompt }, ref) {
      return (
        <div className="divide-y divide-border/50" ref={ref}>
          <ConfigSection
            defaultOpen
            icon={<Icons.Film className="size-4" />}
            title="Model"
          >
            <div className="space-y-4">
              <ConfigField label="Model" required>
                <ModelSelector
                  onValueChange={(model) => onChange({ model })}
                  type="video"
                  value={config.model ?? "runway-gen3"}
                />
              </ConfigField>

              <ConfigField
                label="Aspect Ratio"
                required
                tooltip="16:9 Widescreen, 9:16 Vertical, 1:1 Square, 4:3 Standard, 21:9 Cinematic"
              >
                <Select
                  onValueChange={(ratio) =>
                    onChange({
                      aspectRatio: ratio as VideoNodeConfig["aspectRatio"],
                    })
                  }
                  value={config.aspectRatio ?? "16:9"}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASPECT_RATIOS.map((ratio) => (
                      <SelectItem key={ratio.id} value={ratio.id}>
                        {ratio.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ConfigField>

              <ConfigField
                label="Resolution"
                tooltip="720p: 1280×720 faster. 1080p: 1920×1080 balanced. 4K: 3840×2160 highest."
              >
                <Select
                  onValueChange={(resolution) =>
                    onChange({
                      resolution: resolution as VideoNodeConfig["resolution"],
                    })
                  }
                  value={config.resolution ?? "1080p"}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOLUTIONS.map((res) => (
                      <SelectItem key={res.id} value={res.id}>
                        {res.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ConfigField>
            </div>
          </ConfigSection>

          <ConfigSection
            defaultOpen
            icon={<Icons.Clock className="size-4" />}
            title="Timing"
          >
            <div className="space-y-4">
              <ConfigField
                label="Duration"
                tooltip="Video length in seconds (3-60s)"
              >
                <div className="flex items-center gap-4">
                  <Slider
                    className="flex-1"
                    max={60}
                    min={3}
                    onValueChange={(v) => onChange({ duration: v[0] })}
                    step={1}
                    value={[config.duration ?? 5]}
                  />
                  <span className="w-10 text-right font-mono text-sm tabular-nums">
                    {config.duration ?? 5}s
                  </span>
                </div>
              </ConfigField>

              <ConfigField
                label="Frame Rate"
                tooltip="24fps: Cinematic. 30fps: Standard. 60fps: Smooth motion."
              >
                <Select
                  onValueChange={(fps) =>
                    onChange({ fps: Number.parseInt(fps, 10) })
                  }
                  value={String(config.fps ?? 30)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FPS_OPTIONS.map((fps) => (
                      <SelectItem key={fps.id} value={fps.id}>
                        {fps.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ConfigField>
            </div>
          </ConfigSection>

          <ConfigSection
            defaultOpen={false}
            icon={<Icons.Sparkles className="size-4" />}
            title="Style"
          >
            <div className="space-y-4">
              <ConfigField
                label="Style Preset"
                tooltip="Visual style for the video"
              >
                <Textarea
                  className="min-h-[80px] resize-y"
                  onChange={(e) => onChange({ style: e.target.value })}
                  placeholder="cinematic, dramatic lighting, slow motion..."
                  value={config.style ?? ""}
                />
              </ConfigField>

              <ConfigField
                label="Motion Amount"
                tooltip="How much motion/movement in the video"
              >
                <div className="flex items-center gap-4">
                  <Slider
                    className="flex-1"
                    max={100}
                    min={0}
                    onValueChange={(v) => onChange({ motionAmount: v[0] })}
                    step={5}
                    value={[config.motionAmount ?? 50]}
                  />
                  <span className="w-10 text-right font-mono text-sm tabular-nums">
                    {config.motionAmount ?? 50}%
                  </span>
                </div>
              </ConfigField>

              {prompt && (
                <PromptStrengthIndicator
                  compact
                  prompt={prompt}
                  showSuggestions={false}
                />
              )}
            </div>
          </ConfigSection>

          <ConfigSection
            defaultOpen={false}
            icon={<Icons.Settings className="size-4" />}
            title="Advanced"
          >
            <div className="space-y-4">
              <ConfigField
                label="Seed"
                tooltip="Reproducible generation (optional)"
              >
                <Input
                  className="h-9 font-mono"
                  max={2_147_483_647}
                  min={0}
                  onChange={(e) => {
                    const value = e.target.value;
                    onChange({
                      seed: value ? Number.parseInt(value, 10) : undefined,
                    });
                  }}
                  placeholder="Random"
                  type="number"
                  value={config.seed ?? ""}
                />
              </ConfigField>

              <ConfigField
                label="Camera Motion"
                tooltip="Specify camera movement"
              >
                <Select
                  onValueChange={(motion) => onChange({ cameraMotion: motion })}
                  value={config.cameraMotion ?? "none"}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="pan_left">Pan Left</SelectItem>
                    <SelectItem value="pan_right">Pan Right</SelectItem>
                    <SelectItem value="tilt_up">Tilt Up</SelectItem>
                    <SelectItem value="tilt_down">Tilt Down</SelectItem>
                    <SelectItem value="zoom_in">Zoom In</SelectItem>
                    <SelectItem value="zoom_out">Zoom Out</SelectItem>
                    <SelectItem value="dolly_in">Dolly In</SelectItem>
                    <SelectItem value="dolly_out">Dolly Out</SelectItem>
                    <SelectItem value="orbit">Orbit</SelectItem>
                  </SelectContent>
                </Select>
              </ConfigField>
            </div>
          </ConfigSection>
        </div>
      );
    }
  )
);

VideoConfigPanel.displayName = "VideoConfigPanel";
