import { describe, expect, it } from "bun:test";
import type { HighspotTransformContext } from "@openbeam/types/services/connectors/highspot";
import { transformHighspotItem } from "../transformers/item";
import { transformHighspotPitch } from "../transformers/pitch";
import { transformHighspotSpot } from "../transformers/spot";

const context: HighspotTransformContext = {
  connectorId: "conn_hs_1",
  connectorType: "HIGHSPOT",
  teamId: "team_1",
  workspaceId: "ws_1",
  domain: "app.highspot.com",
};

describe("transformHighspotItem", () => {
  it("transforms an item with all fields", () => {
    const item = {
      id: "item_42",
      title: "Q4 Sales Deck",
      description: "Updated sales presentation for Q4",
      type: "presentation",
      mime_type: "application/vnd.ms-powerpoint",
      url: "https://app.highspot.com/items/item_42",
      author: { id: "u1", name: "Jane Doe", email: "jane@acme.com" },
      spot_id: "spot_1",
      spot_name: "Sales Materials",
      tags: ["sales", "q4", "competitive"],
      created_at: "2026-01-10T12:00:00Z",
      updated_at: "2026-03-20T14:30:00Z",
      file_size: 5_242_880,
      view_count: 142,
      pitch_count: 8,
    };

    const doc = transformHighspotItem(item, context);

    expect(doc.id).toBe("conn_hs_1_item_item_42");
    expect(doc.document_type).toBe("presentation");
    expect(doc.document_subtype).toBe("presentation");
    expect(doc.title).toBe("Q4 Sales Deck");
    expect(doc.url).toBe("https://app.highspot.com/items/item_42");
    expect(doc.author_name).toBe("Jane Doe");
    expect(doc.author_email).toBe("jane@acme.com");
    expect(doc.metadata?.spotName).toBe("Sales Materials");
    expect(doc.metadata?.tags).toBe("sales, q4, competitive");
    expect(doc.metadata?.viewCount).toBe("142");
    expect(doc.metadata?.pitchCount).toBe("8");
    expect(doc.metadata?.fileSize).toBe("5242880");
  });

  it("classifies video items correctly", () => {
    const item = {
      id: "item_vid",
      title: "Product Demo",
      description: null,
      type: "video",
      mime_type: "video/mp4",
      url: null,
      author: null,
      spot_id: null,
      spot_name: null,
      tags: [],
      created_at: "2026-01-10T12:00:00Z",
      updated_at: "2026-03-20T14:30:00Z",
      file_size: null,
      view_count: null,
      pitch_count: null,
    };

    const doc = transformHighspotItem(item, context);

    expect(doc.document_type).toBe("video");
    expect(doc.url).toBe("https://app.highspot.com/items/item_vid");
  });

  it("classifies documents by default", () => {
    const item = {
      id: "item_doc",
      title: "Pricing Guide",
      description: null,
      type: "pdf",
      mime_type: "application/pdf",
      url: null,
      author: null,
      spot_id: null,
      spot_name: null,
      tags: [],
      created_at: "2026-01-10T12:00:00Z",
      updated_at: "2026-03-20T14:30:00Z",
      file_size: null,
      view_count: null,
      pitch_count: null,
    };

    const doc = transformHighspotItem(item, context);

    expect(doc.document_type).toBe("document");
  });
});

describe("transformHighspotSpot", () => {
  it("transforms a spot with all fields", () => {
    const spot = {
      id: "spot_1",
      name: "Competitive Intelligence",
      description: "Battle cards and competitor analysis",
      owner: { id: "u1", name: "John Sales", email: "john@acme.com" },
      item_count: 47,
      created_at: "2025-11-01T09:00:00Z",
      updated_at: "2026-03-15T16:00:00Z",
      url: "https://app.highspot.com/spots/spot_1",
      visibility: "team",
    };

    const doc = transformHighspotSpot(spot, context);

    expect(doc.id).toBe("conn_hs_1_spot_spot_1");
    expect(doc.document_type).toBe("folder");
    expect(doc.document_subtype).toBe("spot");
    expect(doc.title).toBe("Competitive Intelligence");
    expect(doc.author_name).toBe("John Sales");
    expect(doc.metadata?.itemCount).toBe("47");
    expect(doc.metadata?.visibility).toBe("team");
  });

  it("handles a spot with no description", () => {
    const spot = {
      id: "spot_2",
      name: "Empty Spot",
      description: null,
      owner: null,
      item_count: 0,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      url: null,
      visibility: null,
    };

    const doc = transformHighspotSpot(spot, context);

    expect(doc.id).toBe("conn_hs_1_spot_spot_2");
    expect(doc.title).toBe("Empty Spot");
    expect(doc.author_name).toBeUndefined();
    expect(doc.url).toBe("https://app.highspot.com/spots/spot_2");
  });
});

describe("transformHighspotPitch", () => {
  it("transforms a pitch with all fields", () => {
    const pitch = {
      id: "pitch_99",
      title: "Acme Corp Proposal",
      description: "Q4 deal proposal with pricing",
      sender: { id: "u1", name: "Sarah Rep", email: "sarah@acme.com" },
      recipients: [
        { email: "buyer@acme-client.com", name: "Bob Buyer" },
        { email: "cto@acme-client.com", name: null },
      ],
      items: [
        { id: "item_42", title: "Q4 Sales Deck" },
        { id: "item_43", title: "Pricing Sheet" },
      ],
      status: "sent",
      created_at: "2026-03-18T10:00:00Z",
      updated_at: "2026-03-19T15:00:00Z",
      url: "https://app.highspot.com/pitches/pitch_99",
      view_count: 3,
      opened: true,
    };

    const doc = transformHighspotPitch(pitch, context);

    expect(doc.id).toBe("conn_hs_1_pitch_pitch_99");
    expect(doc.document_type).toBe("document");
    expect(doc.document_subtype).toBe("pitch");
    expect(doc.title).toBe("Acme Corp Proposal");
    expect(doc.author_name).toBe("Sarah Rep");
    expect(doc.author_email).toBe("sarah@acme.com");
    expect(doc.metadata?.status).toBe("sent");
    expect(doc.metadata?.recipientCount).toBe("2");
    expect(doc.metadata?.itemCount).toBe("2");
    expect(doc.metadata?.viewCount).toBe("3");
    expect(doc.metadata?.opened).toBe("true");
    expect(doc.content).toContain("Bob Buyer");
    expect(doc.content).toContain("Q4 Sales Deck");
  });

  it("handles a pitch with no recipients", () => {
    const pitch = {
      id: "pitch_100",
      title: "Draft Pitch",
      description: null,
      sender: null,
      recipients: [],
      items: [],
      status: "draft",
      created_at: "2026-03-20T10:00:00Z",
      updated_at: "2026-03-20T10:00:00Z",
      url: null,
      view_count: null,
      opened: null,
    };

    const doc = transformHighspotPitch(pitch, context);

    expect(doc.id).toBe("conn_hs_1_pitch_pitch_100");
    expect(doc.metadata?.status).toBe("draft");
    expect(doc.metadata?.recipientCount).toBeUndefined();
    expect(doc.author_name).toBeUndefined();
  });
});
