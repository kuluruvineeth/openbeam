"use client";

import type {
  VoiceEngine,
  VoiceFormatStyle,
  WidgetPosition,
} from "@openplane/types/services/voice";
import {
  Button,
  Icons,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Switch,
} from "@openplane/ui";
import { useCallback, useEffect, useState } from "react";
import {
  useUpdateVoiceSettings,
  useVoiceSettings,
  useVoiceStats,
} from "../hooks/use-voice-settings";

const ENGINE_OPTIONS: {
  value: VoiceEngine;
  label: string;
  description: string;
}[] = [
  { value: "cloud", label: "Cloud", description: "LiveKit cloud processing" },
  { value: "local", label: "Local", description: "On-device with Whisper.cpp" },
  {
    value: "hybrid",
    label: "Hybrid",
    description: "Local first, cloud fallback",
  },
];

const FORMAT_STYLE_OPTIONS: { value: VoiceFormatStyle; label: string }[] = [
  { value: "context-aware", label: "Context-aware" },
  { value: "formal", label: "Formal" },
  { value: "casual", label: "Casual" },
  { value: "technical", label: "Technical" },
  { value: "off", label: "Off" },
];

const POSITION_OPTIONS: { value: WidgetPosition; label: string }[] = [
  { value: "bottom-center", label: "Bottom center" },
  { value: "bottom-right", label: "Bottom right" },
  { value: "top-center", label: "Top center" },
  { value: "top-right", label: "Top right" },
];

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={`voice-skel-${i}`}>
          <Skeleton className="mb-2 h-3 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border/50 px-3 py-2">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-medium text-sm tabular-nums">{value}</p>
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  if (minutes < 60) {
    return remaining > 0 ? `${minutes}m ${remaining}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export function VoiceSettings() {
  const { data: settings, isLoading } = useVoiceSettings();
  const { data: stats } = useVoiceStats();
  const updateSettings = useUpdateVoiceSettings();

  const [engine, setEngine] = useState<VoiceEngine>("cloud");
  const [language, setLanguage] = useState("en");
  const [formatting, setFormatting] = useState(true);
  const [formatStyle, setFormatStyle] =
    useState<VoiceFormatStyle>("context-aware");
  const [widgetPosition, setWidgetPosition] =
    useState<WidgetPosition>("bottom-center");
  const [widgetOpacity, setWidgetOpacity] = useState(0.7);
  const [autoHide, setAutoHide] = useState(false);
  const [vocabulary, setVocabulary] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!settings) {
      return;
    }
    setEngine(settings.engine as VoiceEngine);
    setLanguage(settings.language);
    setFormatting(settings.formatting);
    setFormatStyle(settings.formatStyle as VoiceFormatStyle);
    setWidgetPosition(settings.widgetPosition as WidgetPosition);
    setWidgetOpacity(settings.widgetOpacity);
    setAutoHide(settings.autoHide);
    const vocab = Array.isArray(settings.vocabulary) ? settings.vocabulary : [];
    setVocabulary(vocab.join(", "));
    setIsDirty(false);
  }, [settings]);

  const markDirty = useCallback(() => setIsDirty(true), []);

  const handleSave = useCallback(() => {
    const vocabArray = vocabulary
      .split(",")
      .map((w) => w.trim())
      .filter(Boolean);

    updateSettings.mutate(
      {
        engine,
        language,
        formatting,
        formatStyle,
        widgetPosition,
        widgetOpacity,
        autoHide,
        vocabulary: vocabArray,
      },
      {
        onSuccess: () => setIsDirty(false),
      }
    );
  }, [
    engine,
    language,
    formatting,
    formatStyle,
    widgetPosition,
    widgetOpacity,
    autoHide,
    vocabulary,
    updateSettings,
  ]);

  if (isLoading) {
    return <SettingsSkeleton />;
  }

  return (
    <div className="space-y-8">
      {stats && (
        <section>
          <h3 className="mb-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
            Last 30 days
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatCard label="Sessions" value={stats.sessionCount} />
            <StatCard
              label="Duration"
              value={formatDuration(stats.totalDuration)}
            />
            <StatCard
              label="Words spoken"
              value={stats.totalWordsSpoken.toLocaleString()}
            />
            <StatCard label="Tool calls" value={stats.totalToolCalls} />
          </div>
        </section>
      )}

      <section className="space-y-5">
        <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
          Recognition
        </h3>

        <SettingRow label="Engine">
          <Select
            onValueChange={(v: VoiceEngine) => {
              setEngine(v);
              markDirty();
            }}
            value={engine}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENGINE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <span>{opt.label}</span>
                  <span className="ml-2 text-muted-foreground text-xs">
                    {opt.description}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>

        <SettingRow label="Language">
          <Input
            className="w-full"
            onChange={(e) => {
              setLanguage(e.target.value);
              markDirty();
            }}
            placeholder="en"
            value={language}
          />
        </SettingRow>

        <SettingRow label="Smart formatting">
          <div className="flex items-center gap-3">
            <Switch
              checked={formatting}
              onCheckedChange={(v) => {
                setFormatting(v);
                markDirty();
              }}
            />
            {formatting && (
              <Select
                onValueChange={(v: VoiceFormatStyle) => {
                  setFormatStyle(v);
                  markDirty();
                }}
                value={formatStyle}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMAT_STYLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </SettingRow>

        <SettingRow label="Custom vocabulary">
          <Input
            className="w-full"
            onChange={(e) => {
              setVocabulary(e.target.value);
              markDirty();
            }}
            placeholder="OpenPlane, tRPC, Vespa, ..."
            value={vocabulary}
          />
          <p className="mt-1 text-muted-foreground text-xs">
            Comma-separated words for improved recognition
          </p>
        </SettingRow>
      </section>

      <section className="space-y-5">
        <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
          Widget
        </h3>

        <SettingRow label="Position">
          <Select
            onValueChange={(v: WidgetPosition) => {
              setWidgetPosition(v);
              markDirty();
            }}
            value={widgetPosition}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POSITION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>

        <SettingRow label="Opacity">
          <div className="flex items-center gap-3">
            <input
              className="h-1.5 w-full cursor-pointer appearance-none rounded-sm bg-border accent-primary"
              max={1}
              min={0.1}
              onChange={(e) => {
                setWidgetOpacity(Number(e.target.value));
                markDirty();
              }}
              step={0.05}
              type="range"
              value={widgetOpacity}
            />
            <span className="w-10 text-right text-muted-foreground text-xs tabular-nums">
              {Math.round(widgetOpacity * 100)}%
            </span>
          </div>
        </SettingRow>

        <SettingRow label="Auto-hide when idle">
          <Switch
            checked={autoHide}
            onCheckedChange={(v) => {
              setAutoHide(v);
              markDirty();
            }}
          />
        </SettingRow>
      </section>

      <div className="flex justify-end border-border/50 border-t pt-4">
        <Button
          disabled={!isDirty || updateSettings.isPending}
          onClick={handleSave}
          size="sm"
        >
          {updateSettings.isPending ? (
            <Icons.Spinner className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Icons.Check className="mr-1.5 h-3.5 w-3.5" />
          )}
          Save
        </Button>
      </div>
    </div>
  );
}

function SettingRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}
