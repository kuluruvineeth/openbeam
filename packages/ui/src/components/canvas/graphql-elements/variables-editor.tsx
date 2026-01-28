"use client";

import { forwardRef, memo } from "react";
import { CodeEditor } from "../../code-editor";

interface VariablesEditorProps {
  variables: string;
  onChange: (variables: string) => void;
  disabled?: boolean;
}

export const VariablesEditor = memo(
  forwardRef<HTMLDivElement, VariablesEditorProps>(
    function VariablesEditorComponent({ variables, onChange, disabled }, ref) {
      return (
        <CodeEditor
          language="json"
          maxHeight="200px"
          minHeight="80px"
          onChange={onChange}
          placeholder='{ "id": "123" }'
          readOnly={disabled}
          ref={ref}
          value={variables}
        />
      );
    }
  )
);

VariablesEditor.displayName = "VariablesEditor";
