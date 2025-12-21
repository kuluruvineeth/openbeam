"use client";

import { Streamdown } from "streamdown";
import { cn } from "@/lib/utils";

type MarkdownProps = {
  content: string;
  className?: string;
};

export function Markdown({ content, className }: MarkdownProps) {
  return (
    <article className={cn("prose-openplane", className)}>
      <Streamdown
        components={{
          h1: ({ children }) => (
            <h1 className="mb-4 border-border border-b pb-2 font-semibold text-2xl text-foreground">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-8 mb-3 border-border border-b pb-2 font-semibold text-foreground text-xl">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-6 mb-2 font-semibold text-foreground text-lg">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="mt-4 mb-2 font-semibold text-base text-foreground">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="mb-4 text-foreground/80 text-sm leading-relaxed">
              {children}
            </p>
          ),
          a: ({ href, children }) => (
            <a
              className="text-openplane-blue hover:underline"
              href={href}
              rel="noopener noreferrer"
              target="_blank"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="mb-4 list-disc space-y-1 pl-6 text-foreground/80 text-sm">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-4 list-decimal space-y-1 pl-6 text-foreground/80 text-sm">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="mb-4 border-border border-l-4 pl-4 text-foreground/60 italic">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-8 border-border" />,
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded border border-border">
              <table className="w-full border-collapse text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-background-200">{children}</thead>
          ),
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => (
            <tr className="border-border border-b last:border-b-0">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2 text-left font-semibold text-foreground text-xs">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 text-foreground/80 text-xs">{children}</td>
          ),
        }}
        shikiTheme={["github-light", "github-dark"]}
      >
        {content}
      </Streamdown>
    </article>
  );
}
