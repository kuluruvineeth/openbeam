"use client";

import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import type { CodeRuntime } from "@openplane/types/canvas";
import CodeMirror, { type ReactCodeMirrorProps } from "@uiw/react-codemirror";
import { useTheme } from "next-themes";
import { forwardRef, memo, useMemo } from "react";
import { cn } from "../utils";

function getLanguageExtension(language: CodeRuntime) {
  switch (language) {
    case "typescript":
      return javascript({ jsx: false, typescript: true });
    case "javascript":
      return javascript({ jsx: false, typescript: false });
    case "python":
      return python();
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
  language?: CodeRuntime;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  maxHeight?: string;
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
      ...rest
    },
    ref
  ) {
    const { resolvedTheme } = useTheme();

    const extensions = useMemo(
      () => [getLanguageExtension(language)],
      [language]
    );

    return (
      <div
        className={cn(
          "overflow-hidden rounded-md border border-border/50",
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
          {...rest}
        />
      </div>
    );
  })
);

CodeEditor.displayName = "CodeEditor";

export { CodeEditor };
export type { CodeEditorProps };
