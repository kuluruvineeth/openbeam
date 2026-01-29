"use client";

import type { ImageNodeConfig } from "@openplane/types/canvas";
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
import { Switch } from "../../../switch";
import { Textarea } from "../../../textarea";
import { ModelSelector, PromptStrengthIndicator } from "../../ai-elements";
import { ConfigField } from "../config-field";
import { ConfigSection } from "../config-section";

const IMAGE_SIZES = [
  { id: "256x256", name: "256×256", aspect: "Square (small)" },
  { id: "512x512", name: "512×512", aspect: "Square (medium)" },
  { id: "1024x1024", name: "1024×1024", aspect: "Square (large)" },
  { id: "1024x1792", name: "1024×1792", aspect: "Portrait (9:16)" },
  { id: "1792x1024", name: "1792×1024", aspect: "Landscape (16:9)" },
] as const;

const IMAGE_QUALITIES = [
  { id: "standard", name: "Standard", description: "Faster, lower cost" },
  { id: "hd", name: "HD", description: "Higher detail, more cost" },
] as const;

const IMAGE_STYLES = [
  { id: "vivid", name: "Vivid", description: "Hyper-real, dramatic" },
  {
    id: "natural",
    name: "Natural",
    description: "More natural, less dramatic",
  },
] as const;

interface ImageConfigPanelProps {
  config: ImageNodeConfig;
  onChange: (config: Partial<ImageNodeConfig>) => void;
  prompt?: string;
}

export const ImageConfigPanel = memo(
  forwardRef<HTMLDivElement, ImageConfigPanelProps>(
    function ImageConfigPanelComponent({ config, onChange, prompt }, ref) {
      return (
        <div className="divide-y divide-border/50" ref={ref}>
          <ConfigSection
            defaultOpen
            icon={<Icons.ImageIcon className="size-4" />}
            title="Model"
          >
            <div className="space-y-4">
              <ConfigField label="Model" required>
                <ModelSelector
                  onValueChange={(model) => onChange({ model })}
                  type="image"
                  value={config.model ?? "dall-e-3"}
                />
              </ConfigField>

              <ConfigField
                label="Image Size"
                required
                tooltip="256×256, 512×512, 1024×1024, Portrait (1024×1792), Landscape (1792×1024)"
              >
                <Select
                  onValueChange={(size) =>
                    onChange({ size: size as ImageNodeConfig["size"] })
                  }
                  value={config.size ?? "1024x1024"}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {IMAGE_SIZES.map((size) => (
                      <SelectItem key={size.id} value={size.id}>
                        {size.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ConfigField>

              <ConfigField
                label="Quality"
                tooltip="Standard: Faster, lower cost. HD: Higher detail, more cost."
              >
                <Select
                  onValueChange={(quality) =>
                    onChange({ quality: quality as ImageNodeConfig["quality"] })
                  }
                  value={config.quality ?? "standard"}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {IMAGE_QUALITIES.map((quality) => (
                      <SelectItem key={quality.id} value={quality.id}>
                        {quality.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ConfigField>

              <ConfigField
                label="Style"
                tooltip="Vivid: Hyper-real, dramatic. Natural: More natural, less dramatic."
              >
                <Select
                  onValueChange={(style) =>
                    onChange({ style: style as ImageNodeConfig["style"] })
                  }
                  value={config.style ?? "vivid"}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {IMAGE_STYLES.map((style) => (
                      <SelectItem key={style.id} value={style.id}>
                        {style.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ConfigField>
            </div>
          </ConfigSection>

          <ConfigSection
            defaultOpen
            icon={<Icons.Hash className="size-4" />}
            title="Generation"
          >
            <div className="space-y-4">
              <ConfigField
                label="Number of Images"
                tooltip="Generate multiple variations"
              >
                <div className="flex items-center gap-4">
                  <Slider
                    className="flex-1"
                    max={4}
                    min={1}
                    onValueChange={(v) => onChange({ numberOfImages: v[0] })}
                    step={1}
                    value={[config.numberOfImages ?? 1]}
                  />
                  <span className="w-8 text-right font-mono text-sm tabular-nums">
                    {config.numberOfImages ?? 1}
                  </span>
                </div>
              </ConfigField>

              <ConfigField
                label="Negative Prompt"
                tooltip="What to avoid in the image"
              >
                <Textarea
                  className="min-h-[80px] resize-y"
                  onChange={(e) => onChange({ negativePrompt: e.target.value })}
                  placeholder="blurry, low quality, distorted..."
                  value={config.negativePrompt ?? ""}
                />
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
                label="Guidance Scale"
                tooltip="How closely to follow the prompt (higher = more literal)"
              >
                <div className="flex items-center gap-4">
                  <Slider
                    className="flex-1"
                    max={20}
                    min={1}
                    onValueChange={(v) => onChange({ guidanceScale: v[0] })}
                    step={0.5}
                    value={[config.guidanceScale ?? 7.5]}
                  />
                  <span className="w-10 text-right font-mono text-sm tabular-nums">
                    {(config.guidanceScale ?? 7.5).toFixed(1)}
                  </span>
                </div>
              </ConfigField>

              <ConfigField label="Enhance Prompt">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">
                    Let AI improve the prompt
                  </span>
                  <Switch
                    checked={config.enhancePrompt ?? false}
                    onCheckedChange={(enhancePrompt) =>
                      onChange({ enhancePrompt })
                    }
                  />
                </div>
              </ConfigField>
            </div>
          </ConfigSection>
        </div>
      );
    }
  )
);

ImageConfigPanel.displayName = "ImageConfigPanel";
