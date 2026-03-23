import { describe, expect, it } from "bun:test";
import type { MiroTransformContext } from "@openbeam/types/services/connectors/miro";
import type { MiroBoard } from "../api/boards";
import type { MiroItem } from "../api/items";
import { transformMiroBoard } from "../transformers/board";
import { transformMiroItem } from "../transformers/item";
import { extractItemContent, stripHtml } from "../transformers/utils";

const CONTEXT: MiroTransformContext = {
  connectorId: "conn_miro_123",
  connectorType: "MIRO",
  teamId: "team_456",
  workspaceId: "ws_789",
};

const SAMPLE_BOARD: MiroBoard = {
  id: "uXjVNxyz123",
  name: "Sprint Retro - Q1 2026",
  description: "Retrospective board for the Q1 sprint cycle",
  createdAt: "2026-03-01T10:00:00Z",
  modifiedAt: "2026-03-15T14:30:00Z",
  createdBy: { id: "user_1", type: "user", name: "Alice Kim" },
  modifiedBy: { id: "user_2", type: "user", name: "Bob Chen" },
  owner: { id: "user_1", type: "user", name: "Alice Kim" },
  viewLink: "https://miro.com/app/board/uXjVNxyz123/",
  team: { id: "team_miro_1", name: "Engineering" },
};

const SAMPLE_STICKY_NOTE: MiroItem = {
  id: "item_sticky_1",
  type: "sticky_note",
  createdAt: "2026-03-02T09:00:00Z",
  modifiedAt: "2026-03-02T09:15:00Z",
  createdBy: { id: "user_1", type: "user", name: "Alice Kim" },
  modifiedBy: { id: "user_1", type: "user", name: "Alice Kim" },
  data: {
    content: "<p>We should improve our CI/CD pipeline</p>",
    shape: "square",
  },
  position: { x: 100, y: 200 },
  geometry: { width: 200, height: 200 },
};

const SAMPLE_CARD: MiroItem = {
  id: "item_card_1",
  type: "card",
  createdAt: "2026-03-03T11:00:00Z",
  modifiedAt: "2026-03-03T11:30:00Z",
  createdBy: { id: "user_2", type: "user", name: "Bob Chen" },
  modifiedBy: { id: "user_2", type: "user", name: "Bob Chen" },
  data: {
    title: "Migrate to Temporal",
    description: "Move background jobs from BullMQ to Temporal for durability",
    fields: [
      { value: "High", tooltip: "Priority" },
      { value: "In Progress", tooltip: "Status" },
    ],
  },
  position: { x: 400, y: 300 },
};

const SAMPLE_TEXT: MiroItem = {
  id: "item_text_1",
  type: "text",
  createdAt: "2026-03-04T08:00:00Z",
  modifiedAt: "2026-03-04T08:00:00Z",
  createdBy: { id: "user_1", type: "user", name: "Alice Kim" },
  modifiedBy: { id: "user_1", type: "user", name: "Alice Kim" },
  data: { content: "<p><strong>Action Items</strong></p>" },
};

const SAMPLE_FRAME: MiroItem = {
  id: "item_frame_1",
  type: "frame",
  createdAt: "2026-03-01T10:05:00Z",
  modifiedAt: "2026-03-01T10:05:00Z",
  createdBy: { id: "user_1", type: "user", name: "Alice Kim" },
  modifiedBy: { id: "user_1", type: "user", name: "Alice Kim" },
  data: { title: "What went well" },
  geometry: { width: 800, height: 600 },
};

describe("transformMiroBoard", () => {
  it("transforms a board to GenericDocument", () => {
    const doc = transformMiroBoard(SAMPLE_BOARD, CONTEXT);

    expect(doc.id).toBe("conn_miro_123_board_uXjVNxyz123");
    expect(doc.connector_id).toBe("conn_miro_123");
    expect(doc.connector_type).toBe("MIRO");
    expect(doc.team_id).toBe("team_456");
    expect(doc.document_type).toBe("document");
    expect(doc.document_subtype).toBe("whiteboard");
    expect(doc.title).toBe("Sprint Retro - Q1 2026");
    expect(doc.content).toContain("Retrospective board");
    expect(doc.content).toContain("Alice Kim");
    expect(doc.url).toBe("https://miro.com/app/board/uXjVNxyz123/");
    expect(doc.author_name).toBe("Alice Kim");
    expect(doc.external_id).toBe("uXjVNxyz123");
    expect(doc.metadata?.boardId).toBe("uXjVNxyz123");
    expect(doc.metadata?.ownerName).toBe("Alice Kim");
    expect(doc.metadata?.teamName).toBe("Engineering");
  });

  it("handles board without description", () => {
    const board = { ...SAMPLE_BOARD, description: "" };
    const doc = transformMiroBoard(board, CONTEXT);

    expect(doc.content).toContain("Alice Kim");
  });

  it("sets created_at and updated_at timestamps", () => {
    const doc = transformMiroBoard(SAMPLE_BOARD, CONTEXT);

    expect(doc.created_at).toBe(new Date("2026-03-01T10:00:00Z").getTime());
    expect(doc.updated_at).toBe(new Date("2026-03-15T14:30:00Z").getTime());
  });
});

describe("transformMiroItem", () => {
  it("transforms a sticky note", () => {
    const doc = transformMiroItem(
      SAMPLE_STICKY_NOTE,
      "uXjVNxyz123",
      "Sprint Retro",
      CONTEXT
    );

    expect(doc.id).toBe("conn_miro_123_item_item_sticky_1");
    expect(doc.document_type).toBe("page");
    expect(doc.document_subtype).toBe("sticky_note");
    expect(doc.content).toContain("CI/CD pipeline");
    expect(doc.author_name).toBe("Alice Kim");
    expect(doc.metadata?.itemType).toBe("sticky_note");
    expect(doc.metadata?.boardId).toBe("uXjVNxyz123");
    expect(doc.metadata?.boardName).toBe("Sprint Retro");
    expect(doc.metadata?.shape).toBe("square");
  });

  it("transforms a card with title and fields", () => {
    const doc = transformMiroItem(
      SAMPLE_CARD,
      "uXjVNxyz123",
      "Sprint Retro",
      CONTEXT
    );

    expect(doc.title).toBe("Migrate to Temporal");
    expect(doc.document_subtype).toBe("card");
    expect(doc.content).toContain("Migrate to Temporal");
    expect(doc.content).toContain("Move background jobs");
    expect(doc.content).toContain("High");
    expect(doc.content).toContain("In Progress");
    expect(doc.author_name).toBe("Bob Chen");
  });

  it("transforms a text item", () => {
    const doc = transformMiroItem(
      SAMPLE_TEXT,
      "uXjVNxyz123",
      "Sprint Retro",
      CONTEXT
    );

    expect(doc.document_subtype).toBe("text");
    expect(doc.content).toContain("Action Items");
  });

  it("transforms a frame", () => {
    const doc = transformMiroItem(
      SAMPLE_FRAME,
      "uXjVNxyz123",
      "Sprint Retro",
      CONTEXT
    );

    expect(doc.document_subtype).toBe("frame");
    expect(doc.title).toBe("What went well");
  });

  it("uses fallback title when content has no title", () => {
    const item: MiroItem = {
      ...SAMPLE_STICKY_NOTE,
      data: { content: "<p>Short note</p>" },
    };
    const doc = transformMiroItem(item, "board1", "My Board", CONTEXT);

    expect(doc.title).toBe("Short note");
  });

  it("falls back to type + board name when no content", () => {
    const item: MiroItem = {
      ...SAMPLE_STICKY_NOTE,
      data: {},
    };
    const doc = transformMiroItem(item, "board1", "My Board", CONTEXT);

    expect(doc.title).toBe("sticky_note on My Board");
  });
});

describe("utils", () => {
  it("strips HTML tags", () => {
    expect(stripHtml("<p>Hello <b>world</b></p>")).toBe("Hello world");
    expect(stripHtml("<ul><li>item</li></ul>")).toBe("item");
    expect(stripHtml("plain text")).toBe("plain text");
  });

  it("extracts content from item data", () => {
    const content = extractItemContent({
      content: "<p>Note content</p>",
      title: "My Title",
      description: "A description",
      fields: [{ value: "High" }, { value: "Done" }],
    });

    expect(content).toContain("Note content");
    expect(content).toContain("My Title");
    expect(content).toContain("A description");
    expect(content).toContain("High");
    expect(content).toContain("Done");
  });

  it("handles empty data gracefully", () => {
    const content = extractItemContent({});
    expect(content).toBe("");
  });
});
