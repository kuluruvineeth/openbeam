"use client";

import type { HttpBodyType } from "@openbeam/types/canvas";
import { forwardRef, memo, useCallback } from "react";
import { ToggleGroup, ToggleGroupItem } from "../../toggle-group";

const BODY_TYPE_LABELS: Record<HttpBodyType, string> = {
  none: "None",
  json: "JSON",
  form_urlencoded: "Form",
  form_data: "Multipart",
  raw: "Raw",
  binary: "Binary",
  xml: "XML",
};

const BODY_TYPES: HttpBodyType[] = [
  "none",
  "json",
  "form_urlencoded",
  "form_data",
  "raw",
  "xml",
];

interface BodyTypeSelectorProps {
  value: HttpBodyType;
  onChange: (type: HttpBodyType) => void;
  disabled?: boolean;
}

export const BodyTypeSelector = memo(
  forwardRef<HTMLDivElement, BodyTypeSelectorProps>(
    function BodyTypeSelectorComponent({ value, onChange, disabled }, ref) {
      const handleChange = useCallback(
        (val: string) => {
          if (val) {
            onChange(val as HttpBodyType);
          }
        },
        [onChange]
      );

      return (
        <ToggleGroup
          disabled={disabled}
          onValueChange={handleChange}
          ref={ref}
          type="single"
          value={value}
          variant="outline"
        >
          {BODY_TYPES.map((type) => (
            <ToggleGroupItem
              className="h-7 px-2.5 text-xs"
              key={type}
              value={type}
            >
              {BODY_TYPE_LABELS[type]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      );
    }
  )
);

BodyTypeSelector.displayName = "BodyTypeSelector";
