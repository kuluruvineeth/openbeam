"use client";

import type {
  ParameterBinding,
  ParameterBindingMode,
} from "@openplane/types/canvas";
import { forwardRef, memo, useCallback, useMemo } from "react";
import { Input } from "../../input";
import { Switch } from "../../switch";
import { Textarea } from "../../textarea";
import { ConfigField } from "../panels/config-field";
import { BindingModeToggle } from "./binding-mode-toggle";

export interface ToolParameterDef {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  description?: string;
  required?: boolean;
  default?: unknown;
}

interface ParameterBindingEditorProps {
  parameters: ToolParameterDef[];
  bindings: Record<string, ParameterBinding>;
  onChange: (bindings: Record<string, ParameterBinding>) => void;
  disabled?: boolean;
}

function resolveDefaultValue(param: ToolParameterDef): unknown {
  if (param.default !== undefined) {
    return param.default;
  }
  if (param.type === "boolean") {
    return false;
  }
  return;
}

function getDefaultBinding(param: ToolParameterDef): ParameterBinding {
  return { mode: "static", staticValue: resolveDefaultValue(param) };
}

function StaticInput({
  paramType,
  value,
  onChange,
  disabled,
}: {
  paramType: string;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
}) {
  switch (paramType) {
    case "boolean":
      return (
        <Switch
          checked={value === true}
          disabled={disabled}
          onCheckedChange={onChange}
        />
      );
    case "number":
      return (
        <Input
          className="h-8 font-mono text-xs"
          disabled={disabled}
          onChange={(e) => {
            const n = Number.parseFloat(e.target.value);
            onChange(Number.isNaN(n) ? undefined : n);
          }}
          type="number"
          value={typeof value === "number" ? String(value) : ""}
        />
      );
    case "object":
    case "array":
      return (
        <Textarea
          className="min-h-[60px] resize-y font-mono text-xs"
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder={paramType === "array" ? "[]" : "{}"}
          value={typeof value === "string" ? value : ""}
        />
      );
    default:
      return (
        <Input
          className="h-8 font-mono text-xs"
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          value={typeof value === "string" ? value : ""}
        />
      );
  }
}

function VariableInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <Input
      className="h-8 font-mono text-xs"
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder="{{node.output}}"
      value={value}
    />
  );
}

function AiDescriptionInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <Textarea
      className="min-h-[48px] resize-y text-xs"
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Describe what the agent should provide..."
      value={value}
    />
  );
}

export const ParameterBindingEditor = memo(
  forwardRef<HTMLDivElement, ParameterBindingEditorProps>(
    function ParameterBindingEditorComponent(
      { parameters, bindings, onChange, disabled },
      ref
    ) {
      const sortedParams = useMemo(
        () =>
          [...parameters].sort((a, b) => {
            if (a.required && !b.required) {
              return -1;
            }
            if (!a.required && b.required) {
              return 1;
            }
            return 0;
          }),
        [parameters]
      );

      const updateBinding = useCallback(
        (name: string, patch: Partial<ParameterBinding>) => {
          const param = parameters.find((p) => p.name === name);
          const current =
            bindings[name] ??
            getDefaultBinding(param ?? { name, type: "string" as const });
          onChange({ ...bindings, [name]: { ...current, ...patch } });
        },
        [bindings, onChange, parameters]
      );

      const handleModeChange = useCallback(
        (name: string, mode: ParameterBindingMode) => {
          const param = parameters.find((p) => p.name === name);
          const patch: Partial<ParameterBinding> = { mode };
          if (mode === "ai_inferred" && param?.description) {
            const current = bindings[name];
            if (!current?.aiDescription) {
              patch.aiDescription = param.description;
            }
          }
          updateBinding(name, patch);
        },
        [updateBinding, parameters, bindings]
      );

      return (
        <div className="space-y-3" ref={ref}>
          {sortedParams.map((param) => {
            const binding = bindings[param.name] ?? getDefaultBinding(param);

            return (
              <ConfigField
                key={param.name}
                label={param.name}
                required={param.required}
                tooltip={param.description}
              >
                <div className="space-y-2">
                  <div className="flex justify-end">
                    <BindingModeToggle
                      disabled={disabled}
                      onChange={(mode) => handleModeChange(param.name, mode)}
                      value={binding.mode ?? "static"}
                    />
                  </div>

                  {(binding.mode ?? "static") === "static" && (
                    <StaticInput
                      disabled={disabled}
                      onChange={(v) =>
                        updateBinding(param.name, { staticValue: v })
                      }
                      paramType={param.type}
                      value={binding.staticValue}
                    />
                  )}

                  {binding.mode === "variable" && (
                    <VariableInput
                      disabled={disabled}
                      onChange={(v) =>
                        updateBinding(param.name, { variableRef: v })
                      }
                      value={binding.variableRef ?? ""}
                    />
                  )}

                  {binding.mode === "ai_inferred" && (
                    <AiDescriptionInput
                      disabled={disabled}
                      onChange={(v) =>
                        updateBinding(param.name, { aiDescription: v })
                      }
                      value={binding.aiDescription ?? ""}
                    />
                  )}
                </div>
              </ConfigField>
            );
          })}

          {parameters.length === 0 && (
            <p className="py-4 text-center text-muted-foreground/60 text-xs">
              Select a tool to configure parameters
            </p>
          )}
        </div>
      );
    }
  )
);

ParameterBindingEditor.displayName = "ParameterBindingEditor";
