import { describe, expect, it } from "bun:test";
import type {
  FigmaComment,
  FigmaComponent,
  FigmaFileDetail,
  FigmaFileMeta,
  FigmaTransformContext,
} from "@openbeam/types/services/connectors/figma";
import { transformFigmaComment } from "../transformers/comment";
import {
  transformFigmaComponent,
  transformFigmaFile,
} from "../transformers/file";

const CONTEXT: FigmaTransformContext = {
  connectorId: "conn_figma_1",
  connectorType: "FIGMA",
  teamId: "team_1",
  workspaceId: "ws_1",
  figmaTeamId: "12345",
};

describe("transformFigmaFile", () => {
  const fileMeta: FigmaFileMeta = {
    key: "abc123",
    name: "Design System",
    thumbnail_url: "https://example.com/thumb.png",
    last_modified: "2026-03-01T10:00:00Z",
  };

  it("transforms a file without detail", () => {
    const doc = transformFigmaFile(fileMeta, CONTEXT);

    expect(doc.id).toBe("conn_figma_1_file_abc123");
    expect(doc.title).toBe("Design System");
    expect(doc.document_type).toBe("file");
    expect(doc.url).toBe("https://www.figma.com/design/abc123");
    expect(doc.connector_id).toBe("conn_figma_1");
    expect(doc.team_id).toBe("team_1");
    expect(doc.content).toBe("Design System");
    expect(doc.metadata?.thumbnailUrl).toBe("https://example.com/thumb.png");
  });

  it("transforms a file with detail including pages", () => {
    const detail: FigmaFileDetail = {
      name: "Design System",
      lastModified: "2026-03-01T10:00:00Z",
      thumbnailUrl: "https://example.com/thumb.png",
      version: "42",
      role: "owner",
      document: {
        id: "0:0",
        name: "Document",
        type: "DOCUMENT",
        children: [
          { id: "1:1", name: "Home", type: "CANVAS" },
          { id: "1:2", name: "Components", type: "CANVAS" },
        ],
      },
      components: {
        comp1: {
          key: "comp1",
          name: "Button",
          description: "Primary action button",
        },
      },
    };

    const doc = transformFigmaFile(fileMeta, CONTEXT, detail);

    expect(doc.content).toContain("Pages: Home, Components");
    expect(doc.content).toContain("Components: Button");
    expect(doc.metadata?.pages).toBe("Home, Components");
    expect(doc.metadata?.componentCount).toBe("1");
    expect(doc.metadata?.version).toBe("42");
  });

  it("handles file with no thumbnail", () => {
    const noThumb: FigmaFileMeta = {
      key: "xyz",
      name: "Untitled",
      last_modified: "2026-01-01T00:00:00Z",
    };

    const doc = transformFigmaFile(noThumb, CONTEXT);

    expect(doc.metadata?.thumbnailUrl).toBeUndefined();
  });
});

describe("transformFigmaComponent", () => {
  it("transforms a component with full metadata", () => {
    const component: FigmaComponent = {
      key: "comp_abc",
      name: "PrimaryButton",
      description: "A primary action button with hover states",
      containing_frame: {
        name: "Buttons Frame",
        nodeId: "1:42",
        pageName: "Components",
      },
    };

    const doc = transformFigmaComponent(
      component,
      "file_key_1",
      "Design System",
      CONTEXT
    );

    expect(doc.id).toBe("conn_figma_1_component_comp_abc");
    expect(doc.title).toBe("PrimaryButton");
    expect(doc.document_type).toBe("component");
    expect(doc.content).toContain("PrimaryButton");
    expect(doc.content).toContain("A primary action button");
    expect(doc.content).toContain("Page: Components");
    expect(doc.content).toContain("Frame: Buttons Frame");
    expect(doc.metadata?.fileName).toBe("Design System");
    expect(doc.metadata?.page).toBe("Components");
    expect(doc.metadata?.frame).toBe("Buttons Frame");
  });

  it("transforms a component without containing frame", () => {
    const component: FigmaComponent = {
      key: "comp_simple",
      name: "Icon",
      description: "",
    };

    const doc = transformFigmaComponent(component, "fk", "File", CONTEXT);

    expect(doc.title).toBe("Icon");
    expect(doc.metadata?.page).toBeUndefined();
    expect(doc.metadata?.frame).toBeUndefined();
  });
});

describe("transformFigmaComment", () => {
  it("transforms an active comment", () => {
    const comment: FigmaComment = {
      id: "comment_1",
      message: "Can we increase the padding here?",
      file_key: "file_abc",
      user: {
        id: "user_1",
        handle: "jane_designer",
        img_url: "https://example.com/avatar.png",
      },
      created_at: "2026-03-15T14:30:00Z",
      resolved_at: null,
    };

    const doc = transformFigmaComment(comment, "Homepage Design", CONTEXT);

    expect(doc.id).toBe("conn_figma_1_comment_comment_1");
    expect(doc.title).toBe("Comment on Homepage Design");
    expect(doc.content).toBe("Can we increase the padding here?");
    expect(doc.author_name).toBe("jane_designer");
    expect(doc.document_type).toBe("comment");
    expect(doc.document_subtype).toBe("active");
    expect(doc.metadata?.resolved).toBe("false");
    expect(doc.metadata?.authorHandle).toBe("jane_designer");
  });

  it("transforms a resolved comment", () => {
    const comment: FigmaComment = {
      id: "comment_2",
      message: "Done",
      file_key: "file_abc",
      user: { id: "user_2", handle: "bob" },
      created_at: "2026-03-15T14:30:00Z",
      resolved_at: "2026-03-16T09:00:00Z",
    };

    const doc = transformFigmaComment(comment, "File", CONTEXT);

    expect(doc.document_subtype).toBe("resolved");
    expect(doc.metadata?.resolved).toBe("true");
    expect(doc.metadata?.resolvedAt).toBe("2026-03-16T09:00:00Z");
  });

  it("transforms a reply comment", () => {
    const comment: FigmaComment = {
      id: "comment_3",
      message: "Agreed",
      file_key: "file_abc",
      parent_id: "comment_1",
      user: { id: "user_3", handle: "alice" },
      created_at: "2026-03-15T15:00:00Z",
    };

    const doc = transformFigmaComment(comment, "File", CONTEXT);

    expect(doc.metadata?.parentCommentId).toBe("comment_1");
  });
});
