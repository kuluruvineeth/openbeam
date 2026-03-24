import { describe, expect, it } from "bun:test";
import type { BynderTransformContext } from "@openbeam/types/services/connectors/bynder";
import type { BynderAsset, BynderCollection, BynderTag } from "../client";
import { transformBynderAsset } from "../transformers/asset";
import { transformBynderCollection } from "../transformers/collection";
import { transformBynderTag } from "../transformers/tag";

const CONTEXT: BynderTransformContext = {
  connectorId: "conn_bynder_1",
  connectorType: "BYNDER",
  teamId: "team_1",
  workspaceId: "ws_1",
  domain: "acme",
};

function makeAsset(overrides: Partial<BynderAsset> = {}): BynderAsset {
  return {
    id: "asset_abc123",
    name: "hero-banner.jpg",
    description: "Homepage hero banner for Q1 campaign",
    type: "image",
    brandId: "brand_1",
    tags: ["campaign", "hero", "q1"],
    dateCreated: "2026-01-10T08:00:00Z",
    dateModified: "2026-01-15T14:30:00Z",
    datePublished: "2026-01-12T09:00:00Z",
    archive: 0,
    copyright: "Acme Corp 2026",
    watermarked: 0,
    orientation: "landscape",
    width: 1920,
    height: 1080,
    fileSize: 524_288,
    extension: ["jpg"],
    isPublic: 0,
    ...overrides,
  };
}

function makeCollection(
  overrides: Partial<BynderCollection> = {}
): BynderCollection {
  return {
    id: "coll_xyz789",
    name: "Q1 Campaign Assets",
    description: "All assets for the Q1 marketing campaign",
    dateCreated: "2026-01-05T10:00:00Z",
    dateModified: "2026-01-20T16:00:00Z",
    mediaCount: 42,
    link: "https://acme.bynder.com/collections/coll_xyz789/",
    isPublic: false,
    collectionCount: 3,
    ...overrides,
  };
}

function makeTag(overrides: Partial<BynderTag> = {}): BynderTag {
  return {
    id: "tag_001",
    tag: "campaign",
    mediaCount: 150,
    ...overrides,
  };
}

describe("transformBynderAsset", () => {
  it("transforms an asset with all fields", () => {
    const asset = makeAsset();
    const doc = transformBynderAsset(asset, CONTEXT);

    expect(doc.id).toBe("conn_bynder_1_asset_asset_abc123");
    expect(doc.connector_id).toBe("conn_bynder_1");
    expect(doc.connector_type).toBe("BYNDER");
    expect(doc.team_id).toBe("team_1");
    expect(doc.document_type).toBe("image");
    expect(doc.document_subtype).toBe("image");
    expect(doc.title).toBe("hero-banner.jpg");
    expect(doc.url).toBe("https://acme.bynder.com/media/?mediaId=asset_abc123");
    expect(doc.is_public).toBe(false);
    expect(doc.metadata?.assetType).toBe("image");
    expect(doc.metadata?.width).toBe(1920);
    expect(doc.metadata?.height).toBe(1080);
    expect(doc.metadata?.fileSize).toBe(524_288);
    expect(doc.metadata?.tags).toBe("campaign, hero, q1");
    expect(doc.metadata?.copyright).toBe("Acme Corp 2026");
  });

  it("maps video type correctly", () => {
    const asset = makeAsset({ type: "video" });
    const doc = transformBynderAsset(asset, CONTEXT);
    expect(doc.document_type).toBe("video");
  });

  it("maps document type correctly", () => {
    const asset = makeAsset({ type: "document" });
    const doc = transformBynderAsset(asset, CONTEXT);
    expect(doc.document_type).toBe("document");
  });

  it("maps unknown type to asset", () => {
    const asset = makeAsset({ type: "audio" });
    const doc = transformBynderAsset(asset, CONTEXT);
    expect(doc.document_type).toBe("asset");
  });

  it("handles public asset", () => {
    const asset = makeAsset({ isPublic: 1 });
    const doc = transformBynderAsset(asset, CONTEXT);
    expect(doc.is_public).toBe(true);
  });

  it("handles archived asset", () => {
    const asset = makeAsset({ archive: 1 });
    const doc = transformBynderAsset(asset, CONTEXT);
    expect(doc.metadata?.archived).toBe(true);
  });

  it("handles empty tags", () => {
    const asset = makeAsset({ tags: [] });
    const doc = transformBynderAsset(asset, CONTEXT);
    expect(doc.metadata?.tags).toBeUndefined();
  });

  it("includes description in content", () => {
    const asset = makeAsset();
    const doc = transformBynderAsset(asset, CONTEXT);
    expect(doc.content).toContain("Homepage hero banner for Q1 campaign");
  });
});

describe("transformBynderCollection", () => {
  it("transforms a collection with all fields", () => {
    const collection = makeCollection();
    const doc = transformBynderCollection(collection, CONTEXT);

    expect(doc.id).toBe("conn_bynder_1_collection_coll_xyz789");
    expect(doc.connector_id).toBe("conn_bynder_1");
    expect(doc.document_type).toBe("collection");
    expect(doc.title).toBe("Q1 Campaign Assets");
    expect(doc.url).toBe("https://acme.bynder.com/collections/coll_xyz789/");
    expect(doc.is_public).toBe(false);
    expect(doc.metadata?.mediaCount).toBe(42);
    expect(doc.metadata?.collectionCount).toBe(3);
  });

  it("includes description in content", () => {
    const collection = makeCollection();
    const doc = transformBynderCollection(collection, CONTEXT);
    expect(doc.content).toContain("All assets for the Q1 marketing campaign");
  });

  it("handles public collection", () => {
    const collection = makeCollection({ isPublic: true });
    const doc = transformBynderCollection(collection, CONTEXT);
    expect(doc.is_public).toBe(true);
  });
});

describe("transformBynderTag", () => {
  it("transforms a tag with all fields", () => {
    const tag = makeTag();
    const doc = transformBynderTag(tag, CONTEXT);

    expect(doc.id).toBe("conn_bynder_1_tag_tag_001");
    expect(doc.connector_id).toBe("conn_bynder_1");
    expect(doc.document_type).toBe("tag");
    expect(doc.title).toBe("campaign");
    expect(doc.content).toBe("campaign");
    expect(doc.metadata?.mediaCount).toBe(150);
    expect(doc.url).toContain("tags=campaign");
  });

  it("handles tag with zero media count", () => {
    const tag = makeTag({ mediaCount: 0 });
    const doc = transformBynderTag(tag, CONTEXT);
    expect(doc.metadata?.mediaCount).toBeUndefined();
  });
});
