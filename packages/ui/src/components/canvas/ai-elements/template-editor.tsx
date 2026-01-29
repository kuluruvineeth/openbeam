"use client";

import type { TemplateSyntax } from "@openplane/types/canvas";
import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "../../../utils";
import { Button } from "../../button";
import { Icons } from "../../icons";

export interface TemplateEditorProps {
  value: string;
  onChange: (value: string) => void;
  syntax: TemplateSyntax;
  disabled?: boolean;
  placeholder?: string;
  minHeight?: number;
  maxHeight?: number;
  className?: string;
  onVariablesDetected?: (variables: string[]) => void;
}

const SYNTAX_HIGHLIGHT_PATTERNS: Record<TemplateSyntax, RegExp> = {
  handlebars: /(\{\{(?:#|\/)?[^{}]+\}\})/g,
  mustache: /(\{\{[^{}]+\}\})/g,
  ejs: /(<%[=\-_]?[^%]+%>)/g,
};

export const TemplateEditor = memo(
  forwardRef<HTMLTextAreaElement, TemplateEditorProps>(
    function TemplateEditorComponent(
      {
        value,
        onChange,
        syntax,
        disabled,
        placeholder = "Enter your template...",
        minHeight = 160,
        maxHeight = 400,
        className,
        onVariablesDetected,
      },
      ref
    ) {
      const textareaRef = useRef<HTMLTextAreaElement>(null);
      const highlightRef = useRef<HTMLDivElement>(null);
      const [isFocused, setIsFocused] = useState(false);

      const highlightedContent = useMemo(() => {
        const pattern = SYNTAX_HIGHLIGHT_PATTERNS[syntax];
        const parts = value.split(pattern);

        return parts.map((part, index) => {
          const key = `${index}-${part.slice(0, 20)}`;
          if (pattern.test(part)) {
            return (
              <span className="rounded-sm bg-primary/20 text-primary" key={key}>
                {part}
              </span>
            );
          }
          return <span key={key}>{part}</span>;
        });
      }, [value, syntax]);

      const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
          onChange(e.target.value);
        },
        [onChange]
      );

      const syncScroll = useCallback(() => {
        if (textareaRef.current && highlightRef.current) {
          highlightRef.current.scrollTop = textareaRef.current.scrollTop;
          highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
        }
      }, []);

      const insertVariable = useCallback(() => {
        const textarea = textareaRef.current;
        if (!textarea) {
          return;
        }

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const before = value.slice(0, start);
        const after = value.slice(end);

        const insertion = syntax === "ejs" ? "<%= variable %>" : "{{variable}}";
        onChange(before + insertion + after);

        requestAnimationFrame(() => {
          const cursorPos = start + (syntax === "ejs" ? 4 : 2);
          textarea.setSelectionRange(cursorPos, cursorPos + 8);
          textarea.focus();
        });
      }, [value, syntax, onChange]);

      useEffect(() => {
        const pattern = SYNTAX_HIGHLIGHT_PATTERNS[syntax];
        const matches = value.match(pattern) ?? [];
        const variables = matches.map((m) =>
          m
            .replace(/^\{\{#?|#?\}\}$/g, "")
            .replace(/^<%[=\-_]?|%>$/g, "")
            .trim()
        );
        onVariablesDetected?.(variables);
      }, [value, syntax, onVariablesDetected]);

      return (
        <div className={cn("relative", className)}>
          <div
            className={cn(
              "relative overflow-hidden rounded-md border transition-colors",
              isFocused
                ? "border-primary ring-1 ring-primary/20"
                : "border-border/50",
              disabled && "opacity-50"
            )}
            style={{ minHeight, maxHeight }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-sm"
              ref={highlightRef}
            >
              {highlightedContent}
              <br />
            </div>
            <textarea
              className={cn(
                "absolute inset-0 h-full w-full resize-none bg-transparent p-3 font-mono text-sm text-transparent caret-foreground outline-none",
                "placeholder:text-muted-foreground/50"
              )}
              disabled={disabled}
              onBlur={() => setIsFocused(false)}
              onChange={handleChange}
              onFocus={() => setIsFocused(true)}
              onScroll={syncScroll}
              placeholder={placeholder}
              ref={(node) => {
                (
                  textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>
                ).current = node;
                if (typeof ref === "function") {
                  ref(node);
                } else if (ref) {
                  ref.current = node;
                }
              }}
              spellCheck={false}
              value={value}
            />
          </div>
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            <Button
              className="h-7 px-2 text-xs"
              disabled={disabled}
              onClick={insertVariable}
              size="sm"
              variant="secondary"
            >
              <Icons.Plus className="mr-1 size-3" />
              Insert Variable
            </Button>
          </div>
        </div>
      );
    }
  )
);

TemplateEditor.displayName = "TemplateEditor";
