import { describe, expect, it } from "bun:test";
import type {
  SlackBlock,
  SlackChannel,
  SlackMessage,
} from "@openbeam/types/services/connectors/slack";
import { type MessageTransformContext, transformMessage } from "../message";

const BASE_CONTEXT: MessageTransformContext = {
  connectorId: "conn_test",
  connectorType: "SLACK",
  teamId: "team_test",
  workspaceId: "T12345",
  channel: {
    id: "C12345",
    name: "general",
    is_private: false,
  } as SlackChannel,
};

function makeMessage(overrides: Partial<SlackMessage> = {}): SlackMessage {
  return {
    ts: "1700000000.000001",
    ...overrides,
  };
}

describe("transformMessage content extraction", () => {
  it("uses message.text when present", async () => {
    const doc = await transformMessage(
      makeMessage({ text: "Hello world" }),
      BASE_CONTEXT
    );

    expect(doc.content).toBe("Hello world");
  });

  it("extracts content from rich_text blocks when text is empty", async () => {
    const blocks: SlackBlock[] = [
      {
        type: "rich_text",
        elements: [
          {
            type: "rich_text_section",
            elements: [{ type: "text", text: "Block content here" }],
          },
        ],
      },
    ];

    const doc = await transformMessage(
      makeMessage({ text: "", blocks }),
      BASE_CONTEXT
    );

    expect(doc.content).toBe("Block content here");
  });

  it("extracts content from rich_text blocks when text is undefined", async () => {
    const blocks: SlackBlock[] = [
      {
        type: "rich_text",
        elements: [
          {
            type: "rich_text_section",
            elements: [
              { type: "text", text: "From blocks" },
              { type: "text", text: " with more" },
            ],
          },
        ],
      },
    ];

    const doc = await transformMessage(makeMessage({ blocks }), BASE_CONTEXT);

    expect(doc.content).toBe("From blocks with more");
  });

  it("extracts content from section blocks", async () => {
    const blocks: SlackBlock[] = [
      {
        type: "section",
        text: { type: "mrkdwn", text: "Section text content" },
      },
    ];

    const doc = await transformMessage(makeMessage({ blocks }), BASE_CONTEXT);

    expect(doc.content).toBe("Section text content");
  });

  it("extracts content from header blocks", async () => {
    const blocks: SlackBlock[] = [
      {
        type: "header",
        text: { type: "plain_text", text: "Header title" },
      },
    ];

    const doc = await transformMessage(makeMessage({ blocks }), BASE_CONTEXT);

    expect(doc.content).toBe("Header title");
  });

  it("extracts content from context blocks", async () => {
    const blocks: SlackBlock[] = [
      {
        type: "context",
        elements: [{ type: "mrkdwn", text: "Context info" }],
      },
    ];

    const doc = await transformMessage(makeMessage({ blocks }), BASE_CONTEXT);

    expect(doc.content).toBe("Context info");
  });

  it("handles rich_text with links and emoji", async () => {
    const blocks: SlackBlock[] = [
      {
        type: "rich_text",
        elements: [
          {
            type: "rich_text_section",
            elements: [
              { type: "text", text: "Check " },
              { type: "link", url: "https://example.com", text: "this link" },
              { type: "text", text: " " },
              { type: "emoji", name: "rocket" },
            ],
          },
        ],
      },
    ];

    const doc = await transformMessage(makeMessage({ blocks }), BASE_CONTEXT);

    expect(doc.content).toBe("Check this link :rocket:");
  });

  it("handles rich_text with user and channel mentions", async () => {
    const blocks: SlackBlock[] = [
      {
        type: "rich_text",
        elements: [
          {
            type: "rich_text_section",
            elements: [
              { type: "text", text: "Hey " },
              { type: "user", user_id: "U12345" },
              { type: "text", text: " check " },
              { type: "channel", channel_id: "C99999" },
            ],
          },
        ],
      },
    ];

    const doc = await transformMessage(makeMessage({ blocks }), BASE_CONTEXT);

    expect(doc.content).toBe("Hey @U12345 check #C99999");
  });

  it("falls back to attachments when blocks and text are empty", async () => {
    const doc = await transformMessage(
      makeMessage({
        attachments: [
          { text: "Attachment content", fallback: "fallback text" },
        ],
      }),
      BASE_CONTEXT
    );

    expect(doc.content).toBe("Attachment content");
  });

  it("uses attachment fallback when text is missing", async () => {
    const doc = await transformMessage(
      makeMessage({
        attachments: [{ fallback: "Fallback content" }],
      }),
      BASE_CONTEXT
    );

    expect(doc.content).toBe("Fallback content");
  });

  it("falls back to file names when no text/blocks/attachments", async () => {
    const doc = await transformMessage(
      makeMessage({
        files: [
          {
            id: "F1",
            name: "report.pdf",
            mimetype: "application/pdf",
            title: "Q4 Report",
          },
        ],
      }),
      BASE_CONTEXT
    );

    expect(doc.content).toBe("Shared: Q4 Report");
  });

  it("returns empty string when message has no extractable content", async () => {
    const doc = await transformMessage(makeMessage({}), BASE_CONTEXT);

    expect(doc.content).toBe("");
  });

  it("extracts from rich_text_quote blocks", async () => {
    const blocks: SlackBlock[] = [
      {
        type: "rich_text",
        elements: [
          {
            type: "rich_text_quote",
            elements: [{ type: "text", text: "Quoted text here" }],
          },
        ],
      },
    ];

    const doc = await transformMessage(makeMessage({ blocks }), BASE_CONTEXT);

    expect(doc.content).toBe("Quoted text here");
  });

  it("extracts from rich_text_preformatted blocks", async () => {
    const blocks: SlackBlock[] = [
      {
        type: "rich_text",
        elements: [
          {
            type: "rich_text_preformatted",
            elements: [{ type: "text", text: "const x = 42;" }],
          },
        ],
      },
    ];

    const doc = await transformMessage(makeMessage({ blocks }), BASE_CONTEXT);

    expect(doc.content).toBe("const x = 42;");
  });

  it("combines multiple blocks", async () => {
    const blocks: SlackBlock[] = [
      {
        type: "header",
        text: { type: "plain_text", text: "Important Update" },
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: "Details about the update" },
      },
    ];

    const doc = await transformMessage(makeMessage({ blocks }), BASE_CONTEXT);

    expect(doc.content).toBe("Important Update\nDetails about the update");
  });

  it("prefers text over blocks when text is whitespace-only", async () => {
    const blocks: SlackBlock[] = [
      {
        type: "rich_text",
        elements: [
          {
            type: "rich_text_section",
            elements: [{ type: "text", text: "Block content" }],
          },
        ],
      },
    ];

    const doc = await transformMessage(
      makeMessage({ text: "   ", blocks }),
      BASE_CONTEXT
    );

    expect(doc.content).toBe("Block content");
  });
});

describe("transformMessage title generation", () => {
  it("uses content preview in title", async () => {
    const doc = await transformMessage(
      makeMessage({ text: "Deploying v2.5 to production tonight" }),
      BASE_CONTEXT
    );

    expect(doc.title).toContain("#general:");
    expect(doc.title).toContain("Deploying v2.5 to production tonight");
  });

  it("includes thread suffix for thread parents", async () => {
    const doc = await transformMessage(
      makeMessage({
        text: "Discussion topic",
        thread_ts: "1700000000.000001",
        reply_count: 5,
      }),
      BASE_CONTEXT
    );

    expect(doc.title).toContain("#general thread:");
    expect(doc.title).toContain("Discussion topic");
  });

  it("omits thread suffix for replies", async () => {
    const doc = await transformMessage(
      makeMessage({
        text: "Reply text here",
        thread_ts: "1699999999.000000",
      }),
      BASE_CONTEXT
    );

    expect(doc.title).toStartWith("#general:");
    expect(doc.title).toContain("Reply text here");
  });

  it("truncates long content in title", async () => {
    const longText = "A".repeat(200);

    const doc = await transformMessage(
      makeMessage({ text: longText }),
      BASE_CONTEXT
    );

    expect(doc.title.length).toBeLessThanOrEqual(120);
    expect(doc.title).toContain("…");
  });

  it("falls back to channel name when no content", async () => {
    const doc = await transformMessage(makeMessage({}), BASE_CONTEXT);

    expect(doc.title).toBe("#general");
  });

  it("uses file name in title when only files present", async () => {
    const doc = await transformMessage(
      makeMessage({
        files: [{ id: "F1", name: "image.png", mimetype: "image/png" }],
      }),
      BASE_CONTEXT
    );

    expect(doc.title).toContain("#general:");
    expect(doc.title).toContain("image.png");
  });

  it("cleans Slack markup from title", async () => {
    const doc = await transformMessage(
      makeMessage({ text: "Hey <@U12345> check <#C99999|dev>" }),
      BASE_CONTEXT
    );

    expect(doc.title).not.toContain("<@U12345>");
    expect(doc.title).toContain("@user");
    expect(doc.title).toContain("#dev");
  });
});
