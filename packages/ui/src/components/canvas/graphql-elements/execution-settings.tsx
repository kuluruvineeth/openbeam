"use client";

import type { GraphqlQueryNodeConfig } from "@openplane/types/canvas";
import { forwardRef, memo, useCallback, useMemo } from "react";
import { Input } from "../../input";
import { Slider } from "../../slider";
import { Switch } from "../../switch";
import { ConfigField } from "../panels/config-field";

const TIMEOUT_STEPS = [5, 10, 15, 30, 60, 120, 300];

function msToStepIndex(ms: number): number {
  const seconds = ms / 1000;
  const idx = TIMEOUT_STEPS.findIndex((s) => s >= seconds);
  return idx === -1 ? TIMEOUT_STEPS.length - 1 : idx;
}

function stepIndexToMs(idx: number): number {
  return (TIMEOUT_STEPS[idx] ?? 30) * 1000;
}

type ExecutionFields = Pick<
  GraphqlQueryNodeConfig,
  | "timeoutMs"
  | "includeExtensions"
  | "followRedirects"
  | "responsePath"
  | "continueOnError"
>;

interface ExecutionSettingsProps {
  config: ExecutionFields;
  onChange: (patch: Partial<ExecutionFields>) => void;
  disabled?: boolean;
}

export const ExecutionSettings = memo(
  forwardRef<HTMLDivElement, ExecutionSettingsProps>(
    function ExecutionSettingsComponent({ config, onChange, disabled }, ref) {
      const timeoutIndex = useMemo(
        () => msToStepIndex(config.timeoutMs),
        [config.timeoutMs]
      );

      const timeoutLabel = useMemo(() => {
        const s = (config.timeoutMs ?? 30_000) / 1000;
        return s >= 60 ? `${s / 60}m` : `${s}s`;
      }, [config.timeoutMs]);

      const handleTimeoutChange = useCallback(
        (value: number[]) => {
          const idx = value[0];
          if (idx !== undefined) {
            onChange({ timeoutMs: stepIndexToMs(idx) });
          }
        },
        [onChange]
      );

      return (
        <div className="space-y-4" ref={ref}>
          <ConfigField
            label="Timeout"
            tooltip="Maximum wait time for the response"
          >
            <div className="flex items-center gap-3">
              <Slider
                disabled={disabled}
                max={TIMEOUT_STEPS.length - 1}
                min={0}
                onValueChange={handleTimeoutChange}
                step={1}
                value={[timeoutIndex]}
              />
              <span className="w-10 shrink-0 text-right font-mono text-muted-foreground text-xs">
                {timeoutLabel}
              </span>
            </div>
          </ConfigField>

          <ConfigField
            label="Response Path"
            tooltip="JSONPath to extract from response data"
          >
            <Input
              className="h-8 font-mono text-xs"
              disabled={disabled}
              onChange={(e) => onChange({ responsePath: e.target.value })}
              placeholder="data.users"
              value={config.responsePath ?? ""}
            />
          </ConfigField>

          <ConfigField horizontal label="Include Extensions">
            <Switch
              checked={config.includeExtensions}
              disabled={disabled}
              onCheckedChange={(v) => onChange({ includeExtensions: v })}
            />
          </ConfigField>

          <ConfigField horizontal label="Follow Redirects">
            <Switch
              checked={config.followRedirects}
              disabled={disabled}
              onCheckedChange={(v) => onChange({ followRedirects: v })}
            />
          </ConfigField>

          <ConfigField horizontal label="Continue on Error">
            <Switch
              checked={config.continueOnError}
              disabled={disabled}
              onCheckedChange={(v) => onChange({ continueOnError: v })}
            />
          </ConfigField>
        </div>
      );
    }
  )
);

ExecutionSettings.displayName = "ExecutionSettings";
