"use client";

import type {
  AnnotationColor,
  AnnotationNodeConfig,
} from "@openplane/types/canvas";
import { memo, useCallback } from "react";
import { cn } from "../../../utils";
import { Icons } from "../../icons";
import { Input } from "../../input";
import { Switch } from "../../switch";
import { Textarea } from "../../textarea";
import { ConfigField } from "../panels/config-field";
import { ConfigSection } from "../panels/config-section";
import { SelectionButton } from "./selection-button";

interface SectionProps {
  config: AnnotationNodeConfig;
  onChange: (config: Partial<AnnotationNodeConfig>) => void;
}

const COLORS: { value: AnnotationColor; label: string; swatch: string }[] = [
  { value: "yellow", label: "Yellow", swatch: "bg-yellow-400" },
  { value: "blue", label: "Blue", swatch: "bg-blue-400" },
  { value: "green", label: "Green", swatch: "bg-green-400" },
  { value: "pink", label: "Pink", swatch: "bg-pink-400" },
  { value: "purple", label: "Purple", swatch: "bg-purple-400" },
  { value: "orange", label: "Orange", swatch: "bg-orange-400" },
];

const SIZE_PRESETS = [
  { label: "Small", width: 160 },
  { label: "Medium", width: 240 },
  { label: "Large", width: 360 },
] as const;

export const ContentSection = memo(function ContentSectionComponent({
  config,
  onChange,
}: SectionProps) {
  return (
    <ConfigSection
      defaultOpen
      icon={<Icons.Text className="size-4" />}
      title="Content"
    >
      <ConfigField label="Note Content">
        <Textarea
          className="min-h-[120px] resize-y"
          onChange={(e) => onChange({ content: e.target.value })}
          placeholder="Write your note here..."
          value={config.content ?? ""}
        />
      </ConfigField>
    </ConfigSection>
  );
});

ContentSection.displayName = "ContentSection";

export const AppearanceSection = memo(function AppearanceSectionComponent({
  config,
  onChange,
}: SectionProps) {
  const currentColor = config.color ?? "yellow";
  const currentFontSize = config.fontSize ?? "sm";

  return (
    <ConfigSection icon={<Icons.Eye className="size-4" />} title="Appearance">
      <div className="space-y-4">
        <ConfigField label="Color">
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                className={cn(
                  "size-7 rounded-md border-2 transition-all",
                  c.swatch,
                  currentColor === c.value
                    ? "scale-110 border-foreground"
                    : "border-transparent hover:border-border"
                )}
                key={c.value}
                onClick={() => onChange({ color: c.value })}
                title={c.label}
                type="button"
              />
            ))}
          </div>
        </ConfigField>
        <ConfigField label="Font Size">
          <div className="flex gap-2">
            <SelectionButton
              className={cn(
                "flex-1 px-3 py-1.5 text-xs",
                currentFontSize === "sm" && "font-medium"
              )}
              onClick={() => onChange({ fontSize: "sm" })}
              selected={currentFontSize === "sm"}
            >
              Small
            </SelectionButton>
            <SelectionButton
              className={cn(
                "flex-1 px-3 py-1.5 text-sm",
                currentFontSize === "base" && "font-medium"
              )}
              onClick={() => onChange({ fontSize: "base" })}
              selected={currentFontSize === "base"}
            >
              Base
            </SelectionButton>
          </div>
        </ConfigField>
      </div>
    </ConfigSection>
  );
});

AppearanceSection.displayName = "AppearanceSection";

export const BehaviorSection = memo(function BehaviorSectionComponent({
  config,
  onChange,
}: SectionProps) {
  return (
    <ConfigSection
      icon={<Icons.Settings className="size-4" />}
      title="Behavior"
    >
      <div className="space-y-4">
        <ConfigField horizontal label="Pin Note">
          <Switch
            checked={config.isPinned ?? false}
            onCheckedChange={(isPinned) => onChange({ isPinned })}
          />
        </ConfigField>
        <ConfigField horizontal label="Collapse">
          <Switch
            checked={config.isCollapsed ?? false}
            onCheckedChange={(isCollapsed) => onChange({ isCollapsed })}
          />
        </ConfigField>
      </div>
    </ConfigSection>
  );
});

BehaviorSection.displayName = "BehaviorSection";

export const SizeSection = memo(function SizeSectionComponent({
  config,
  onChange,
}: SectionProps) {
  const currentWidth = config.width ?? 240;
  const currentHeight = config.height ?? "";

  const handleWidthChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Number.parseInt(e.target.value, 10);
      if (!Number.isNaN(val) && val >= 160 && val <= 600) {
        onChange({ width: val });
      }
    },
    [onChange]
  );

  const handleHeightChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      if (!raw) {
        onChange({ height: undefined });
        return;
      }
      const val = Number.parseInt(raw, 10);
      if (!Number.isNaN(val) && val >= 60 && val <= 800) {
        onChange({ height: val });
      }
    },
    [onChange]
  );

  return (
    <ConfigSection icon={<Icons.Maximize className="size-4" />} title="Size">
      <div className="space-y-4">
        <ConfigField label="Width Preset">
          <div className="flex gap-2">
            {SIZE_PRESETS.map((preset) => (
              <SelectionButton
                className={cn(
                  "flex-1 px-3 py-1.5 text-xs",
                  currentWidth === preset.width && "font-medium"
                )}
                key={preset.label}
                onClick={() => onChange({ width: preset.width })}
                selected={currentWidth === preset.width}
              >
                {preset.label}
              </SelectionButton>
            ))}
          </div>
        </ConfigField>
        <ConfigField label="Custom Width (px)">
          <Input
            className="h-9"
            max={600}
            min={160}
            onChange={handleWidthChange}
            type="number"
            value={currentWidth}
          />
        </ConfigField>
        <ConfigField label="Custom Height (px)">
          <Input
            className="h-9"
            max={800}
            min={60}
            onChange={handleHeightChange}
            type="number"
            value={currentHeight}
          />
        </ConfigField>
      </div>
    </ConfigSection>
  );
});

SizeSection.displayName = "SizeSection";
