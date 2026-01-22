"use client";

import { sanitizeEmailHtml } from "@/lib/html-sanitizer";
import { formatSlackText } from "@/lib/message-format";

type SlackContentRendererProps = {
  content?: string;
  contentHtml?: string;
};

export function SlackContentRenderer({
  content,
  contentHtml,
}: SlackContentRendererProps) {
  if (contentHtml) {
    const sanitized = sanitizeEmailHtml(contentHtml);
    return (
      <div
        className="text-[13px] text-foreground/80 leading-relaxed [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_blockquote]:border-border/50 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_p]:my-1 [&_pre]:overflow-x-auto [&_pre]:bg-muted [&_pre]:p-2 [&_pre]:text-xs"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Sanitized via DOMPurify
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    );
  }

  if (!content) {
    return null;
  }

  const formatted = formatSlackText(content);
  return (
    <div
      className="text-[13px] text-foreground/80 leading-relaxed [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_br]:block [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_pre]:overflow-x-auto [&_pre]:bg-muted [&_pre]:p-2 [&_pre]:text-xs"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: Sanitized via formatSlackText
      dangerouslySetInnerHTML={{ __html: formatted }}
    />
  );
}
