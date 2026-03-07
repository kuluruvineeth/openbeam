"use client";

import type { KeyValuePair } from "@openbeam/types/canvas";
import { forwardRef, memo, useCallback } from "react";
import { cn } from "../../../utils";
import { Checkbox } from "../../checkbox";
import { Icons } from "../../icons";
import { Input } from "../../input";

interface KeyValueEditorProps {
  pairs: KeyValuePair[];
  onChange: (pairs: KeyValuePair[]) => void;
  addLabel?: string;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  disabled?: boolean;
  maxPairs?: number;
}

export const KeyValueEditor = memo(
  forwardRef<HTMLDivElement, KeyValueEditorProps>(
    function KeyValueEditorComponent(
      {
        pairs,
        onChange,
        addLabel = "Add pair",
        keyPlaceholder = "Key",
        valuePlaceholder = "Value",
        disabled,
        maxPairs = 50,
      },
      ref
    ) {
      const handleAdd = useCallback(() => {
        if (pairs.length >= maxPairs) {
          return;
        }
        onChange([...pairs, { key: "", value: "", enabled: true }]);
      }, [pairs, onChange, maxPairs]);

      const handleRemove = useCallback(
        (index: number) => {
          onChange(pairs.filter((_, i) => i !== index));
        },
        [pairs, onChange]
      );

      const handleUpdate = useCallback(
        (index: number, field: keyof KeyValuePair, value: string | boolean) => {
          const updated = pairs.map((pair, i) =>
            i === index ? { ...pair, [field]: value } : pair
          );
          onChange(updated);
        },
        [pairs, onChange]
      );

      const handleToggle = useCallback(
        (index: number, checked: boolean) => {
          handleUpdate(index, "enabled", checked);
        },
        [handleUpdate]
      );

      return (
        <div className="space-y-2" ref={ref}>
          {pairs.length > 0 && (
            <div className="space-y-1.5">
              {pairs.map((pair, index) => (
                <div
                  className="group flex items-center gap-1.5"
                  key={`${index}-${pair.key}`}
                >
                  <Checkbox
                    checked={pair.enabled}
                    className="size-3.5"
                    disabled={disabled}
                    onCheckedChange={(checked) =>
                      handleToggle(index, checked === true)
                    }
                  />
                  <Input
                    className={cn(
                      "h-8 flex-1 font-mono text-xs",
                      !pair.enabled && "opacity-50"
                    )}
                    disabled={disabled || !pair.enabled}
                    onChange={(e) => handleUpdate(index, "key", e.target.value)}
                    placeholder={keyPlaceholder}
                    value={pair.key}
                  />
                  <Input
                    className={cn(
                      "h-8 flex-1 font-mono text-xs",
                      !pair.enabled && "opacity-50"
                    )}
                    disabled={disabled || !pair.enabled}
                    onChange={(e) =>
                      handleUpdate(index, "value", e.target.value)
                    }
                    placeholder={valuePlaceholder}
                    value={pair.value}
                  />
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
            disabled={disabled || pairs.length >= maxPairs}
            onClick={handleAdd}
            type="button"
          >
            <Icons.Plus className="size-3" />
            {addLabel}
          </button>
        </div>
      );
    }
  )
);

KeyValueEditor.displayName = "KeyValueEditor";
