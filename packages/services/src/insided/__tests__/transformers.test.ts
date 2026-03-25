import { describe, expect, it } from "bun:test";
import type { InsidedTransformContext } from "@openbeam/types/services/connectors/insided";
import { transformArticle } from "../transformers/article";
import { transformIdea } from "../transformers/idea";
import { transformPost } from "../transformers/post";

const CONTEXT: InsidedTransformContext = {
  connectorId: "conn_insided_1",
  connectorType: "INSIDED",
  teamId: "team_1",
  workspaceId: "ws_1",
  communityUrl: "https://community.example.com",
};

describe("transformPost", () => {
  it("transforms a community post with all fields", async () => {
    const post = {
      id: "post-1",
      title: "How to configure SSO?",
      content: "I need help setting up SSO for our team",
      content_html: "<p>I need help setting up <b>SSO</b> for our team</p>",
      author: { id: "u-1", name: "Alice" },
      category: { id: "cat-1", name: "General", slug: "general" },
      reply_count: 3,
      reaction_count: 5,
      view_count: 120,
      is_pinned: false,
      is_locked: false,
      status: "open",
      url: "https://community.example.com/posts/post-1",
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-15T00:00:00Z",
    };

    const doc = await transformPost(post, CONTEXT);

    expect(doc.id).toBe("conn_insided_1_post_post-1");
    expect(doc.document_type).toBe("post");
    expect(doc.title).toBe("How to configure SSO?");
    expect(doc.content).toContain("I need help setting up");
    expect(doc.content).toContain("SSO");
    expect(doc.content).toContain("Category: General");
    expect(doc.content).toContain("Author: Alice");
    expect(doc.content).toContain("Replies: 3");
    expect(doc.content).toContain("Reactions: 5");
    expect(doc.content).toContain("Views: 120");
    expect(doc.author_name).toBe("Alice");
    expect(doc.metadata?.category).toBe("General");
    expect(doc.metadata?.replyCount).toBe("3");
    expect(doc.metadata?.viewCount).toBe("120");
    expect(doc.url).toBe("https://community.example.com/posts/post-1");
    expect(doc.source_type).toBe("insided");
    expect(doc.connector_id).toBe("conn_insided_1");
  });

  it("handles post with no replies or reactions", async () => {
    const post = {
      id: "post-2",
      title: "Welcome post",
      content: "Hello everyone",
      author: { id: "u-2", name: "Bob" },
      category: { id: "cat-2", name: "Announcements", slug: "announcements" },
      reply_count: 0,
      reaction_count: 0,
      view_count: 0,
      is_pinned: true,
      is_locked: false,
      status: "open",
      url: "https://community.example.com/posts/post-2",
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    };

    const doc = await transformPost(post, CONTEXT);

    expect(doc.id).toBe("conn_insided_1_post_post-2");
    expect(doc.content).not.toContain("Replies:");
    expect(doc.content).not.toContain("Reactions:");
    expect(doc.content).not.toContain("Views:");
    expect(doc.metadata?.isPinned).toBe(true);
  });
});

describe("transformArticle", () => {
  it("transforms a knowledge base article", async () => {
    const article = {
      id: "art-1",
      title: "Getting Started Guide",
      content: "This guide will help you get started",
      content_html:
        "<h1>Getting Started</h1><p>This guide will help you get started</p>",
      author: { id: "u-1", name: "Support Team" },
      category: {
        id: "cat-3",
        name: "Getting Started",
        slug: "getting-started",
      },
      status: "published",
      view_count: 500,
      helpful_count: 42,
      url: "https://community.example.com/articles/art-1",
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-02-01T00:00:00Z",
    };

    const doc = await transformArticle(article, CONTEXT);

    expect(doc.id).toBe("conn_insided_1_article_art-1");
    expect(doc.document_type).toBe("article");
    expect(doc.title).toBe("Getting Started Guide");
    expect(doc.content).toContain("This guide will help you get started");
    expect(doc.content).toContain("Status: published");
    expect(doc.content).toContain("Views: 500");
    expect(doc.content).toContain("Helpful votes: 42");
    expect(doc.metadata?.status).toBe("published");
    expect(doc.metadata?.helpfulCount).toBe("42");
  });
});

describe("transformIdea", () => {
  it("transforms a product idea with votes", async () => {
    const idea = {
      id: "idea-1",
      title: "Dark mode support",
      content: "Please add dark mode to the platform",
      content_html:
        "<p>Please add <strong>dark mode</strong> to the platform</p>",
      author: { id: "u-3", name: "Charlie" },
      category: {
        id: "cat-4",
        name: "Feature Requests",
        slug: "feature-requests",
      },
      status: "under_review",
      vote_count: 87,
      comment_count: 12,
      url: "https://community.example.com/ideas/idea-1",
      created_at: "2025-01-10T00:00:00Z",
      updated_at: "2025-03-01T00:00:00Z",
    };

    const doc = await transformIdea(idea, CONTEXT);

    expect(doc.id).toBe("conn_insided_1_idea_idea-1");
    expect(doc.document_type).toBe("idea");
    expect(doc.document_subtype).toBe("under_review");
    expect(doc.title).toBe("Dark mode support");
    expect(doc.content).toContain("dark mode");
    expect(doc.content).toContain("Status: under_review");
    expect(doc.content).toContain("Votes: 87");
    expect(doc.content).toContain("Comments: 12");
    expect(doc.metadata?.voteCount).toBe("87");
    expect(doc.metadata?.commentCount).toBe("12");
    expect(doc.author_name).toBe("Charlie");
  });

  it("handles idea with zero votes and comments", async () => {
    const idea = {
      id: "idea-2",
      title: "New idea",
      content: "A new idea",
      author: { id: "u-4", name: "Diana" },
      category: { id: "cat-5", name: "Ideas", slug: "ideas" },
      status: "new",
      vote_count: 0,
      comment_count: 0,
      url: "https://community.example.com/ideas/idea-2",
      created_at: "2025-03-20T00:00:00Z",
      updated_at: "2025-03-20T00:00:00Z",
    };

    const doc = await transformIdea(idea, CONTEXT);

    expect(doc.id).toBe("conn_insided_1_idea_idea-2");
    expect(doc.content).not.toContain("Votes:");
    expect(doc.content).not.toContain("Comments:");
  });
});
