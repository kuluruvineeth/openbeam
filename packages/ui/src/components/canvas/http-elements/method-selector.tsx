"use client";

import type { HttpMethod } from "@openplane/types/canvas";
import { forwardRef, memo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../select";

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: "text-emerald-500",
  POST: "text-blue-500",
  PUT: "text-amber-500",
  PATCH: "text-orange-500",
  DELETE: "text-red-500",
  HEAD: "text-muted-foreground",
  OPTIONS: "text-muted-foreground",
};

const METHODS: HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
];

interface MethodSelectorProps {
  value: HttpMethod;
  onChange: (method: HttpMethod) => void;
  disabled?: boolean;
}

export const MethodSelector = memo(
  forwardRef<HTMLButtonElement, MethodSelectorProps>(
    function MethodSelectorComponent({ value, onChange, disabled }, ref) {
      return (
        <Select
          disabled={disabled}
          onValueChange={(v) => onChange(v as HttpMethod)}
          value={value}
        >
          <SelectTrigger className="h-9 w-[100px] shrink-0" ref={ref}>
            <SelectValue>
              <span className={METHOD_COLORS[value]}>{value}</span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {METHODS.map((method) => (
              <SelectItem key={method} value={method}>
                <span className={METHOD_COLORS[method]}>{method}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
  )
);

MethodSelector.displayName = "MethodSelector";
