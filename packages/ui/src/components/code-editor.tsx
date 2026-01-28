"use client";

import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { python } from "@codemirror/lang-python";
import { PostgreSQL, sql } from "@codemirror/lang-sql";
import type { EditorLanguage } from "@openplane/types/canvas";
import CodeMirror, {
  EditorView,
  type ReactCodeMirrorProps,
} from "@uiw/react-codemirror";
import { useTheme } from "next-themes";
import { forwardRef, memo, useMemo } from "react";
import { cn } from "../utils";

function getLanguageExtension(language: EditorLanguage) {
  switch (language) {
    case "typescript":
      return javascript({ jsx: false, typescript: true });
    case "javascript":
      return javascript({ jsx: false, typescript: false });
    case "python":
      return python();
    case "sql":
      return sql({ dialect: PostgreSQL });
    case "json":
      return json();
    case "graphql":
      return javascript({ jsx: false, typescript: false });
    default:
      return javascript({ jsx: false, typescript: false });
  }
}

interface CodeEditorProps
  extends Omit<
    ReactCodeMirrorProps,
    "theme" | "extensions" | "onChange" | "value"
  > {
  value: string;
  onChange?: (value: string) => void;
  language?: EditorLanguage;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  maxHeight?: string;
  lineWrapping?: boolean;
}

const CodeEditor = memo(
  forwardRef<HTMLDivElement, CodeEditorProps>(function CodeEditorComponent(
    {
      value,
      onChange,
      language = "javascript",
      readOnly = false,
      placeholder,
      className,
      minHeight = "200px",
      maxHeight,
      lineWrapping = true,
      ...rest
    },
    ref
  ) {
    const { resolvedTheme } = useTheme();

    const extensions = useMemo(
      () => [
        getLanguageExtension(language),
        ...(lineWrapping ? [EditorView.lineWrapping] : []),
      ],
      [language, lineWrapping]
    );

    return (
      <div
        className={cn(
          "w-full min-w-0 overflow-hidden rounded-md border border-border/50",
          className
        )}
        ref={ref}
      >
        <CodeMirror
          basicSetup={{
            lineNumbers: true,
            foldGutter: false,
            highlightActiveLine: !readOnly,
            highlightSelectionMatches: true,
            bracketMatching: true,
            autocompletion: false,
            indentOnInput: true,
          }}
          editable={!readOnly}
          extensions={extensions}
          maxHeight={maxHeight}
          minHeight={minHeight}
          onChange={onChange}
          placeholder={placeholder}
          theme={resolvedTheme === "dark" ? "dark" : "light"}
          value={value}
          width="100%"
          {...rest}
        />
      </div>
    );
  })
);

CodeEditor.displayName = "CodeEditor";

export { CodeEditor };
export type { CodeEditorProps };
