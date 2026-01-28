"use client";

import type { GraphqlMethod } from "@openplane/types/canvas";
import { forwardRef, memo, useCallback } from "react";
import { Input } from "../../input";
import { ToggleGroup, ToggleGroupItem } from "../../toggle-group";

const METHOD_LABELS: Record<GraphqlMethod, string> = {
  POST: "POST",
  GET: "GET",
};

interface EndpointBarProps {
  endpoint: string;
  method: GraphqlMethod;
  onEndpointChange: (endpoint: string) => void;
  onMethodChange: (method: GraphqlMethod) => void;
  disabled?: boolean;
}

export const EndpointBar = memo(
  forwardRef<HTMLDivElement, EndpointBarProps>(function EndpointBarComponent(
    { endpoint, method, onEndpointChange, onMethodChange, disabled },
    ref
  ) {
    const handleMethodChange = useCallback(
      (value: string) => {
        if (value) {
          onMethodChange(value as GraphqlMethod);
        }
      },
      [onMethodChange]
    );

    return (
      <div className="flex items-center gap-2" ref={ref}>
        <ToggleGroup
          className="shrink-0"
          disabled={disabled}
          onValueChange={handleMethodChange}
          size="sm"
          type="single"
          value={method}
        >
          {(Object.keys(METHOD_LABELS) as GraphqlMethod[]).map((m) => (
            <ToggleGroupItem
              className="px-2 font-mono text-xs"
              key={m}
              value={m}
            >
              {METHOD_LABELS[m]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Input
          className="h-8 flex-1 font-mono text-xs"
          disabled={disabled}
          onChange={(e) => onEndpointChange(e.target.value)}
          placeholder="https://api.example.com/graphql"
          value={endpoint}
        />
      </div>
    );
  })
);

EndpointBar.displayName = "EndpointBar";
