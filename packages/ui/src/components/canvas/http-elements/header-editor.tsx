"use client";

import type { KeyValuePair } from "@openbeam/types/canvas";
import { forwardRef, memo } from "react";
import { KeyValueEditor } from "./key-value-editor";

interface HeaderEditorProps {
  headers: KeyValuePair[];
  onChange: (headers: KeyValuePair[]) => void;
  disabled?: boolean;
}

export const HeaderEditor = memo(
  forwardRef<HTMLDivElement, HeaderEditorProps>(function HeaderEditorComponent(
    { headers, onChange, disabled },
    ref
  ) {
    return (
      <KeyValueEditor
        addLabel="Add header"
        disabled={disabled}
        keyPlaceholder="Header name"
        onChange={onChange}
        pairs={headers}
        ref={ref}
        valuePlaceholder="Header value"
      />
    );
  })
);

HeaderEditor.displayName = "HeaderEditor";
