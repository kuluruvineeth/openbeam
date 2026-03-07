"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { type ComponentProps, forwardRef, type ReactNode } from "react";
import type { BundledTheme } from "shiki";
import { Streamdown } from "streamdown";
import { cn } from "../utils/cn";

type ComponentWithChildren = { children?: ReactNode };
type LinkComponentProps = { href?: string; children?: ReactNode };

type MarkdownComponents = {
  h1?: (props: ComponentWithChildren) => ReactNode;
  h2?: (props: ComponentWithChildren) => ReactNode;
  h3?: (props: ComponentWithChildren) => ReactNode;
  h4?: (props: ComponentWithChildren) => ReactNode;
  h5?: (props: ComponentWithChildren) => ReactNode;
  h6?: (props: ComponentWithChildren) => ReactNode;
  p?: (props: ComponentWithChildren) => ReactNode;
  a?: (props: LinkComponentProps) => ReactNode;
  ul?: (props: ComponentWithChildren) => ReactNode;
  ol?: (props: ComponentWithChildren) => ReactNode;
  li?: (props: ComponentWithChildren) => ReactNode;
  blockquote?: (props: ComponentWithChildren) => ReactNode;
  hr?: () => ReactNode;
  table?: (props: ComponentWithChildren) => ReactNode;
  thead?: (props: ComponentWithChildren) => ReactNode;
  tbody?: (props: ComponentWithChildren) => ReactNode;
  tr?: (props: ComponentWithChildren) => ReactNode;
  th?: (props: ComponentWithChildren) => ReactNode;
  td?: (props: ComponentWithChildren) => ReactNode;
  strong?: (props: ComponentWithChildren) => ReactNode;
  em?: (props: ComponentWithChildren) => ReactNode;
  code?: (props: ComponentWithChildren) => ReactNode;
};

const markdownVariants = cva("", {
  variants: {
    variant: {
      default: "prose-openbeam",
      compact: "prose-openbeam-compact",
      agent: "prose-openbeam-agent",
    },
    size: {
      sm: "[&_li]:text-xs [&_p]:text-xs [&_td]:text-xs [&_th]:text-xs",
      md: "[&_li]:text-sm [&_p]:text-sm [&_td]:text-sm [&_th]:text-sm",
      lg: "[&_li]:text-base [&_p]:text-base [&_td]:text-base [&_th]:text-base",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "md",
  },
});

const defaultComponents: MarkdownComponents = {
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
  h5: ({ children }) => (
    <h5 className="mt-3 mb-1 font-semibold text-foreground text-sm">
      {children}
    </h5>
  ),
  h6: ({ children }) => (
    <h6 className="mt-2 mb-1 font-medium text-foreground text-sm">
      {children}
    </h6>
  ),
  p: ({ children }) => (
    <p className="mb-4 text-foreground/80 leading-relaxed">{children}</p>
  ),
  a: ({ href, children }) => (
    <a
      className="text-primary underline underline-offset-2 hover:text-primary/80"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul className="mb-4 list-disc space-y-1 pl-6 text-foreground/80">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-4 list-decimal space-y-1 pl-6 text-foreground/80">
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
      <table className="w-full border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr className="border-border border-b last:border-b-0">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-4 py-2 text-left font-semibold text-foreground text-xs">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-2 text-foreground/80">{children}</td>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  code: ({ children }) => (
    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em]">
      {children}
    </code>
  ),
};

const compactComponents: MarkdownComponents = {
  ...defaultComponents,
  h1: ({ children }) => (
    <h1 className="mb-2 font-semibold text-foreground text-lg">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-4 mb-2 font-semibold text-base text-foreground">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-3 mb-1 font-semibold text-foreground text-sm">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="mt-2 mb-1 font-semibold text-foreground text-sm">
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="mb-2 text-foreground/80 leading-relaxed">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-2 list-disc space-y-0.5 pl-5 text-foreground/80">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 list-decimal space-y-0.5 pl-5 text-foreground/80">
      {children}
    </ol>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-2 border-border border-l-2 pl-3 text-foreground/60 italic">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-border" />,
};

const agentComponents: MarkdownComponents = {
  ...compactComponents,
  p: ({ children }) => (
    <p className="mb-3 text-foreground/90 leading-relaxed">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-3 list-disc space-y-1 pl-5 text-foreground/90">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 list-decimal space-y-1 pl-5 text-foreground/90">
      {children}
    </ol>
  ),
  code: ({ children }) => (
    <code className="rounded bg-primary/10 px-1 py-0.5 font-mono text-[0.85em] text-primary">
      {children}
    </code>
  ),
};

type MarkdownVariant = "default" | "compact" | "agent";

function getBaseComponents(
  variant: MarkdownVariant | null | undefined
): MarkdownComponents {
  if (variant === "compact") {
    return compactComponents;
  }
  if (variant === "agent") {
    return agentComponents;
  }
  return defaultComponents;
}

type MarkdownProps = Omit<ComponentProps<"article">, "children"> &
  VariantProps<typeof markdownVariants> & {
    content: string;
    components?: Partial<MarkdownComponents>;
    shikiTheme?: [BundledTheme, BundledTheme];
    showControls?: boolean;
  };

const Markdown = forwardRef<HTMLElement, MarkdownProps>(
  (
    {
      content,
      className,
      variant,
      size,
      components,
      shikiTheme = ["github-light", "github-dark"],
      showControls = true,
      ...props
    },
    ref
  ) => {
    const baseComponents = getBaseComponents(variant);

    const mergedComponents = components
      ? { ...baseComponents, ...components }
      : baseComponents;

    return (
      <article
        className={cn(markdownVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      >
        <Streamdown
          components={mergedComponents as Record<string, unknown>}
          controls={showControls ? { code: true, table: true } : false}
          shikiTheme={shikiTheme}
        >
          {content}
        </Streamdown>
      </article>
    );
  }
);
Markdown.displayName = "Markdown";

export { Markdown, markdownVariants };
export type { MarkdownComponents, MarkdownProps };
