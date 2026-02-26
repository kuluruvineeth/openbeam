"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, useMemo } from "react";
import { cn } from "../../utils/cn";

const HEADING_REGEX = /^(#{1,6})\s+(.+)$/;
const CODE_REGEX = /^`([^`]+)`/;
const BOLD_REGEX = /^\*\*([^*]+)\*\*/;
const ITALIC_REGEX = /^\*([^*]+)\*/;
const LINK_REGEX = /^\[([^\]]+)\]\(([^)]+)\)/;
const CITATION_REGEX = /^\[(\d+)\]/;
const SPECIAL_CHAR_REGEX = /[`*[]/;

const agentMarkdownVariants = cva(
  "prose prose-sm dark:prose-invert max-w-none",
  {
    variants: {
      size: {
        sm: "prose-sm",
        md: "prose-base",
        lg: "prose-lg",
      },
    },
    defaultVariants: {
      size: "sm",
    },
  }
);

type AgentMarkdownProps = React.ComponentProps<"div"> &
  VariantProps<typeof agentMarkdownVariants> & {
    content: string;
  };

interface ParsedSegment {
  type: "text" | "code" | "code-block" | "bold" | "italic" | "link" | "heading";
  content: string;
  language?: string;
  href?: string;
  level?: number;
}

interface CodeBlockResult {
  segment: ParsedSegment;
  nextIndex: number;
}

function parseCodeBlock(lines: string[], startIndex: number): CodeBlockResult {
  const language = (lines[startIndex] ?? "").slice(3).trim();
  const codeLines: string[] = [];
  let i = startIndex + 1;

  while (i < lines.length) {
    const currentLine = lines[i] ?? "";
    if (currentLine.startsWith("```")) {
      break;
    }
    codeLines.push(currentLine);
    i += 1;
  }

  return {
    segment: {
      type: "code-block",
      content: codeLines.join("\n"),
      language: language || undefined,
    },
    nextIndex: i + 1,
  };
}

function parseHeading(line: string): ParsedSegment | null {
  const match = line.match(HEADING_REGEX);
  if (match?.[1] && match[2]) {
    return {
      type: "heading",
      content: match[2],
      level: match[1].length,
    };
  }
  return null;
}

function parseMarkdown(text: string): ParsedSegment[] {
  const segments: ParsedSegment[] = [];
  const lines = text.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";

    if (line.startsWith("```")) {
      const { segment, nextIndex } = parseCodeBlock(lines, i);
      segments.push(segment);
      i = nextIndex;
      continue;
    }

    const heading = parseHeading(line);
    if (heading) {
      segments.push(heading);
      i += 1;
      continue;
    }

    if (line.trim()) {
      segments.push({ type: "text", content: line });
    }
    i += 1;
  }

  return segments;
}

interface InlineMatch {
  node: React.ReactNode;
  consumed: number;
}

function tryMatchCode(text: string, key: number): InlineMatch | null {
  const match = text.match(CODE_REGEX);
  if (!match) {
    return null;
  }
  return {
    node: (
      <code
        className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs"
        key={key}
      >
        {match[1]}
      </code>
    ),
    consumed: match[0].length,
  };
}

function tryMatchBold(text: string, key: number): InlineMatch | null {
  const match = text.match(BOLD_REGEX);
  if (!match) {
    return null;
  }
  return {
    node: (
      <strong className="font-semibold" key={key}>
        {match[1]}
      </strong>
    ),
    consumed: match[0].length,
  };
}

function tryMatchItalic(text: string, key: number): InlineMatch | null {
  const match = text.match(ITALIC_REGEX);
  if (!match) {
    return null;
  }
  return {
    node: (
      <em className="italic" key={key}>
        {match[1]}
      </em>
    ),
    consumed: match[0].length,
  };
}

function tryMatchLink(text: string, key: number): InlineMatch | null {
  const match = text.match(LINK_REGEX);
  if (!match) {
    return null;
  }
  return {
    node: (
      <a
        className="text-primary underline underline-offset-2 hover:text-primary/80"
        href={match[2]}
        key={key}
        rel="noopener noreferrer"
        target="_blank"
      >
        {match[1]}
      </a>
    ),
    consumed: match[0].length,
  };
}

function tryMatchCitation(text: string, key: number): InlineMatch | null {
  const match = text.match(CITATION_REGEX);
  if (!match) {
    return null;
  }
  return {
    node: (
      <sup
        className="ml-0.5 cursor-pointer text-primary hover:underline"
        key={key}
      >
        [{match[1]}]
      </sup>
    ),
    consumed: match[0].length,
  };
}

function tryInlinePatterns(text: string, key: number): InlineMatch | null {
  return (
    tryMatchCode(text, key) ??
    tryMatchBold(text, key) ??
    tryMatchItalic(text, key) ??
    tryMatchLink(text, key) ??
    tryMatchCitation(text, key)
  );
}

function consumePlainText(text: string, key: number): InlineMatch {
  const nextSpecial = text.search(SPECIAL_CHAR_REGEX);

  if (nextSpecial === -1) {
    return { node: <span key={key}>{text}</span>, consumed: text.length };
  }

  if (nextSpecial === 0) {
    return { node: <span key={key}>{text[0]}</span>, consumed: 1 };
  }

  return {
    node: <span key={key}>{text.slice(0, nextSpecial)}</span>,
    consumed: nextSpecial,
  };
}

function renderInlineMarkdown(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    key += 1;
    const patternMatch = tryInlinePatterns(remaining, key);

    if (patternMatch) {
      nodes.push(patternMatch.node);
      remaining = remaining.slice(patternMatch.consumed);
      continue;
    }

    const plainMatch = consumePlainText(remaining, key);
    nodes.push(plainMatch.node);
    remaining = remaining.slice(plainMatch.consumed);
  }

  return nodes;
}

function segmentKey(segment: ParsedSegment, index: number): string {
  return `${segment.type}-${index}-${segment.content.slice(0, 32)}`;
}

function renderSegment(segment: ParsedSegment, index: number): React.ReactNode {
  switch (segment.type) {
    case "code-block":
      return (
        <pre
          className="overflow-x-auto rounded-md border bg-muted/50 p-3 font-mono text-xs"
          key={segmentKey(segment, index)}
        >
          <code>{segment.content}</code>
        </pre>
      );

    case "heading": {
      const HeadingTag = `h${segment.level}` as
        | "h1"
        | "h2"
        | "h3"
        | "h4"
        | "h5"
        | "h6";
      const headingClasses = {
        h1: "text-xl font-bold mt-4 mb-2",
        h2: "text-lg font-semibold mt-3 mb-2",
        h3: "text-base font-semibold mt-2 mb-1",
        h4: "text-sm font-semibold mt-2 mb-1",
        h5: "text-sm font-medium mt-1 mb-1",
        h6: "text-xs font-medium mt-1 mb-1",
      };
      return (
        <HeadingTag
          className={headingClasses[HeadingTag]}
          key={segmentKey(segment, index)}
        >
          {renderInlineMarkdown(segment.content)}
        </HeadingTag>
      );
    }

    case "text":
      return (
        <p className="leading-relaxed" key={segmentKey(segment, index)}>
          {renderInlineMarkdown(segment.content)}
        </p>
      );

    default:
      return null;
  }
}

const AgentMarkdown = forwardRef<HTMLDivElement, AgentMarkdownProps>(
  ({ className, size, content, ...props }, ref) => {
    const segments = useMemo(() => parseMarkdown(content), [content]);

    return (
      <div
        className={cn(
          agentMarkdownVariants({ size }),
          "space-y-2 text-foreground",
          className
        )}
        ref={ref}
        {...props}
      >
        {segments.map((segment, index) => renderSegment(segment, index))}
      </div>
    );
  }
);
AgentMarkdown.displayName = "AgentMarkdown";

export { AgentMarkdown, agentMarkdownVariants };
export type { AgentMarkdownProps };
