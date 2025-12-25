import type { NotionRichText } from "../types";

export function richTextToPlainText(richText: NotionRichText[]): string {
  return richText.map((rt) => rt.plain_text).join("");
}

export function richTextToMarkdown(richText: NotionRichText[]): string {
  return richText
    .map((rt) => {
      let text = rt.plain_text;

      if (rt.annotations.code) {
        text = `\`${text}\``;
      }
      if (rt.annotations.bold) {
        text = `**${text}**`;
      }
      if (rt.annotations.italic) {
        text = `*${text}*`;
      }
      if (rt.annotations.strikethrough) {
        text = `~~${text}~~`;
      }
      if (rt.href) {
        text = `[${text}](${rt.href})`;
      }

      return text;
    })
    .join("");
}

export function extractMentionIds(richText: NotionRichText[]): {
  userIds: string[];
  pageIds: string[];
  databaseIds: string[];
} {
  const userIds: string[] = [];
  const pageIds: string[] = [];
  const databaseIds: string[] = [];

  for (const rt of richText) {
    if (rt.type !== "mention") {
      continue;
    }

    const mention = rt.mention;
    switch (mention.type) {
      case "user":
        userIds.push(mention.user.id);
        break;
      case "page":
        pageIds.push(mention.page.id);
        break;
      case "database":
        databaseIds.push(mention.database.id);
        break;
      default:
        break;
    }
  }

  return { userIds, pageIds, databaseIds };
}

export function extractUrls(richText: NotionRichText[]): string[] {
  const urls: string[] = [];

  for (const rt of richText) {
    if (rt.href) {
      urls.push(rt.href);
    }

    if (
      rt.type === "text" &&
      rt.text.link?.url &&
      !urls.includes(rt.text.link.url)
    ) {
      urls.push(rt.text.link.url);
    }

    if (rt.type === "mention" && rt.mention.type === "link_preview") {
      urls.push(rt.mention.link_preview.url);
    }
  }

  return urls;
}

export function hasAnnotations(richText: NotionRichText[]): boolean {
  return richText.some(
    (rt) =>
      rt.annotations.bold ||
      rt.annotations.italic ||
      rt.annotations.strikethrough ||
      rt.annotations.underline ||
      rt.annotations.code ||
      rt.annotations.color !== "default"
  );
}

export function createTextRichText(content: string): Array<{
  type: "text";
  text: { content: string };
}> {
  return [{ type: "text", text: { content } }];
}
