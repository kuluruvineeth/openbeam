import { describe, expect, it } from "bun:test";
import type { OneNoteTransformContext } from "@openbeam/types/services/connectors/onenote";
import type { OneNoteNotebook } from "../api/notebooks";
import type { OneNotePage } from "../api/pages";
import type { OneNoteSection } from "../api/sections";
import { transformOneNoteNotebook } from "../transformers/notebook";
import { transformOneNotePage } from "../transformers/page";
import { transformOneNoteSection } from "../transformers/section";
import { stripHtml } from "../transformers/utils";

const context: OneNoteTransformContext = {
  connectorId: "conn_onenote_123",
  connectorType: "onenote",
  teamId: "team_456",
  workspaceId: "ws_789",
  userEmail: "user@contoso.com",
};

describe("transformOneNoteNotebook", () => {
  const notebook: OneNoteNotebook = {
    id: "1-abc-def-123",
    displayName: "Work Notebook",
    createdDateTime: "2025-01-15T10:00:00Z",
    lastModifiedDateTime: "2025-03-20T14:30:00Z",
    isDefault: false,
    isShared: true,
    createdBy: {
      user: { id: "user-001", displayName: "Alice Johnson" },
    },
    lastModifiedBy: {
      user: { id: "user-001", displayName: "Alice Johnson" },
    },
    links: {
      oneNoteWebUrl: {
        href: "https://onedrive.live.com/view.aspx?id=notebook-123",
      },
    },
    sectionsUrl:
      "https://graph.microsoft.com/v1.0/me/onenote/notebooks/1-abc-def-123/sections",
    sectionGroupsUrl:
      "https://graph.microsoft.com/v1.0/me/onenote/notebooks/1-abc-def-123/sectionGroups",
  };

  it("transforms notebook to GenericDocument", () => {
    const doc = transformOneNoteNotebook(notebook, context);

    expect(doc.id).toBe("conn_onenote_123_notebook_1-abc-def-123");
    expect(doc.connector_id).toBe("conn_onenote_123");
    expect(doc.connector_type).toBe("onenote");
    expect(doc.team_id).toBe("team_456");
    expect(doc.workspace_id).toBe("ws_789");
    expect(doc.external_id).toBe("1-abc-def-123");
    expect(doc.document_type).toBe("folder");
    expect(doc.document_subtype).toBe("notebook");
    expect(doc.title).toBe("Work Notebook");
    expect(doc.url).toBe("https://onedrive.live.com/view.aspx?id=notebook-123");
    expect(doc.author_name).toBe("Alice Johnson");
    expect(doc.is_public).toBe(true);
    expect(doc.created_at).toBe(new Date("2025-01-15T10:00:00Z").getTime());
    expect(doc.updated_at).toBe(new Date("2025-03-20T14:30:00Z").getTime());
  });

  it("handles notebook without links", () => {
    const minimal: OneNoteNotebook = {
      ...notebook,
      links: undefined,
      createdBy: { user: undefined },
    };
    const doc = transformOneNoteNotebook(minimal, context);
    expect(doc.url).toBeUndefined();
    expect(doc.author_name).toBeUndefined();
  });
});

describe("transformOneNoteSection", () => {
  const section: OneNoteSection = {
    id: "1-section-abc",
    displayName: "Meeting Notes",
    createdDateTime: "2025-02-01T08:00:00Z",
    lastModifiedDateTime: "2025-03-18T16:45:00Z",
    isDefault: false,
    pagesUrl:
      "https://graph.microsoft.com/v1.0/me/onenote/sections/1-section-abc/pages",
    createdBy: {
      user: { id: "user-001", displayName: "Bob Smith" },
    },
    lastModifiedBy: {
      user: { id: "user-001", displayName: "Bob Smith" },
    },
    parentNotebook: {
      id: "1-abc-def-123",
      displayName: "Work Notebook",
    },
    links: {
      oneNoteWebUrl: {
        href: "https://onedrive.live.com/view.aspx?id=section-abc",
      },
    },
  };

  it("transforms section to GenericDocument", () => {
    const doc = transformOneNoteSection(section, context);

    expect(doc.id).toBe("conn_onenote_123_section_1-section-abc");
    expect(doc.document_type).toBe("folder");
    expect(doc.document_subtype).toBe("section");
    expect(doc.title).toBe("Meeting Notes");
    expect(doc.content).toContain("Meeting Notes");
    expect(doc.content).toContain("Work Notebook");
    expect(doc.source_id).toBe("1-abc-def-123");
    expect(doc.source_type).toBe("notebook");
    expect(doc.metadata?.notebookName).toBe("Work Notebook");
    expect(doc.metadata?.notebookId).toBe("1-abc-def-123");
  });

  it("handles section without parent notebook", () => {
    const orphan: OneNoteSection = {
      ...section,
      parentNotebook: undefined,
    };
    const doc = transformOneNoteSection(orphan, context);
    expect(doc.source_id).toBeUndefined();
    expect(doc.metadata?.notebookName).toBeUndefined();
  });
});

describe("transformOneNotePage", () => {
  const page: OneNotePage = {
    id: "1-page-xyz",
    title: "Sprint Planning 2025-Q1",
    createdDateTime: "2025-03-01T09:00:00Z",
    lastModifiedDateTime: "2025-03-15T11:30:00Z",
    contentUrl:
      "https://graph.microsoft.com/v1.0/me/onenote/pages/1-page-xyz/content",
    level: 0,
    order: 1,
    links: {
      oneNoteWebUrl: {
        href: "https://onedrive.live.com/view.aspx?id=page-xyz",
      },
    },
    parentSection: {
      id: "1-section-abc",
      displayName: "Meeting Notes",
    },
    parentNotebook: {
      id: "1-abc-def-123",
      displayName: "Work Notebook",
    },
    userTags: ["sprint", "planning"],
  };

  it("transforms page without HTML content", () => {
    const doc = transformOneNotePage(page, context);

    expect(doc.id).toBe("conn_onenote_123_page_1-page-xyz");
    expect(doc.document_type).toBe("page");
    expect(doc.document_subtype).toBe("page");
    expect(doc.title).toBe("Sprint Planning 2025-Q1");
    expect(doc.content).toBe("Sprint Planning 2025-Q1");
    expect(doc.content_html).toBeUndefined();
    expect(doc.url).toBe("https://onedrive.live.com/view.aspx?id=page-xyz");
    expect(doc.author_email).toBe("user@contoso.com");
    expect(doc.source_id).toBe("1-section-abc");
    expect(doc.source_type).toBe("section");
    expect(doc.metadata?.sectionName).toBe("Meeting Notes");
    expect(doc.metadata?.notebookName).toBe("Work Notebook");
    expect(doc.metadata?.tags).toBe("sprint, planning");
  });

  it("transforms page with HTML content", () => {
    const html =
      "<html><head><title>Sprint Planning</title></head><body><h1>Sprint Goals</h1><p>Ship v2.0 by March 30</p></body></html>";
    const doc = transformOneNotePage(page, context, html);

    expect(doc.content).toContain("Sprint Goals");
    expect(doc.content).toContain("Ship v2.0 by March 30");
    expect(doc.content_html).toBe(html);
  });

  it("handles untitled page", () => {
    const untitled: OneNotePage = {
      ...page,
      title: "",
    };
    const doc = transformOneNotePage(untitled, context);
    expect(doc.title).toBe("(Untitled)");
  });

  it("handles page without parent section", () => {
    const orphan: OneNotePage = {
      ...page,
      parentSection: undefined,
      parentNotebook: undefined,
      userTags: undefined,
    };
    const doc = transformOneNotePage(orphan, context);
    expect(doc.source_id).toBeUndefined();
    expect(doc.metadata?.sectionName).toBeUndefined();
    expect(doc.metadata?.notebookName).toBeUndefined();
    expect(doc.metadata?.tags).toBeUndefined();
  });
});

describe("stripHtml", () => {
  it("strips basic HTML tags", () => {
    expect(stripHtml("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });

  it("strips style and script tags with content", () => {
    const html =
      "<style>body { color: red; }</style><p>Visible</p><script>alert('x')</script>";
    expect(stripHtml(html)).toBe("Visible");
  });

  it("decodes HTML entities", () => {
    expect(stripHtml("&amp; &lt; &gt; &quot; &#39;")).toBe("& < > \" '");
  });

  it("collapses whitespace", () => {
    expect(stripHtml("<p>  lots   of   space  </p>")).toBe("lots of space");
  });

  it("handles empty string", () => {
    expect(stripHtml("")).toBe("");
  });
});
