"use client";

import type { HttpMethod } from "@openbeam/types/canvas";
import { forwardRef, memo, useCallback } from "react";
import { Input } from "../../input";
import { MethodSelector } from "./method-selector";

interface UrlBarProps {
  method: HttpMethod;
  url: string;
  onMethodChange: (method: HttpMethod) => void;
  onUrlChange: (url: string) => void;
  disabled?: boolean;
}

export const UrlBar = memo(
  forwardRef<HTMLDivElement, UrlBarProps>(function UrlBarComponent(
    { method, url, onMethodChange, onUrlChange, disabled },
    ref
  ) {
    const handleUrlChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onUrlChange(e.target.value);
      },
      [onUrlChange]
    );

    return (
      <div className="flex items-center gap-2" ref={ref}>
        <MethodSelector
          disabled={disabled}
          onChange={onMethodChange}
          value={method}
        />
        <Input
          className="h-9 flex-1 font-mono text-sm"
          disabled={disabled}
          onChange={handleUrlChange}
          placeholder="https://api.example.com/endpoint"
          spellCheck={false}
          value={url}
        />
      </div>
    );
  })
);

UrlBar.displayName = "UrlBar";
