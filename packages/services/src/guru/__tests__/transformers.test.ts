import { describe, expect, it } from "bun:test";
import type { GuruTransformContext } from "@openbeam/types/services/connectors/guru";
import type { GuruCard } from "../transformers/card";
import { transformCard } from "../transformers/card";
import type { GuruCollection } from "../transformers/collection";
import { transformCollection } from "../transformers/collection";
import type { GuruFolder } from "../transformers/folder";
import { transformFolder } from "../transformers/folder";
import { stripHtml } from "../transformers/utils";

const CONTEXT: GuruTransformContext = {
  connectorId: "conn_guru_123",
  connectorType: "GURU",
  teamId: "team_456",
  workspaceId: "ws_789",
};

describe("stripHtml", () => {
  it("removes HTML tags", () => {
    expect(stripHtml("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });

  it("handles empty string", () => {
    expect(stripHtml("")).toBe("");
  });

  it("decodes common HTML entities", () => {
    expect(stripHtml("&amp; &lt; &gt; &quot; &#39;")).toBe("& < > \" '");
  });

  it("strips script and style tags with content", () => {
    const html =
      '<p>Keep</p><script>alert("x")</script><style>.hide{}</style><p>this</p>';
    expect(stripHtml(html)).toBe("Keep this");
  });
});

describe("transformCard", () => {
  const baseCard: GuruCard = {
    id: "card-1",
    preferredPhrase: "How to deploy",
    content: "<p>Step 1: Build the project</p>",
    slug: "how-to-deploy",
    verificationState: "TRUSTED",
    dateCreated: "2025-01-15T10:00:00Z",
    lastModified: "2025-06-20T14:30:00Z",
    owner: {
      id: "user-1",
      email: "alice@company.com",
      firstName: "Alice",
      lastName: "Smith",
    },
    collection: {
      id: "col-1",
      name: "Engineering",
    },
    tags: [
      { id: "tag-1", value: "deployment" },
      { id: "tag-2", value: "devops" },
    ],
  };

  it("produces a valid GenericDocument", async () => {
    const doc = await transformCard(baseCard, CONTEXT);

    expect(doc.id).toBe("conn_guru_123_card_card-1");
    expect(doc.document_type).toBe("card");
    expect(doc.title).toBe("How to deploy");
    expect(doc.connector_id).toBe("conn_guru_123");
    expect(doc.team_id).toBe("team_456");
    expect(doc.external_id).toBe("card-1");
    expect(doc.url).toBe("https://app.getguru.com/card/how-to-deploy");
    expect(doc.author_name).toBe("Alice Smith");
    expect(doc.author_email).toBe("alice@company.com");
    expect(doc.checksum).toBeDefined();
  });

  it("includes collection and tags in content", async () => {
    const doc = await transformCard(baseCard, CONTEXT);
    expect(doc.content).toContain("Step 1: Build the project");
    expect(doc.content).toContain("Collection: Engineering");
    expect(doc.content).toContain("Tags: deployment, devops");
  });

  it("populates metadata correctly", async () => {
    const doc = await transformCard(baseCard, CONTEXT);
    expect(doc.metadata?.collectionId).toBe("col-1");
    expect(doc.metadata?.collectionName).toBe("Engineering");
    expect(doc.metadata?.verificationState).toBe("TRUSTED");
    expect(doc.metadata?.tags).toBe("deployment, devops");
    expect(doc.metadata?.slug).toBe("how-to-deploy");
  });

  it("falls back to card ID for URL without slug", async () => {
    const noSlugCard = { ...baseCard, slug: undefined };
    const doc = await transformCard(noSlugCard, CONTEXT);
    expect(doc.url).toBe("https://app.getguru.com/card/card-1");
  });

  it("handles card without owner", async () => {
    const noOwnerCard = { ...baseCard, owner: undefined };
    const doc = await transformCard(noOwnerCard, CONTEXT);
    expect(doc.author_name).toBeUndefined();
    expect(doc.author_email).toBeUndefined();
  });

  it("sets verification state as document_subtype", async () => {
    const doc = await transformCard(baseCard, CONTEXT);
    expect(doc.document_subtype).toBe("TRUSTED");
  });
});

describe("transformCollection", () => {
  const baseCollection: GuruCollection = {
    id: "col-1",
    name: "Engineering",
    description: "All engineering knowledge",
    color: "#3b82f6",
    slug: "engineering",
    dateCreated: "2024-01-01T00:00:00Z",
    lastModified: "2025-06-01T00:00:00Z",
  };

  it("produces a valid GenericDocument", async () => {
    const doc = await transformCollection(baseCollection, CONTEXT);

    expect(doc.id).toBe("conn_guru_123_collection_col-1");
    expect(doc.document_type).toBe("collection");
    expect(doc.title).toBe("Engineering");
    expect(doc.content).toContain("All engineering knowledge");
    expect(doc.url).toBe("https://app.getguru.com/collections/engineering");
    expect(doc.metadata?.color).toBe("#3b82f6");
  });
});

describe("transformFolder", () => {
  const baseFolder: GuruFolder = {
    id: "folder-1",
    title: "Runbooks",
    description: "Operational runbooks",
    cardCount: 12,
    folderCount: 3,
    collection: {
      id: "col-1",
      name: "Engineering",
    },
  };

  it("produces a valid GenericDocument", async () => {
    const doc = await transformFolder(baseFolder, CONTEXT);

    expect(doc.id).toBe("conn_guru_123_folder_folder-1");
    expect(doc.document_type).toBe("folder");
    expect(doc.title).toBe("Runbooks");
    expect(doc.content).toContain("Operational runbooks");
    expect(doc.content).toContain("Collection: Engineering");
    expect(doc.content).toContain("Cards: 12");
    expect(doc.metadata?.cardCount).toBe(12);
    expect(doc.metadata?.folderCount).toBe(3);
    expect(doc.metadata?.collectionName).toBe("Engineering");
  });
});
