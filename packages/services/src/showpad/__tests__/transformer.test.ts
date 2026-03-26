import { describe, expect, it } from "bun:test";
import type { ShowpadTransformContext } from "@openbeam/types/services/connectors/showpad";
import type {
  ShowpadAsset,
  ShowpadChannel,
  ShowpadExperience,
  ShowpadTag,
} from "../client";
import { transformShowpadAsset } from "../transformers/asset";
import { transformShowpadChannel } from "../transformers/channel";
import { transformShowpadExperience } from "../transformers/experience";
import { transformShowpadTag } from "../transformers/tag";

const CONTEXT: ShowpadTransformContext = {
  connectorId: "conn_showpad_1",
  connectorType: "SHOWPAD",
  teamId: "team_1",
  workspaceId: "ws_1",
  subdomain: "acme",
};

function makeAsset(overrides: Partial<ShowpadAsset> = {}): ShowpadAsset {
  return {
    id: "asset_abc123",
    name: "Q1 Sales Deck.pptx",
    description: "Quarterly sales presentation for enterprise accounts",
    slug: "q1-sales-deck",
    resourcetype: "presentation",
    expiresAt: null,
    createdAt: "2026-01-10T08:00:00Z",
    updatedAt: "2026-01-15T14:30:00Z",
    isAnnotatable: true,
    isSensitive: false,
    isShareable: true,
    tags: [
      { id: "tag_1", name: "sales" },
      { id: "tag_2", name: "q1" },
    ],
    channels: [{ id: "ch_1", name: "Sales Content" }],
    ...overrides,
  };
}

function makeChannel(overrides: Partial<ShowpadChannel> = {}): ShowpadChannel {
  return {
    id: "ch_xyz789",
    name: "Sales Content",
    description: "All sales-related content for the field team",
    createdAt: "2026-01-05T10:00:00Z",
    updatedAt: "2026-01-20T16:00:00Z",
    assetCount: 42,
    ...overrides,
  };
}

function makeExperience(
  overrides: Partial<ShowpadExperience> = {}
): ShowpadExperience {
  return {
    id: "exp_def456",
    name: "Enterprise Demo Package",
    status: "published",
    createdAt: "2026-02-01T09:00:00Z",
    updatedAt: "2026-02-10T11:00:00Z",
    createdBy: {
      id: "user_1",
      email: "jane@acme.com",
      firstName: "Jane",
      lastName: "Doe",
    },
    ...overrides,
  };
}

function makeTag(overrides: Partial<ShowpadTag> = {}): ShowpadTag {
  return {
    id: "tag_001",
    name: "enterprise",
    ...overrides,
  };
}

describe("transformShowpadAsset", () => {
  it("transforms an asset with all fields", () => {
    const asset = makeAsset();
    const doc = transformShowpadAsset(asset, CONTEXT);

    expect(doc.id).toBe("conn_showpad_1_asset_asset_abc123");
    expect(doc.connector_id).toBe("conn_showpad_1");
    expect(doc.connector_type).toBe("SHOWPAD");
    expect(doc.team_id).toBe("team_1");
    expect(doc.document_type).toBe("presentation");
    expect(doc.document_subtype).toBe("presentation");
    expect(doc.title).toBe("Q1 Sales Deck.pptx");
    expect(doc.url).toBe("https://acme.showpad.biz/#!/asset/asset_abc123");
    expect(doc.is_public).toBe(false);
    expect(doc.metadata?.resourceType).toBe("presentation");
    expect(doc.metadata?.tags).toBe("sales, q1");
    expect(doc.metadata?.channels).toBe("Sales Content");
    expect(doc.metadata?.shareable).toBe(true);
  });

  it("maps video type to file", () => {
    const asset = makeAsset({ resourcetype: "video" });
    const doc = transformShowpadAsset(asset, CONTEXT);
    expect(doc.document_type).toBe("file");
  });

  it("maps image type correctly", () => {
    const asset = makeAsset({ resourcetype: "image" });
    const doc = transformShowpadAsset(asset, CONTEXT);
    expect(doc.document_type).toBe("image");
  });

  it("maps unknown type to document", () => {
    const asset = makeAsset({ resourcetype: "other" });
    const doc = transformShowpadAsset(asset, CONTEXT);
    expect(doc.document_type).toBe("document");
  });

  it("handles sensitive asset", () => {
    const asset = makeAsset({ isSensitive: true });
    const doc = transformShowpadAsset(asset, CONTEXT);
    expect(doc.metadata?.sensitive).toBe(true);
  });

  it("handles empty tags and channels", () => {
    const asset = makeAsset({ tags: [], channels: [] });
    const doc = transformShowpadAsset(asset, CONTEXT);
    expect(doc.metadata?.tags).toBeUndefined();
    expect(doc.metadata?.channels).toBeUndefined();
  });

  it("includes description in content", () => {
    const asset = makeAsset();
    const doc = transformShowpadAsset(asset, CONTEXT);
    expect(doc.content).toContain(
      "Quarterly sales presentation for enterprise accounts"
    );
  });

  it("includes expiration date in metadata", () => {
    const asset = makeAsset({ expiresAt: "2026-06-30T00:00:00Z" });
    const doc = transformShowpadAsset(asset, CONTEXT);
    expect(doc.metadata?.expiresAt).toBe("2026-06-30T00:00:00Z");
  });
});

describe("transformShowpadChannel", () => {
  it("transforms a channel with all fields", () => {
    const channel = makeChannel();
    const doc = transformShowpadChannel(channel, CONTEXT);

    expect(doc.id).toBe("conn_showpad_1_channel_ch_xyz789");
    expect(doc.connector_id).toBe("conn_showpad_1");
    expect(doc.document_type).toBe("channel");
    expect(doc.title).toBe("Sales Content");
    expect(doc.url).toBe("https://acme.showpad.biz/#!/channel/ch_xyz789");
    expect(doc.is_public).toBe(false);
    expect(doc.metadata?.assetCount).toBe(42);
  });

  it("includes description in content", () => {
    const channel = makeChannel();
    const doc = transformShowpadChannel(channel, CONTEXT);
    expect(doc.content).toContain(
      "All sales-related content for the field team"
    );
  });

  it("handles zero asset count", () => {
    const channel = makeChannel({ assetCount: 0 });
    const doc = transformShowpadChannel(channel, CONTEXT);
    expect(doc.metadata?.assetCount).toBeUndefined();
  });
});

describe("transformShowpadExperience", () => {
  it("transforms an experience with all fields", () => {
    const experience = makeExperience();
    const doc = transformShowpadExperience(experience, CONTEXT);

    expect(doc.id).toBe("conn_showpad_1_experience_exp_def456");
    expect(doc.connector_id).toBe("conn_showpad_1");
    expect(doc.document_type).toBe("presentation");
    expect(doc.document_subtype).toBe("experience");
    expect(doc.title).toBe("Enterprise Demo Package");
    expect(doc.url).toBe("https://acme.showpad.biz/#!/experience/exp_def456");
    expect(doc.author_name).toBe("Jane Doe");
    expect(doc.metadata?.status).toBe("published");
    expect(doc.metadata?.createdByEmail).toBe("jane@acme.com");
  });

  it("handles experience without creator", () => {
    const experience = makeExperience({ createdBy: null });
    const doc = transformShowpadExperience(experience, CONTEXT);
    expect(doc.author_name).toBeUndefined();
    expect(doc.metadata?.createdByEmail).toBeUndefined();
  });

  it("includes status in content", () => {
    const experience = makeExperience();
    const doc = transformShowpadExperience(experience, CONTEXT);
    expect(doc.content).toContain("published");
  });
});

describe("transformShowpadTag", () => {
  it("transforms a tag with all fields", () => {
    const tag = makeTag();
    const doc = transformShowpadTag(tag, CONTEXT);

    expect(doc.id).toBe("conn_showpad_1_tag_tag_001");
    expect(doc.connector_id).toBe("conn_showpad_1");
    expect(doc.document_type).toBe("unknown");
    expect(doc.document_subtype).toBe("tag");
    expect(doc.title).toBe("enterprise");
    expect(doc.content).toBe("enterprise");
    expect(doc.url).toContain("tags=enterprise");
  });
});
