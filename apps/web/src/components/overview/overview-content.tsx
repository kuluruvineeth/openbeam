"use client";

import { Fragment, memo, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/ui/markdown";
import type { OverviewCitation } from "@/lib/overview-types";
import { cn } from "@/lib/utils";

type OverviewContentProps = {
  content: string;
  isStreaming?: boolean;
  className?: string;
  citations?: OverviewCitation[];
  onCitationClick?: (citation: OverviewCitation) => void;
};

const NUMBERED_LIST_PATTERN = /^\d+\.\s/;
const HEADING_HASH_PATTERN = /^#+/;
const HEADING_REPLACE_PATTERN = /^#+\s*/;
const BULLET_REPLACE_PATTERN = /^[-*]\s+/;
const NUMBERED_REPLACE_PATTERN = /^\d+\.\s+/;
const BOLD_AND_CITATION_PATTERN = /(\*\*[^*]+\*\*|\[\d+\])/g;

const HEADING_CLASSES: Record<number, string> = {
  1: "mb-2 font-semibold text-foreground text-lg",
  2: "mb-2 mt-4 font-semibold text-foreground text-base",
  3: "mb-1.5 mt-3 font-semibold text-foreground text-sm",
  4: "mb-1 mt-2 font-medium text-foreground text-sm",
  5: "mb-1 mt-2 font-medium text-foreground text-sm",
  6: "mb-1 mt-2 font-medium text-foreground text-sm",
};

function CitationButton({
  index,
  citation,
  onClick,
}: {
  index: number;
  citation?: OverviewCitation;
  onClick?: (citation: OverviewCitation) => void;
}) {
  const handleClick = useCallback(() => {
    if (citation && onClick) {
      onClick(citation);
    }
  }, [citation, onClick]);

  const isInteractive = citation && onClick;

  if (!isInteractive) {
    return (
      <span className="mx-0.5 font-medium text-muted-foreground text-xs">
        [{index}]
      </span>
    );
  }

  return (
    <Button
      className="mx-0.5 h-auto px-1 py-0 font-medium text-primary text-xs hover:underline"
      onClick={handleClick}
      title={citation.title}
      variant="ghost"
    >
      [{index}]
    </Button>
  );
}

function renderBoldAndCitations(
  text: string,
  citationMap: Map<number, OverviewCitation>,
  onCitationClick?: (citation: OverviewCitation) => void
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  BOLD_AND_CITATION_PATTERN.lastIndex = 0;

  let lastIndex = 0;
  let match: RegExpExecArray | null = BOLD_AND_CITATION_PATTERN.exec(text);
  let keyIndex = 0;

  while (match !== null) {
    if (match.index > lastIndex) {
      const key = `text-${keyIndex}`;
      keyIndex += 1;
      nodes.push(
        <Fragment key={key}>{text.slice(lastIndex, match.index)}</Fragment>
      );
    }

    const matchedText = match[0];

    if (matchedText.startsWith("**") && matchedText.endsWith("**")) {
      const boldText = matchedText.slice(2, -2);
      const key = `bold-${keyIndex}`;
      keyIndex += 1;
      nodes.push(
        <strong className="font-semibold text-foreground" key={key}>
          {boldText}
        </strong>
      );
    } else if (matchedText.startsWith("[") && matchedText.endsWith("]")) {
      const citationIndex = Number.parseInt(matchedText.slice(1, -1), 10);
      const key = `cite-${keyIndex}`;
      keyIndex += 1;
      nodes.push(
        <CitationButton
          citation={citationMap.get(citationIndex)}
          index={citationIndex}
          key={key}
          onClick={onCitationClick}
        />
      );
    }

    lastIndex = match.index + matchedText.length;
    match = BOLD_AND_CITATION_PATTERN.exec(text);
  }

  if (lastIndex < text.length) {
    const key = `text-${keyIndex}`;
    nodes.push(<Fragment key={key}>{text.slice(lastIndex)}</Fragment>);
  }

  return nodes;
}

function renderLine(
  line: string,
  index: number,
  citationMap: Map<number, OverviewCitation>,
  onCitationClick?: (citation: OverviewCitation) => void
): React.ReactNode {
  const trimmedLine = line.trim();

  if (trimmedLine === "") {
    return <br key={`br-${index}`} />;
  }

  const isBullet = trimmedLine.startsWith("- ") || trimmedLine.startsWith("* ");
  const isNumberedList = NUMBERED_LIST_PATTERN.test(trimmedLine);
  const isHeading = trimmedLine.startsWith("#");

  if (isHeading) {
    const hashMatch = trimmedLine.match(HEADING_HASH_PATTERN);
    const level = hashMatch ? hashMatch[0].length : 1;
    const headingText = trimmedLine.replace(HEADING_REPLACE_PATTERN, "");
    const headingNodes = renderBoldAndCitations(
      headingText,
      citationMap,
      onCitationClick
    );

    const clampedLevel = Math.min(Math.max(level, 1), 6);
    const HeadingTag = `h${clampedLevel}` as
      | "h1"
      | "h2"
      | "h3"
      | "h4"
      | "h5"
      | "h6";

    return (
      <HeadingTag
        className={HEADING_CLASSES[clampedLevel]}
        key={`heading-${index}`}
      >
        {headingNodes}
      </HeadingTag>
    );
  }

  if (isBullet) {
    const bulletText = trimmedLine.replace(BULLET_REPLACE_PATTERN, "");
    const bulletContent = renderBoldAndCitations(
      bulletText,
      citationMap,
      onCitationClick
    );
    return (
      <li
        className="ml-4 text-foreground/80 text-sm leading-relaxed"
        key={`li-${index}`}
      >
        {bulletContent}
      </li>
    );
  }

  if (isNumberedList) {
    const listText = trimmedLine.replace(NUMBERED_REPLACE_PATTERN, "");
    const listContent = renderBoldAndCitations(
      listText,
      citationMap,
      onCitationClick
    );
    return (
      <li
        className="ml-4 list-decimal text-foreground/80 text-sm leading-relaxed"
        key={`li-${index}`}
      >
        {listContent}
      </li>
    );
  }

  const paragraphContent = renderBoldAndCitations(
    trimmedLine,
    citationMap,
    onCitationClick
  );
  return (
    <p
      className="mb-2 text-foreground/80 text-sm leading-relaxed"
      key={`p-${index}`}
    >
      {paragraphContent}
    </p>
  );
}

function OverviewContentInner({
  content,
  isStreaming = false,
  className,
  citations = [],
  onCitationClick,
}: OverviewContentProps) {
  const citationMap = useMemo(() => {
    const map = new Map<number, OverviewCitation>();
    for (const c of citations) {
      map.set(c.index, c);
    }
    return map;
  }, [citations]);

  const hasInteractiveCitations = citations.length > 0 && onCitationClick;

  if (!content) {
    return null;
  }

  if (!hasInteractiveCitations) {
    return (
      <div className={cn("relative", className)}>
        <Markdown
          className={cn(
            "prose-sm max-w-none",
            isStreaming && "animate-pulse-subtle"
          )}
          content={content}
        />
        {isStreaming && (
          <span className="inline-block h-4 w-0.5 animate-blink bg-foreground/60 align-text-bottom" />
        )}
      </div>
    );
  }

  const lines = content.split("\n");
  const filteredLines: Array<{ line: string; index: number }> = [];
  let lastWasEmpty = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    const isEmpty = trimmed === "";

    if (isEmpty && lastWasEmpty) {
      continue;
    }

    filteredLines.push({ line: lines[i], index: i });
    lastWasEmpty = isEmpty;
  }

  const renderedContent = filteredLines.map(({ line, index }) =>
    renderLine(line, index, citationMap, onCitationClick)
  );

  return (
    <div className={cn("relative", className)}>
      <article
        className={cn("max-w-none", isStreaming && "animate-pulse-subtle")}
      >
        {renderedContent}
      </article>
      {isStreaming && (
        <span className="inline-block h-4 w-0.5 animate-blink bg-foreground/60 align-text-bottom" />
      )}
    </div>
  );
}

export const OverviewContent = memo(OverviewContentInner);
OverviewContent.displayName = "OverviewContent";
