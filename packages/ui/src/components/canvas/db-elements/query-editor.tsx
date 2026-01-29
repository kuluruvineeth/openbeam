"use client";

import { forwardRef, memo, useCallback } from "react";
import { CodeEditor } from "../../code-editor";

const ENGINE_PLACEHOLDERS: Record<string, string> = {
  postgresql: "SELECT * FROM users WHERE id = $1",
  mysql: "SELECT * FROM users WHERE id = ?",
  mssql: "SELECT * FROM users WHERE id = @id",
  sqlite: "SELECT * FROM users WHERE id = ?",
  mariadb: "SELECT * FROM users WHERE id = ?",
  oracle: "SELECT * FROM users WHERE id = :id",
};

const PARAM_HINTS: Record<string, string> = {
  postgresql: "$1, $2",
  mssql: "@name",
  oracle: ":name",
};

function paramHint(engine: string): string {
  return PARAM_HINTS[engine] ?? "?";
}

interface QueryEditorProps {
  query: string;
  engine: string;
  onChange: (query: string) => void;
  disabled?: boolean;
}

export const QueryEditor = memo(
  forwardRef<HTMLDivElement, QueryEditorProps>(function QueryEditorComponent(
    { query, engine, onChange, disabled },
    ref
  ) {
    const placeholder =
      ENGINE_PLACEHOLDERS[engine] ?? ENGINE_PLACEHOLDERS.postgresql;

    const handleChange = useCallback(
      (value: string) => {
        onChange(value);
      },
      [onChange]
    );

    return (
      <div className="space-y-1.5" ref={ref}>
        <CodeEditor
          language="sql"
          maxHeight="300px"
          minHeight="120px"
          onChange={handleChange}
          placeholder={placeholder}
          readOnly={disabled}
          value={query}
        />
        <p className="text-muted-foreground/70 text-xs">
          Use parameterized queries for security ({paramHint(engine)})
        </p>
      </div>
    );
  })
);

QueryEditor.displayName = "QueryEditor";
