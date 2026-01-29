"use client";

import { forwardRef, memo } from "react";
import { CodeEditor } from "../../code-editor";

interface QueryEditorProps {
  query: string;
  onChange: (query: string) => void;
  disabled?: boolean;
}

export const QueryEditor = memo(
  forwardRef<HTMLDivElement, QueryEditorProps>(function QueryEditorComponent(
    { query, onChange, disabled },
    ref
  ) {
    return (
      <CodeEditor
        language="graphql"
        maxHeight="300px"
        minHeight="120px"
        onChange={onChange}
        placeholder="query { users { id name email } }"
        readOnly={disabled}
        ref={ref}
        value={query}
      />
    );
  })
);

QueryEditor.displayName = "QueryEditor";
