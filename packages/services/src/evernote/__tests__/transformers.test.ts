import { describe, expect, it } from "bun:test";
import type { EvernoteTransformContext } from "@openbeam/types/services/connectors/evernote";
import type { EvernoteNotebook } from "../api/notebooks";
import type { EvernoteNoteMetadata } from "../api/notes";
import type { EvernoteTag } from "../api/tags";
import { transformNote } from "../transformers/note";
import { transformNotebook } from "../transformers/notebook";
import { transformTag } from "../transformers/tag";
import { stripEnml } from "../transformers/utils";

const CONTEXT: EvernoteTransformContext = {
  connectorId: "conn_test_123",
  connectorType: "EVERNOTE",
  teamId: "team_abc",
  workspaceId: "ws_xyz",
  environment: "production",
};

function makeNote(
  overrides: Partial<EvernoteNoteMetadata> = {}
): EvernoteNoteMetadata {
  return {
    guid: "note_abc123",
    title: "Meeting Notes",
    created: 1_705_312_000_000,
    updated: 1_710_950_400_000,
    updateSequenceNum: 42,
    notebookGuid: "nb_work",
    tagGuids: ["tag_1", "tag_2"],
    tagNames: ["project", "meeting"],
    attributes: {
      author: "Alice",
      source: "web.clip",
      sourceURL: "https://example.com/article",
    },
    ...overrides,
  };
}

function makeNotebook(
  overrides: Partial<EvernoteNotebook> = {}
): EvernoteNotebook {
  return {
    guid: "nb_work",
    name: "Work",
    updateSequenceNum: 10,
    defaultNotebook: false,
    serviceCreated: 1_704_067_200_000,
    serviceUpdated: 1_710_950_400_000,
    stack: "Professional",
    ...overrides,
  };
}

function makeTag(overrides: Partial<EvernoteTag> = {}): EvernoteTag {
  return {
    guid: "tag_1",
    name: "project",
    updateSequenceNum: 5,
    ...overrides,
  };
}

describe("stripEnml", () => {
  it("strips basic ENML tags", () => {
    const enml = "<en-note><div>Hello</div><div>World</div></en-note>";
    const result = stripEnml(enml);
    expect(result).toBe("Hello\nWorld");
  });

  it("converts todo checkboxes", () => {
    const enml =
      '<en-note><en-todo checked="false"/>Buy milk<br/><en-todo checked="true"/>Read book</en-note>';
    const result = stripEnml(enml);
    expect(result).toContain("[ ] Buy milk");
    expect(result).toContain("[x] Read book");
  });

  it("handles list items", () => {
    const enml = "<en-note><ul><li>First</li><li>Second</li></ul></en-note>";
    const result = stripEnml(enml);
    expect(result).toContain("- First");
    expect(result).toContain("- Second");
  });

  it("decodes HTML entities", () => {
    const enml = "<en-note>&amp; &lt;tag&gt; &quot;quoted&quot;</en-note>";
    const result = stripEnml(enml);
    expect(result).toBe('& <tag> "quoted"');
  });

  it("strips media tags", () => {
    const enml =
      '<en-note>Text<en-media hash="abc123" type="image/png"/>More text</en-note>';
    const result = stripEnml(enml);
    expect(result).toBe("Text More text");
  });

  it("handles empty content", () => {
    expect(stripEnml("")).toBe("");
    expect(stripEnml("<en-note></en-note>")).toBe("");
  });

  it("collapses excessive whitespace", () => {
    const enml =
      "<en-note><div>One</div><br/><br/><br/><br/><div>Two</div></en-note>";
    const result = stripEnml(enml);
    expect(result).not.toContain("\n\n\n");
  });
});

describe("transformNote", () => {
  const notebookMap = new Map<string, EvernoteNotebook>([
    ["nb_work", makeNotebook()],
  ]);

  it("produces correct document structure", () => {
    const note = makeNote();
    const doc = transformNote(note, CONTEXT, notebookMap);

    expect(doc.id).toBe("conn_test_123_note_note_abc123");
    expect(doc.connector_id).toBe("conn_test_123");
    expect(doc.connector_type).toBe("EVERNOTE");
    expect(doc.team_id).toBe("team_abc");
    expect(doc.document_type).toBe("document");
    expect(doc.title).toBe("Meeting Notes");
    expect(doc.external_id).toBe("note_abc123");
    expect(doc.created_at).toBe(1_705_312_000_000);
    expect(doc.updated_at).toBe(1_710_950_400_000);
    expect(doc.is_public).toBe(false);
  });

  it("includes notebook in metadata", () => {
    const note = makeNote();
    const doc = transformNote(note, CONTEXT, notebookMap);
    expect(doc.metadata?.notebook).toBe("Work");
    expect(doc.metadata?.stack).toBe("Professional");
  });

  it("includes tags in content and metadata", () => {
    const note = makeNote();
    const doc = transformNote(note, CONTEXT, notebookMap);
    expect(doc.content).toContain("Tags: project, meeting");
    expect(doc.metadata?.tags).toBe("project, meeting");
  });

  it("includes source attributes", () => {
    const note = makeNote();
    const doc = transformNote(note, CONTEXT, notebookMap);
    expect(doc.content).toContain("Source: web.clip");
    expect(doc.content).toContain("Source URL: https://example.com/article");
    expect(doc.author_name).toBe("Alice");
  });

  it("strips ENML content to plain text", () => {
    const note = makeNote();
    const enml = "<en-note><div>Important content here</div></en-note>";
    const doc = transformNote(note, CONTEXT, notebookMap, enml);
    expect(doc.content).toContain("Important content here");
  });

  it("handles note without tags", () => {
    const note = makeNote({ tagGuids: undefined, tagNames: undefined });
    const doc = transformNote(note, CONTEXT, notebookMap);
    expect(doc.content).not.toContain("Tags:");
    expect(doc.metadata?.tags).toBeUndefined();
  });

  it("handles note with unknown notebook", () => {
    const note = makeNote({ notebookGuid: "nb_unknown" });
    const doc = transformNote(note, CONTEXT, notebookMap);
    expect(doc.metadata?.notebook).toBeUndefined();
  });
});

describe("transformNotebook", () => {
  it("produces correct document structure", () => {
    const notebook = makeNotebook();
    const doc = transformNotebook(notebook, CONTEXT);

    expect(doc.id).toBe("conn_test_123_notebook_nb_work");
    expect(doc.document_type).toBe("folder");
    expect(doc.title).toBe("Work");
    expect(doc.external_id).toBe("nb_work");
  });

  it("includes stack in content and metadata", () => {
    const notebook = makeNotebook();
    const doc = transformNotebook(notebook, CONTEXT);
    expect(doc.content).toContain("Stack: Professional");
    expect(doc.metadata?.stack).toBe("Professional");
  });

  it("marks default notebook", () => {
    const notebook = makeNotebook({ defaultNotebook: true });
    const doc = transformNotebook(notebook, CONTEXT);
    expect(doc.content).toContain("Default notebook");
    expect(doc.metadata?.isDefault).toBe("true");
  });

  it("handles notebook without stack", () => {
    const notebook = makeNotebook({ stack: undefined });
    const doc = transformNotebook(notebook, CONTEXT);
    expect(doc.metadata?.stack).toBeUndefined();
  });
});

describe("transformTag", () => {
  it("produces correct document structure", () => {
    const tag = makeTag();
    const tagMap = new Map([["tag_1", tag]]);
    const doc = transformTag(tag, CONTEXT, tagMap);

    expect(doc.id).toBe("conn_test_123_tag_tag_1");
    expect(doc.document_type).toBe("tag");
    expect(doc.title).toBe("project");
    expect(doc.external_id).toBe("tag_1");
  });

  it("includes parent tag reference", () => {
    const parent = makeTag({ guid: "tag_parent", name: "work" });
    const child = makeTag({
      guid: "tag_child",
      name: "frontend",
      parentGuid: "tag_parent",
    });
    const tagMap = new Map([
      ["tag_parent", parent],
      ["tag_child", child],
    ]);

    const doc = transformTag(child, CONTEXT, tagMap);
    expect(doc.content).toContain("Parent tag: work");
    expect(doc.metadata?.parentGuid).toBe("tag_parent");
  });

  it("handles tag without parent", () => {
    const tag = makeTag();
    const tagMap = new Map([["tag_1", tag]]);
    const doc = transformTag(tag, CONTEXT, tagMap);
    expect(doc.content).toBe("");
    expect(doc.metadata?.parentGuid).toBeUndefined();
  });
});
