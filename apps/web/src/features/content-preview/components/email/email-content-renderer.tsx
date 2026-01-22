"use client";

import { sanitizeEmailHtml } from "@/lib/html-sanitizer";

type EmailContentRendererProps = {
  content?: string;
  contentHtml?: string;
};

export function EmailContentRenderer({
  content,
  contentHtml,
}: EmailContentRendererProps) {
  if (contentHtml) {
    const sanitized = sanitizeEmailHtml(contentHtml);
    return (
      <div
        className="email-content text-[13px] text-foreground/80 leading-relaxed [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_blockquote]:border-border/50 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_h1]:font-semibold [&_h1]:text-foreground [&_h1]:text-lg [&_h2]:font-semibold [&_h2]:text-base [&_h2]:text-foreground [&_h3]:font-medium [&_h3]:text-foreground [&_h3]:text-sm [&_hr]:my-3 [&_hr]:border-border/30 [&_img]:h-auto [&_img]:max-w-full [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:my-1.5 [&_pre]:bg-muted [&_pre]:p-2 [&_pre]:text-xs [&_table]:border-collapse [&_table]:text-sm [&_ul]:list-disc [&_ul]:pl-4"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Sanitized via DOMPurify
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    );
  }

  if (!content) {
    return null;
  }

  return (
    <div className="whitespace-pre-wrap text-[13px] text-foreground/80 leading-relaxed">
      {content}
    </div>
  );
}
