import type { BlockWithDepth } from "../api/blocks";
import type { NotionRichText } from "../types";

export interface SerializedBlock {
  id: string;
  type: string;
  depth: number;
  data: SerializedBlockData;
}

export interface SerializedBlockData {
  richText?: SerializedRichText[];
  checked?: boolean;
  language?: string;
  expression?: string;
  url?: string;
  caption?: SerializedRichText[];
  title?: string;
  color?: string;
  icon?: string;
}

export interface SerializedRichText {
  text: string;
  href?: string;
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  underline?: boolean;
  code?: boolean;
  color?: string;
}

function serializeRichText(richText: NotionRichText[]): SerializedRichText[] {
  return richText.map((rt) => {
    const result: SerializedRichText = { text: rt.plain_text };

    if (rt.href) {
      result.href = rt.href;
    }
    if (rt.annotations.bold) {
      result.bold = true;
    }
    if (rt.annotations.italic) {
      result.italic = true;
    }
    if (rt.annotations.strikethrough) {
      result.strikethrough = true;
    }
    if (rt.annotations.underline) {
      result.underline = true;
    }
    if (rt.annotations.code) {
      result.code = true;
    }
    if (rt.annotations.color !== "default") {
      result.color = rt.annotations.color;
    }

    return result;
  });
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: block type extraction requires handling many cases
function extractBlockData(block: BlockWithDepth): SerializedBlockData {
  const blockType = block.type;
  const blockData = block[blockType] as Record<string, unknown> | undefined;

  if (!blockData) {
    return {};
  }

  const data: SerializedBlockData = {};
  const richText = blockData.rich_text as NotionRichText[] | undefined;

  if (richText?.length) {
    data.richText = serializeRichText(richText);
  }

  switch (blockType) {
    case "to_do":
      if (typeof blockData.checked === "boolean") {
        data.checked = blockData.checked;
      }
      break;

    case "code":
      if (typeof blockData.language === "string") {
        data.language = blockData.language;
      }
      break;

    case "equation":
      if (typeof blockData.expression === "string") {
        data.expression = blockData.expression;
      }
      break;

    case "bookmark":
    case "embed":
    case "link_preview":
      if (typeof blockData.url === "string") {
        data.url = blockData.url;
      }
      break;

    case "image":
    case "video":
    case "file":
    case "pdf": {
      const fileData = blockData as {
        type: string;
        external?: { url: string };
        file?: { url: string };
        caption?: NotionRichText[];
      };
      if (fileData.type === "external" && fileData.external?.url) {
        data.url = fileData.external.url;
      } else if (fileData.type === "file" && fileData.file?.url) {
        data.url = fileData.file.url;
      }
      if (fileData.caption?.length) {
        data.caption = serializeRichText(fileData.caption);
      }
      break;
    }

    case "child_page":
    case "child_database":
      if (typeof blockData.title === "string") {
        data.title = blockData.title;
      }
      break;

    case "callout": {
      const calloutData = blockData as {
        color?: string;
        icon?: { type: string; emoji?: string };
      };
      if (calloutData.color) {
        data.color = calloutData.color;
      }
      if (calloutData.icon?.type === "emoji" && calloutData.icon.emoji) {
        data.icon = calloutData.icon.emoji;
      }
      break;
    }

    case "heading_1":
    case "heading_2":
    case "heading_3":
    case "toggle": {
      const toggleableData = blockData as { color?: string };
      if (toggleableData.color && toggleableData.color !== "default") {
        data.color = toggleableData.color;
      }
      break;
    }

    case "quote":
    case "paragraph":
    case "bulleted_list_item":
    case "numbered_list_item": {
      const coloredData = blockData as { color?: string };
      if (coloredData.color && coloredData.color !== "default") {
        data.color = coloredData.color;
      }
      break;
    }

    default:
      break;
  }

  return data;
}

export function serializeBlocks(blocks: BlockWithDepth[]): SerializedBlock[] {
  return blocks.map((block) => ({
    id: block.id,
    type: block.type,
    depth: block.depth,
    data: extractBlockData(block),
  }));
}

export function serializedRichTextToMarkdown(
  segments: SerializedRichText[]
): string {
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
export function serializedBlocksToMarkdown(blocks: SerializedBlock[]): string {
  const lines: string[] = [];

  for (const block of blocks) {
    const indent = "  ".repeat(block.depth);
    const text = block.data.richText
      ? serializedRichTextToMarkdown(block.data.richText)
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
