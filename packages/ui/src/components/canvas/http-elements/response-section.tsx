"use client";

import type { HttpResponseHandling } from "@openbeam/types/canvas";
import { forwardRef, memo, useCallback } from "react";
import { AnimatedSizeContainer } from "../../animated-size-container";
import { Input } from "../../input";
import { Label } from "../../label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../select";
import { Switch } from "../../switch";

const RESPONSE_TYPES = [
  { value: "auto", label: "Auto-detect" },
  { value: "json", label: "JSON" },
  { value: "text", label: "Text" },
  { value: "binary", label: "Binary" },
  { value: "stream", label: "Stream" },
] as const;

interface ResponseSectionProps {
  response: HttpResponseHandling;
  onChange: (response: HttpResponseHandling) => void;
  disabled?: boolean;
}

export const ResponseSection = memo(
  forwardRef<HTMLDivElement, ResponseSectionProps>(
    function ResponseSectionComponent({ response, onChange, disabled }, ref) {
      const updateField = useCallback(
        <K extends keyof HttpResponseHandling>(
          field: K,
          value: HttpResponseHandling[K]
        ) => {
          onChange({ ...response, [field]: value });
        },
        [response, onChange]
      );

      return (
        <div className="space-y-3" ref={ref}>
          <div className="space-y-1.5">
            <Label className="text-xs">Response Type</Label>
            <Select
              disabled={disabled}
              onValueChange={(v) =>
                updateField(
                  "responseType",
                  v as HttpResponseHandling["responseType"]
                )
              }
              value={response.responseType}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESPONSE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs">Follow Redirects</Label>
            <Switch
              checked={response.followRedirects}
              disabled={disabled}
              onCheckedChange={(v) => updateField("followRedirects", v)}
            />
          </div>

          <AnimatedSizeContainer height>
            {response.followRedirects && (
              <div className="space-y-1.5">
                <Label className="text-xs">Max Redirects</Label>
                <Input
                  className="h-8 text-xs"
                  disabled={disabled}
                  max={20}
                  min={0}
                  onChange={(e) => {
                    const val = Number.parseInt(e.target.value, 10);
                    if (!Number.isNaN(val)) {
                      updateField("maxRedirects", val);
                    }
                  }}
                  type="number"
                  value={response.maxRedirects}
                />
              </div>
            )}
          </AnimatedSizeContainer>

          <div className="flex items-center justify-between">
            <Label className="text-xs">Validate SSL Certificate</Label>
            <Switch
              checked={response.validateCertificate}
              disabled={disabled}
              onCheckedChange={(v) => updateField("validateCertificate", v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs">Parse Response</Label>
            <Switch
              checked={response.parseResponse}
              disabled={disabled}
              onCheckedChange={(v) => updateField("parseResponse", v)}
            />
          </div>
        </div>
      );
    }
  )
);

ResponseSection.displayName = "ResponseSection";
