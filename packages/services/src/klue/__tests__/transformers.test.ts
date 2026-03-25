import { describe, expect, test } from "bun:test";
import type { KlueTransformContext } from "@openbeam/types/services/connectors/klue";
import type { KlueBattlecard } from "../api/battlecards";
import type { KlueBoard } from "../api/boards";
import type { KlueCompetitor } from "../api/competitors";
import type { KlueIntel } from "../api/intel";
import { transformBattlecard } from "../transformers/battlecard";
import { transformBoard } from "../transformers/board";
import { transformCompetitor } from "../transformers/competitor";
import { transformIntel } from "../transformers/intel";
import { stripHtml } from "../transformers/utils";

const context: KlueTransformContext = {
  connectorId: "conn_test_123",
  connectorType: "klue",
  teamId: "team_test",
  workspaceId: "ws_test",
};

describe("stripHtml", () => {
  test("removes HTML tags", () => {
    expect(stripHtml("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });

  test("normalizes whitespace", () => {
    expect(stripHtml("<p>Hello</p>  <p>World</p>")).toBe("Hello World");
  });

  test("handles empty string", () => {
    expect(stripHtml("")).toBe("");
  });
});

describe("transformCompetitor", () => {
  const competitor: KlueCompetitor = {
    id: "comp_1",
    name: "Acme Corp",
    description: "<p>A major competitor in the market</p>",
    website: "https://acme.com",
    status: "active",
    win_rate: 0.65,
    tags: ["enterprise", "saas"],
    owner: { id: "u1", name: "Jane Doe", email: "jane@example.com" },
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-06-20T14:30:00Z",
  };

  test("generates correct document ID", async () => {
    const doc = await transformCompetitor(competitor, context);
    expect(doc.id).toBe("conn_test_123_competitor_comp_1");
  });

  test("sets correct document type", async () => {
    const doc = await transformCompetitor(competitor, context);
    expect(doc.document_type).toBe("competitor");
    expect(doc.source_type).toBe("klue");
  });

  test("includes win rate in metadata", async () => {
    const doc = await transformCompetitor(competitor, context);
    expect(doc.metadata?.winRate).toBe("65");
  });

  test("strips HTML from description", async () => {
    const doc = await transformCompetitor(competitor, context);
    expect(doc.content).toContain("A major competitor in the market");
    expect(doc.content).not.toContain("<p>");
  });

  test("includes owner as author", async () => {
    const doc = await transformCompetitor(competitor, context);
    expect(doc.author_name).toBe("Jane Doe");
    expect(doc.author_email).toBe("jane@example.com");
  });

  test("includes tags in metadata", async () => {
    const doc = await transformCompetitor(competitor, context);
    expect(doc.metadata?.tags).toBe("enterprise, saas");
  });
});

describe("transformBattlecard", () => {
  const battlecard: KlueBattlecard = {
    id: "bc_1",
    title: "Acme Corp Battlecard",
    content: "<p>Key differentiators and objection handling</p>",
    competitor_id: "comp_1",
    competitor_name: "Acme Corp",
    status: "published",
    card_type: "compete",
    last_reviewed_at: "2024-06-01T12:00:00Z",
    last_reviewed_by: { id: "u1", name: "John Smith" },
    tags: ["enterprise"],
    created_at: "2024-02-10T10:00:00Z",
    updated_at: "2024-06-01T12:00:00Z",
  };

  test("generates correct document ID", async () => {
    const doc = await transformBattlecard(battlecard, context);
    expect(doc.id).toBe("conn_test_123_battlecard_bc_1");
  });

  test("includes competitor in metadata", async () => {
    const doc = await transformBattlecard(battlecard, context);
    expect(doc.metadata?.competitorName).toBe("Acme Corp");
    expect(doc.metadata?.cardType).toBe("compete");
  });

  test("includes reviewer attribution", async () => {
    const doc = await transformBattlecard(battlecard, context);
    expect(doc.metadata?.lastReviewedBy).toBe("John Smith");
  });
});

describe("transformIntel", () => {
  const intel: KlueIntel = {
    id: "intel_1",
    title: "Acme Corp Raises Series C",
    content: "<p>Acme Corp announced a $50M Series C round</p>",
    source: "News",
    source_url: "https://news.example.com/acme-series-c",
    competitor_ids: ["comp_1"],
    competitor_names: ["Acme Corp"],
    intel_type: "funding",
    tags: ["funding", "enterprise"],
    submitted_by: { id: "u2", name: "Alice", email: "alice@example.com" },
    created_at: "2024-06-15T09:00:00Z",
    updated_at: "2024-06-15T09:00:00Z",
  };

  test("generates correct document ID", async () => {
    const doc = await transformIntel(intel, context);
    expect(doc.id).toBe("conn_test_123_intel_intel_1");
  });

  test("uses source_url as document URL", async () => {
    const doc = await transformIntel(intel, context);
    expect(doc.url).toBe("https://news.example.com/acme-series-c");
  });

  test("includes competitor names in metadata", async () => {
    const doc = await transformIntel(intel, context);
    expect(doc.metadata?.competitors).toBe("Acme Corp");
  });

  test("includes submitter as author", async () => {
    const doc = await transformIntel(intel, context);
    expect(doc.author_name).toBe("Alice");
    expect(doc.author_email).toBe("alice@example.com");
  });
});

describe("transformBoard", () => {
  const board: KlueBoard = {
    id: "board_1",
    name: "Enterprise Competitors",
    description: "Tracking enterprise-segment competitors",
    card_count: 12,
    owner: { id: "u1", name: "Jane Doe" },
    created_at: "2024-03-01T10:00:00Z",
    updated_at: "2024-06-10T08:00:00Z",
  };

  test("generates correct document ID", async () => {
    const doc = await transformBoard(board, context);
    expect(doc.id).toBe("conn_test_123_board_board_1");
  });

  test("includes card count in metadata", async () => {
    const doc = await transformBoard(board, context);
    expect(doc.metadata?.cardCount).toBe("12");
  });

  test("includes owner as author", async () => {
    const doc = await transformBoard(board, context);
    expect(doc.author_name).toBe("Jane Doe");
  });
});
