"use client";

import type {
  QueryParameter,
  QueryParameterType,
} from "@openplane/types/canvas";
import { forwardRef, memo, useCallback } from "react";
import { Icons } from "../../icons";
import { Input } from "../../input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../select";

const PARAM_TYPES: { value: QueryParameterType; label: string }[] = [
  { value: "string", label: "String" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Bool" },
  { value: "json", label: "JSON" },
  { value: "null", label: "Null" },
];

interface ParameterEditorProps {
  parameters: QueryParameter[];
  onChange: (parameters: QueryParameter[]) => void;
  disabled?: boolean;
}

export const ParameterEditor = memo(
  forwardRef<HTMLDivElement, ParameterEditorProps>(
    function ParameterEditorComponent({ parameters, onChange, disabled }, ref) {
      const handleAdd = useCallback(() => {
        onChange([
          ...parameters,
          { name: "", value: "", type: "string" as const },
        ]);
      }, [parameters, onChange]);

      const handleRemove = useCallback(
        (index: number) => {
          onChange(parameters.filter((_, i) => i !== index));
        },
        [parameters, onChange]
      );

      const handleUpdate = useCallback(
        (index: number, field: keyof QueryParameter, value: string) => {
          const updated = parameters.map((param, i) =>
            i === index ? { ...param, [field]: value } : param
          );
          onChange(updated);
        },
        [parameters, onChange]
      );

      return (
        <div className="space-y-2" ref={ref}>
          {parameters.length > 0 && (
            <div className="space-y-1.5">
              {parameters.map((param, index) => (
                <div
                  className="group flex items-center gap-1.5"
                  key={`${index}-${param.name}`}
                >
                  <Input
                    className="h-8 w-24 shrink-0 font-mono text-xs"
                    disabled={disabled}
                    onChange={(e) =>
                      handleUpdate(index, "name", e.target.value)
                    }
                    placeholder="name"
                    value={param.name}
                  />
                  <Input
                    className="h-8 flex-1 font-mono text-xs"
                    disabled={disabled}
                    onChange={(e) =>
                      handleUpdate(index, "value", e.target.value)
                    }
                    placeholder="value"
                    value={param.value}
                  />
                  <Select
                    disabled={disabled}
                    onValueChange={(val) => handleUpdate(index, "type", val)}
                    value={param.type ?? "string"}
                  >
                    <SelectTrigger className="h-8 w-20 shrink-0 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PARAM_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button
                    className="shrink-0 rounded-sm p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive disabled:pointer-events-none group-hover:opacity-100"
                    disabled={disabled}
                    onClick={() => handleRemove(index)}
                    type="button"
                  >
                    <Icons.Trash className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-muted-foreground text-xs transition-colors hover:bg-muted/50 hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
            disabled={disabled}
            onClick={handleAdd}
            type="button"
          >
            <Icons.Plus className="size-3" />
            Add parameter
          </button>
        </div>
      );
    }
  )
);

ParameterEditor.displayName = "ParameterEditor";
