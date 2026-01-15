import type {
  NotionBlock,
  NotionComment,
  NotionDatabase,
  NotionPage,
  NotionParent,
  NotionRichText,
} from "@openplane/types/services/connectors/notion";
import type { BlockWithDepth } from "../api/blocks";
import { richTextToPlainText } from "./rich-text";

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: comprehensive block type handling is inherently complex
export function extractBlockText(block: NotionBlock): string | null {
  const blockType = block.type;
  const blockData = block[blockType] as Record<string, unknown> | undefined;

  if (!blockData) {
    return null;
  }

  const richText = blockData.rich_text as NotionRichText[] | undefined;

  switch (blockType) {
    case "paragraph":
    case "heading_1":
    case "heading_2":
    case "heading_3":
    case "quote":
    case "callout":
    case "toggle":
      return richText ? richTextToPlainText(richText) : null;

    case "bulleted_list_item":
    case "numbered_list_item":
      return richText ? `• ${richTextToPlainText(richText)}` : null;

    case "to_do": {
      const checked = (blockData.checked as boolean) ? "[x]" : "[ ]";
      return richText ? `${checked} ${richTextToPlainText(richText)}` : null;
    }

    case "code": {
      const language = (blockData.language as string) ?? "";
      const code = richText ? richTextToPlainText(richText) : "";
      return `\`\`\`${language}\n${code}\n\`\`\``;
    }

    case "equation":
      return (blockData.expression as string) ?? null;

    case "divider":
      return "---";

    case "table_of_contents":
      return "[Table of Contents]";

    case "breadcrumb":
      return "[Breadcrumb]";

    case "image":
    case "video":
    case "file":
    case "pdf": {
      const caption = blockData.caption as NotionRichText[] | undefined;
      const captionText = caption ? richTextToPlainText(caption) : "";
      return captionText || `[${blockType}]`;
    }

    case "bookmark":
    case "embed":
    case "link_preview": {
      const url = (blockData.url as string) ?? "";
      const caption = blockData.caption as NotionRichText[] | undefined;
      const captionText = caption ? richTextToPlainText(caption) : "";
      return captionText || url || `[${blockType}]`;
    }

    case "child_page":
      return `[Page: ${(blockData.title as string) ?? "Untitled"}]`;

    case "child_database":
      return `[Database: ${(blockData.title as string) ?? "Untitled"}]`;

    case "synced_block":
    case "column_list":
    case "column":
    case "table":
    case "table_row":
      return null;

    default:
      return null;
  }
}

export function blocksToText(blocks: BlockWithDepth[]): string {
  const lines: string[] = [];

  for (const block of blocks) {
    const text = extractBlockText(block);
    if (text) {
      const indent = "  ".repeat(block.depth);
      lines.push(`${indent}${text}`);
    }
  }

  return lines.join("\n");
}

export function extractPageTitle(page: NotionPage): string {
  const properties = page.properties as Record<
    string,
    { type: string; title?: NotionRichText[] }
  >;

  for (const [, prop] of Object.entries(properties)) {
    if (prop.type === "title" && prop.title) {
      return richTextToPlainText(prop.title);
    }
  }

  return "Untitled";
}

export function extractDatabaseTitle(database: NotionDatabase): string {
  return richTextToPlainText(database.title);
}

export function extractDatabaseDescription(database: NotionDatabase): string {
  return richTextToPlainText(database.description);
}

export function extractCommentText(comment: NotionComment): string {
  return richTextToPlainText(comment.rich_text);
}

export function commentsToText(comments: NotionComment[]): string {
  return comments.map((c) => extractCommentText(c)).join("\n");
}

export function getParentId(parent: NotionParent): string | undefined {
  switch (parent.type) {
    case "page_id":
      return parent.page_id;
    case "database_id":
      return parent.database_id;
    case "block_id":
      return parent.block_id;
    default:
      return;
  }
}

export function getParentType(
  parent: NotionParent
): "page" | "database" | "block" | "workspace" {
  switch (parent.type) {
    case "page_id":
      return "page";
    case "database_id":
      return "database";
    case "block_id":
      return "block";
    case "workspace":
      return "workspace";
    default:
      return "workspace";
  }
}

export function getCreatedAtMs(item: { created_time: string }): number {
  return new Date(item.created_time).getTime();
}

export function getModifiedAtMs(item: { last_edited_time: string }): number {
  return new Date(item.last_edited_time).getTime();
}

export function getAuthorId(item: { created_by: { id: string } }): string {
  return item.created_by.id;
}

export function getLastEditorId(item: {
  last_edited_by: { id: string };
}): string {
  return item.last_edited_by.id;
}

export function getIconEmoji(item: {
  icon: { type: string; emoji?: string } | null;
}): string | undefined {
  if (item.icon?.type === "emoji") {
    return item.icon.emoji;
  }
  return;
}

export function getCoverUrl(item: {
  cover: {
    type: string;
    external?: { url: string };
    file?: { url: string };
  } | null;
}): string | undefined {
  if (!item.cover) {
    return;
  }

  switch (item.cover.type) {
    case "external":
      return item.cover.external?.url;
    case "file":
      return item.cover.file?.url;
    default:
      return;
  }
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Notion has many property types requiring individual handling
export function extractPropertyValue(
  property: Record<string, unknown>
): string | undefined {
  const type = property.type as string;
  const data = property[type] as unknown;

  switch (type) {
    case "title":
    case "rich_text":
      return data ? richTextToPlainText(data as NotionRichText[]) : undefined;

    case "number":
      return data !== null ? String(data) : undefined;

    case "select":
      return (data as { name?: string } | null)?.name;

    case "multi_select":
      return (data as Array<{ name: string }> | null)
        ?.map((s) => s.name)
        .join(", ");

    case "date": {
      const dateData = data as { start?: string; end?: string } | null;
      if (!dateData?.start) {
        return;
      }
      return dateData.end
        ? `${dateData.start} → ${dateData.end}`
        : dateData.start;
    }

    case "checkbox":
      return data ? "true" : "false";

    case "url":
    case "email":
    case "phone_number":
      return data as string | undefined;

    case "formula": {
      const formula = data as {
        type: string;
        string?: string;
        number?: number;
        boolean?: boolean;
      } | null;
      if (!formula) {
        return;
      }
      switch (formula.type) {
        case "string":
          return formula.string ?? undefined;
        case "number":
          return formula.number !== undefined
            ? String(formula.number)
            : undefined;
        case "boolean":
          return formula.boolean !== undefined
            ? String(formula.boolean)
            : undefined;
        default:
          return;
      }
    }

    case "relation":
      return (data as Array<{ id: string }> | null)
        ?.map((r) => r.id)
        .join(", ");

    case "rollup": {
      const rollup = data as { type: string; array?: unknown[] } | null;
      if (rollup?.type === "array" && rollup.array) {
        return `[${rollup.array.length} items]`;
      }
      return;
    }

    case "people":
      return (data as Array<{ id: string; name?: string }> | null)
        ?.map((p) => p.name ?? p.id)
        .join(", ");

    case "files":
      return (data as Array<{ name?: string; file?: { url: string } }> | null)
        ?.map((f) => f.name ?? "file")
        .join(", ");

    case "created_time":
    case "last_edited_time":
      return data as string | undefined;

    case "created_by":
    case "last_edited_by":
      return (data as { id: string; name?: string } | null)?.name;

    case "status":
      return (data as { name?: string } | null)?.name;

    case "unique_id":
      return (data as { number?: number; prefix?: string } | null)?.number !==
        undefined
        ? `${(data as { prefix?: string }).prefix ?? ""}${(data as { number: number }).number}`
        : undefined;

    default:
      return;
  }
}

export function extractAllPropertyValues(
  properties: Record<string, unknown>
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [name, property] of Object.entries(properties)) {
    const value = extractPropertyValue(property as Record<string, unknown>);
    if (value !== undefined) {
      result[name] = value;
    }
  }

  return result;
}
