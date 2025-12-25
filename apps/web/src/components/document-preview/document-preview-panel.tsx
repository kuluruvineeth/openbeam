"use client";

import { useQuery } from "@tanstack/react-query";
import { useHotkeys } from "react-hotkeys-hook";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/ui/markdown";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTRPC } from "@/trpc/client";

// Types mirror SerializedBlock/SerializedRichText from @openplane/services
interface SerializedRichText {
  text: string;
  href?: string;
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  code?: boolean;
}

interface SerializedBlock {
  id: string;
  type: string;
  depth: number;
  data: {
    richText?: SerializedRichText[];
    checked?: boolean;
    language?: string;
    url?: string;
    title?: string;
    icon?: string;
  };
}

function richTextToMarkdown(segments: SerializedRichText[]): string {
  return segments
    .map((s) => {
      let text = s.text;
      if (s.code) {
        text = `\`${text}\``;
      }
      if (s.bold) {
        text = `**${text}**`;
      }
      if (s.italic) {
        text = `*${text}*`;
      }
      if (s.strikethrough) {
        text = `~~${text}~~`;
      }
      if (s.href) {
        text = `[${text}](${s.href})`;
      }
      return text;
    })
    .join("");
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: block type switch requires many cases
function blocksToMarkdown(blocks: SerializedBlock[]): string {
  const lines: string[] = [];

  for (const block of blocks) {
    const indent = "  ".repeat(block.depth);
    const text = block.data.richText
      ? richTextToMarkdown(block.data.richText)
      : "";

    switch (block.type) {
      case "heading_1":
        lines.push(`# ${text}`);
        break;
      case "heading_2":
        lines.push(`## ${text}`);
        break;
      case "heading_3":
        lines.push(`### ${text}`);
        break;
      case "paragraph":
        lines.push(text || "");
        break;
      case "bulleted_list_item":
        lines.push(`${indent}- ${text}`);
        break;
      case "numbered_list_item":
        lines.push(`${indent}1. ${text}`);
        break;
      case "to_do":
        lines.push(`${indent}- [${block.data.checked ? "x" : " "}] ${text}`);
        break;
      case "quote":
        lines.push(`> ${text}`);
        break;
      case "callout":
        lines.push(`> ${block.data.icon ?? ""} ${text}`);
        break;
      case "code":
        lines.push(`\`\`\`${block.data.language ?? ""}\n${text}\n\`\`\``);
        break;
      case "divider":
        lines.push("---");
        break;
      case "bookmark":
      case "embed":
      case "link_preview":
        if (block.data.url) {
          lines.push(`[${block.data.url}](${block.data.url})`);
        }
        break;
      case "image":
        if (block.data.url) {
          lines.push(`![](${block.data.url})`);
        }
        break;
      case "child_page":
      case "child_database":
        lines.push(`${block.data.title ?? "Untitled"}`);
        break;
      default:
        if (text) {
          lines.push(text);
        }
    }
  }

  return lines.join("\n\n");
}

type DocumentPreviewPanelProps = {
  documentId: string;
  onClose: () => void;
};

export function DocumentPreviewPanel({
  documentId,
  onClose,
}: DocumentPreviewPanelProps) {
  const trpc = useTRPC();

  const { data: document, isLoading } = useQuery({
    ...trpc.messages.getDocument.queryOptions({ documentId }),
    staleTime: 5 * 60 * 1000,
  });

  useHotkeys("escape", onClose);

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center gap-3 border-border/50 border-b px-4 py-3">
          <Skeleton className="size-8" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="flex-1 space-y-3 p-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center gap-3 border-border/50 border-b px-4 py-3">
          <div className="flex size-8 items-center justify-center rounded bg-muted">
            <Icons.FileIcon className="size-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground text-sm">Not found</p>
          </div>
          <Button
            className="size-8"
            onClick={onClose}
            size="icon"
            variant="ghost"
          >
            <Icons.Close className="size-4 text-muted-foreground" />
          </Button>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <p className="text-muted-foreground text-sm">
            Could not load document
          </p>
        </div>
      </div>
    );
  }

  const metadata = document.metadata as Record<string, unknown> | undefined;
  const icon = (metadata?.icon as string | undefined) ?? "";
  const blocks = metadata?.blocks as SerializedBlock[] | undefined;
  const content = blocks?.length
    ? blocksToMarkdown(blocks)
    : (document.content ?? "");

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <div className="flex shrink-0 items-center gap-3 border-border/50 border-b px-4 py-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded bg-muted">
          {icon ? (
            <span className="text-base">{icon}</span>
          ) : (
            <Icons.FileIcon className="size-4 text-muted-foreground" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground text-sm">
            {document.title ?? "Untitled"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {document.documentType === "database"
              ? "Notion Database"
              : "Notion Page"}
          </p>
        </div>

        <TooltipProvider>
          <div className="flex shrink-0 items-center gap-1">
            {document.url && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="size-8"
                    onClick={() =>
                      window.open(document.url, "_blank", "noopener,noreferrer")
                    }
                    size="icon"
                    variant="ghost"
                  >
                    <Icons.ExternalLink className="size-4 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">Open in Notion</p>
                </TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="size-8"
                  onClick={onClose}
                  size="icon"
                  variant="ghost"
                >
                  <Icons.Close className="size-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">
                  Close <kbd className="ml-1 text-[10px] opacity-50">Esc</kbd>
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <Markdown content={content} />
      </div>
    </div>
  );
}
