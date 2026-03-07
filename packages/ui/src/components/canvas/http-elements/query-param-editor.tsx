"use client";

import type { KeyValuePair } from "@openbeam/types/canvas";
import { forwardRef, memo } from "react";
import { KeyValueEditor } from "./key-value-editor";

interface QueryParamEditorProps {
  params: KeyValuePair[];
  onChange: (params: KeyValuePair[]) => void;
  disabled?: boolean;
}

export const QueryParamEditor = memo(
  forwardRef<HTMLDivElement, QueryParamEditorProps>(
    function QueryParamEditorComponent({ params, onChange, disabled }, ref) {
      return (
        <KeyValueEditor
          addLabel="Add parameter"
          disabled={disabled}
          keyPlaceholder="Parameter name"
          onChange={onChange}
          pairs={params}
          ref={ref}
          valuePlaceholder="Parameter value"
        />
      );
    }
  )
);

QueryParamEditor.displayName = "QueryParamEditor";
