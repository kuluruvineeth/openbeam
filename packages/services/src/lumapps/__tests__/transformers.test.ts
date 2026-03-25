import { describe, expect, it } from "bun:test";
import type { LumAppsTransformContext } from "@openbeam/types/services/connectors/lumapps";
import type { LumAppsCommunity } from "../api/communities";
import type { LumAppsContent } from "../api/contents";
import type { LumAppsPost } from "../api/posts";
import type { LumAppsSpace } from "../api/spaces";
import { transformCommunity } from "../transformers/community";
import { transformContent } from "../transformers/content";
import { transformPost } from "../transformers/post";
import { transformSpace } from "../transformers/space";
import { stripHtml } from "../transformers/utils";

const context: LumAppsTransformContext = {
  connectorId: "conn_la_123",
  connectorType: "LUMAPPS",
  teamId: "team_456",
  workspaceId: "ws_789",
};

describe("transformContent", () => {
  const content: LumAppsContent = {
    id: "content-abc-123",
    title: "Q1 Company Update",
    slug: "q1-company-update",
    type: "article",
    status: "published",
    excerpt: "Key highlights from Q1 2026",
    content: "<p>Revenue grew 42% year over year.</p>",
    author: {
      id: "user-001",
      email: "ceo@example.com",
      fullName: "Jane Smith",
    },
    space: {
      id: "space-001",
      name: "Company News",
    },
    tags: ["quarterly", "finance"],
    language: "en",
    publicationDate: "2026-03-01T12:00:00Z",
    createdAt: "2026-03-01T10:00:00Z",
    updatedAt: "2026-03-01T12:00:00Z",
  };

  it("produces a valid GenericDocument", async () => {
    const doc = await transformContent(content, context);

    expect(doc.id).toBe("conn_la_123_content_content-abc-123");
    expect(doc.connector_id).toBe("conn_la_123");
    expect(doc.connector_type).toBe("LUMAPPS");
    expect(doc.team_id).toBe("team_456");
    expect(doc.external_id).toBe("content-abc-123");
    expect(doc.document_type).toBe("content");
    expect(doc.document_subtype).toBe("article");
    expect(doc.title).toBe("Q1 Company Update");
    expect(doc.source_type).toBe("lumapps");
    expect(doc.author_name).toBe("Jane Smith");
    expect(doc.checksum).toBeDefined();
  });

  it("includes metadata fields", async () => {
    const doc = await transformContent(content, context);

    expect(doc.metadata).toMatchObject({
      contentId: "content-abc-123",
      contentType: "article",
      status: "published",
      slug: "q1-company-update",
      spaceId: "space-001",
      spaceName: "Company News",
      tags: "quarterly, finance",
      language: "en",
    });
  });

  it("strips HTML from body content", async () => {
    const doc = await transformContent(content, context);
    expect(doc.content).toContain("Revenue grew 42% year over year.");
    expect(doc.content).not.toContain("<p>");
  });

  it("handles minimal content", async () => {
    const minimal: LumAppsContent = {
      id: "content-min",
      title: "Draft",
      type: "page",
      status: "draft",
      createdAt: "2026-03-01T10:00:00Z",
      updatedAt: "2026-03-01T10:00:00Z",
    };

    const doc = await transformContent(minimal, context);
    expect(doc.id).toBe("conn_la_123_content_content-min");
    expect(doc.author_name).toBeUndefined();
    expect(doc.metadata?.tags).toBeUndefined();
  });
});

describe("transformCommunity", () => {
  const community: LumAppsCommunity = {
    id: "comm-xyz-789",
    name: "Engineering",
    description: "Engineering team discussions and updates",
    privacy: "private",
    memberCount: 150,
    createdAt: "2025-01-15T08:00:00Z",
    updatedAt: "2026-03-20T14:00:00Z",
  };

  it("produces a valid GenericDocument", async () => {
    const doc = await transformCommunity(community, context);

    expect(doc.id).toBe("conn_la_123_community_comm-xyz-789");
    expect(doc.document_type).toBe("community");
    expect(doc.document_subtype).toBe("private");
    expect(doc.title).toBe("Engineering");
    expect(doc.source_type).toBe("lumapps");
    expect(doc.checksum).toBeDefined();
  });

  it("includes metadata", async () => {
    const doc = await transformCommunity(community, context);

    expect(doc.metadata).toMatchObject({
      communityId: "comm-xyz-789",
      privacy: "private",
      memberCount: 150,
    });
  });

  it("includes content details", async () => {
    const doc = await transformCommunity(community, context);
    expect(doc.content).toContain("Engineering team discussions");
    expect(doc.content).toContain("Privacy: private");
    expect(doc.content).toContain("Members: 150");
  });
});

describe("transformPost", () => {
  const post: LumAppsPost = {
    id: "post-001",
    content: "<p>Excited to share our new <b>design system</b> launch!</p>",
    author: {
      id: "user-002",
      email: "designer@example.com",
      fullName: "Alex Lee",
    },
    community: {
      id: "comm-xyz-789",
      name: "Engineering",
    },
    reactions: 24,
    comments: 8,
    attachments: [
      { id: "att-001", name: "design-system.pdf", url: "https://..." },
    ],
    createdAt: "2026-03-15T09:00:00Z",
    updatedAt: "2026-03-15T10:00:00Z",
  };

  it("produces a valid GenericDocument", async () => {
    const doc = await transformPost(post, context);

    expect(doc.id).toBe("conn_la_123_post_post-001");
    expect(doc.document_type).toBe("post");
    expect(doc.source_type).toBe("lumapps");
    expect(doc.author_name).toBe("Alex Lee");
    expect(doc.checksum).toBeDefined();
  });

  it("derives title from content", async () => {
    const doc = await transformPost(post, context);
    expect(doc.title).toContain("Excited to share our new design system");
  });

  it("includes metadata", async () => {
    const doc = await transformPost(post, context);

    expect(doc.metadata).toMatchObject({
      postId: "post-001",
      communityId: "comm-xyz-789",
      communityName: "Engineering",
      reactions: 24,
      comments: 8,
      attachmentCount: 1,
    });
  });

  it("strips HTML from content", async () => {
    const doc = await transformPost(post, context);
    expect(doc.content).not.toContain("<p>");
    expect(doc.content).not.toContain("<b>");
    expect(doc.content).toContain("design system");
  });
});

describe("transformSpace", () => {
  const space: LumAppsSpace = {
    id: "space-001",
    name: "Company News",
    description: "Official company-wide announcements",
    visibility: "public",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2026-03-20T00:00:00Z",
  };

  it("produces a valid GenericDocument", async () => {
    const doc = await transformSpace(space, context);

    expect(doc.id).toBe("conn_la_123_space_space-001");
    expect(doc.document_type).toBe("space");
    expect(doc.document_subtype).toBe("public");
    expect(doc.title).toBe("Company News");
    expect(doc.source_type).toBe("lumapps");
    expect(doc.checksum).toBeDefined();
  });

  it("includes metadata", async () => {
    const doc = await transformSpace(space, context);

    expect(doc.metadata).toMatchObject({
      spaceId: "space-001",
      visibility: "public",
    });
  });

  it("includes content details", async () => {
    const doc = await transformSpace(space, context);
    expect(doc.content).toContain("Official company-wide announcements");
    expect(doc.content).toContain("Visibility: public");
  });
});

describe("stripHtml", () => {
  it("removes HTML tags", () => {
    expect(stripHtml("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });

  it("decodes HTML entities", () => {
    expect(stripHtml("Tom &amp; Jerry")).toBe("Tom & Jerry");
    expect(stripHtml("a &lt; b &gt; c")).toBe("a < b > c");
  });

  it("normalizes whitespace", () => {
    expect(stripHtml("<p>  multiple   spaces  </p>")).toBe("multiple spaces");
  });

  it("handles empty string", () => {
    expect(stripHtml("")).toBe("");
  });
});
