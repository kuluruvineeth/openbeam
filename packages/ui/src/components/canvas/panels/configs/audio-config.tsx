"use client";

import type { AudioNodeConfig } from "@openplane/types/canvas";
import { forwardRef, memo } from "react";
import { Icons } from "../../../icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../select";
import { Slider } from "../../../slider";
import { ModelSelector } from "../../ai-elements";
import { ConfigField } from "../config-field";
import { ConfigSection } from "../config-section";

const VOICES = [
  { id: "alloy", name: "Alloy", description: "Neutral, balanced" },
  { id: "echo", name: "Echo", description: "Warm, conversational" },
  { id: "fable", name: "Fable", description: "Expressive, British accent" },
  { id: "onyx", name: "Onyx", description: "Deep, authoritative" },
  { id: "nova", name: "Nova", description: "Soft, feminine" },
  { id: "shimmer", name: "Shimmer", description: "Clear, energetic" },
  { id: "rachel", name: "Rachel", description: "Young American female" },
  { id: "adam", name: "Adam", description: "Middle-aged American male" },
  {
    id: "domi",
    name: "Domi",
    description: "Young American female, conversational",
  },
  { id: "elli", name: "Elli", description: "Young American female, emotional" },
] as const;

const AUDIO_FORMATS = [
  { id: "mp3", name: "MP3", description: "Compressed, universal support" },
  { id: "wav", name: "WAV", description: "Uncompressed, high quality" },
  { id: "ogg", name: "OGG", description: "Open format, good compression" },
  { id: "flac", name: "FLAC", description: "Lossless compression" },
  { id: "aac", name: "AAC", description: "Better than MP3 at lower bitrates" },
  {
    id: "opus",
    name: "Opus",
    description: "Modern, excellent at low bitrates",
  },
] as const;

interface AudioConfigPanelProps {
  config: AudioNodeConfig;
  onChange: (config: Partial<AudioNodeConfig>) => void;
}

export const AudioConfigPanel = memo(
  forwardRef<HTMLDivElement, AudioConfigPanelProps>(
    function AudioConfigPanelComponent({ config, onChange }, ref) {
      return (
        <div className="divide-y divide-border/50" ref={ref}>
          <ConfigSection
            defaultOpen
            icon={<Icons.Mic className="size-4" />}
            title="Model"
          >
            <div className="space-y-4">
              <ConfigField label="Model" required>
                <ModelSelector
                  onValueChange={(model) => onChange({ model })}
                  type="audio"
                  value={config.model ?? "eleven_multilingual_v2"}
                />
              </ConfigField>

              <ConfigField
                label="Voice"
                required
                tooltip="Select a voice preset for text-to-speech"
              >
                <Select
                  onValueChange={(voice) => onChange({ voice })}
                  value={config.voice ?? "alloy"}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VOICES.map((voice) => (
                      <SelectItem key={voice.id} value={voice.id}>
                        {voice.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ConfigField>

              <ConfigField
                label="Output Format"
                tooltip="MP3: Universal. WAV: High quality. Opus: Best for low bitrate."
              >
                <Select
                  onValueChange={(format) =>
                    onChange({
                      outputFormat: format as AudioNodeConfig["outputFormat"],
                    })
                  }
                  value={config.outputFormat ?? "mp3"}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AUDIO_FORMATS.map((format) => (
                      <SelectItem key={format.id} value={format.id}>
                        {format.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ConfigField>
            </div>
          </ConfigSection>

          <ConfigSection
            defaultOpen
            icon={<Icons.Settings className="size-4" />}
            title="Voice Settings"
          >
            <div className="space-y-4">
              <ConfigField label="Speed" tooltip="Playback speed (0.25x to 4x)">
                <div className="flex items-center gap-4">
                  <Slider
                    className="flex-1"
                    max={4}
                    min={0.25}
                    onValueChange={(v) => onChange({ speed: v[0] })}
                    step={0.25}
                    value={[config.speed ?? 1]}
                  />
                  <span className="w-12 text-right font-mono text-sm tabular-nums">
                    {(config.speed ?? 1).toFixed(2)}x
                  </span>
                </div>
              </ConfigField>

              <ConfigField
                label="Stability"
                tooltip="Lower = more expressive, higher = more consistent"
              >
                <div className="flex items-center gap-4">
                  <Slider
                    className="flex-1"
                    max={1}
                    min={0}
                    onValueChange={(v) =>
                      onChange({
                        voiceSettings: {
                          stability: v[0] ?? 0.5,
                          similarityBoost:
                            config.voiceSettings?.similarityBoost ?? 0.75,
                          style: config.voiceSettings?.style,
                          speakerBoost: config.voiceSettings?.speakerBoost,
                        },
                      })
                    }
                    step={0.05}
                    value={[config.voiceSettings?.stability ?? 0.5]}
                  />
                  <span className="w-10 text-right font-mono text-sm tabular-nums">
                    {(config.voiceSettings?.stability ?? 0.5).toFixed(2)}
                  </span>
                </div>
              </ConfigField>

              <ConfigField
                label="Similarity Boost"
                tooltip="How closely to match the original voice"
              >
                <div className="flex items-center gap-4">
                  <Slider
                    className="flex-1"
                    max={1}
                    min={0}
                    onValueChange={(v) =>
                      onChange({
                        voiceSettings: {
                          stability: config.voiceSettings?.stability ?? 0.5,
                          similarityBoost: v[0] ?? 0.75,
                          style: config.voiceSettings?.style,
                          speakerBoost: config.voiceSettings?.speakerBoost,
                        },
                      })
                    }
                    step={0.05}
                    value={[config.voiceSettings?.similarityBoost ?? 0.75]}
                  />
                  <span className="w-10 text-right font-mono text-sm tabular-nums">
                    {(config.voiceSettings?.similarityBoost ?? 0.75).toFixed(2)}
                  </span>
                </div>
              </ConfigField>

              <ConfigField
                label="Style"
                tooltip="Exaggeration of original voice style"
              >
                <div className="flex items-center gap-4">
                  <Slider
                    className="flex-1"
                    max={1}
                    min={0}
                    onValueChange={(v) =>
                      onChange({
                        voiceSettings: {
                          stability: config.voiceSettings?.stability ?? 0.5,
                          similarityBoost:
                            config.voiceSettings?.similarityBoost ?? 0.75,
                          style: v[0],
                          speakerBoost: config.voiceSettings?.speakerBoost,
                        },
                      })
                    }
                    step={0.05}
                    value={[config.voiceSettings?.style ?? 0]}
                  />
                  <span className="w-10 text-right font-mono text-sm tabular-nums">
                    {(config.voiceSettings?.style ?? 0).toFixed(2)}
                  </span>
                </div>
              </ConfigField>

              <ConfigField
                label="Speaker Boost"
                tooltip="Enhance speaker clarity"
              >
                <div className="flex items-center gap-4">
                  <Slider
                    className="flex-1"
                    max={1}
                    min={0}
                    onValueChange={(v) =>
                      onChange({
                        voiceSettings: {
                          stability: config.voiceSettings?.stability ?? 0.5,
                          similarityBoost:
                            config.voiceSettings?.similarityBoost ?? 0.75,
                          style: config.voiceSettings?.style,
                          speakerBoost: (v[0] ?? 0) > 0.5,
                        },
                      })
                    }
                    step={1}
                    value={[config.voiceSettings?.speakerBoost ? 1 : 0]}
                  />
                  <span className="w-10 text-right text-sm">
                    {config.voiceSettings?.speakerBoost ? "On" : "Off"}
                  </span>
                </div>
              </ConfigField>
            </div>
          </ConfigSection>
        </div>
      );
    }
  )
);

AudioConfigPanel.displayName = "AudioConfigPanel";
