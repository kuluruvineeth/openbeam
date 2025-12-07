"use client";

import { useCallback, useEffect, useState } from "react";
import { Icons } from "@/components/icons";
import { highlight } from "@/lib/shiki";
import { cn } from "@/lib/utils";

const LANG_REGEX = /language-(\w+)/;

function extractText(node: React.ReactNode): string {
  if (typeof node === "string") {
    return node;
  }
  if (!node) {
    return "";
  }
  const child = Array.isArray(node) ? node[0] : node;
  if (typeof child === "object" && child !== null && "props" in child) {
    return extractText(
      (child.props as { children?: React.ReactNode }).children
    );
  }
  return "";
}

type CopyButtonProps = {
  content: string;
  className?: string;
};

export function CopyButton({ content, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    if (!content) {
      return;
    }
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  return (
    <button
      className={cn(
        "flex items-center gap-1.5 rounded border border-border/50 bg-background-300 px-2 py-1 font-mono text-[10px] text-foreground/60 transition-colors hover:bg-background-400 hover:text-foreground",
        copied && "text-openplane-green",
        className
      )}
      onClick={copy}
      type="button"
    >
      {copied ? (
        <>
          <Icons.Check size={12} />
          Copied
        </>
      ) : (
        <>
          <Icons.Copy size={12} />
          Copy
        </>
      )}
    </button>
  );
}

type InlineCodeProps = {
  children: React.ReactNode;
  className?: string;
};

export function InlineCode({ children, className }: InlineCodeProps) {
  return (
    <code
      className={cn(
        "rounded bg-background-300 px-1.5 py-0.5 font-mono text-[0.85em] text-foreground/90",
        className
      )}
    >
      {children}
    </code>
  );
}

type CodeBlockWrapperProps = {
  children: React.ReactNode;
  className?: string;
};

export function CodeBlockWrapper({
  children,
  className,
}: CodeBlockWrapperProps) {
  return (
    <div className={cn("group relative my-4", className)}>
      <CopyButton
        className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100"
        content={extractText(children)}
      />
      <pre className="overflow-x-auto rounded border border-border/50 bg-code p-4 font-mono text-xs leading-relaxed">
        {children}
      </pre>
    </div>
  );
}

type SyntaxHighlightedCodeProps = {
  children?: React.ReactNode;
  className?: string;
};

export function SyntaxHighlightedCode({
  children,
  className,
}: SyntaxHighlightedCodeProps) {
  const [html, setHtml] = useState<string | null>(null);
  const lang = LANG_REGEX.exec(className ?? "")?.[1];
  const code = typeof children === "string" ? children.trim() : "";

  useEffect(() => {
    if (!(lang && code)) {
      return;
    }
    highlight(code, lang).then(setHtml);
  }, [code, lang]);

  if (html) {
    return (
      <code
        className="shiki-wrapper block text-code-foreground"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Shiki output is trusted
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return <code className="text-code-foreground">{children}</code>;
}

type HighlightedCodeBlockProps = {
  code: string;
  language?: string;
  showCopy?: boolean;
  className?: string;
};

export function HighlightedCodeBlock({
  code,
  language,
  showCopy = true,
  className,
}: HighlightedCodeBlockProps) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    if (!language) {
      return;
    }
    highlight(code, language).then(setHtml);
  }, [code, language]);

  return (
    <div className={cn("group relative", className)}>
      {showCopy && (
        <CopyButton
          className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100"
          content={code}
        />
      )}
      <pre className="overflow-x-auto rounded border border-border/50 bg-code p-4 font-mono text-code-foreground text-xs leading-relaxed">
        {html ? (
          <code
            className="shiki-wrapper"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: Shiki output is trusted
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <code>{code}</code>
        )}
      </pre>
    </div>
  );
}
