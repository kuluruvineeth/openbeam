import { describe, expect, test } from "bun:test";
import type { SeismicTransformContext } from "@openbeam/types/services/connectors/seismic";
import { transformSeismicContent } from "../transformers/content";
import { transformSeismicLiveDoc } from "../transformers/livedoc";
import { transformSeismicWorkspace } from "../transformers/workspace";

const context: SeismicTransformContext = {
  connectorId: "conn_seismic_1",
  connectorType: "SEISMIC",
  teamId: "team_1",
  workspaceId: "ws_1",
};

describe("transformSeismicContent", () => {
  test("transforms a content item with all fields", () => {
    const content = {
      id: "c-001",
      name: "Q4 Sales Deck",
      type: "Presentation",
      version: 3,
      url: "https://seismic.com/content/c-001",
      teamsiteId: "ts-1",
      teamsiteName: "North America Sales",
      format: "pptx",
      size: 2_048_000,
      description: "Quarterly sales presentation for enterprise accounts",
      tags: ["enterprise", "q4", "deck"],
      createdAt: "2026-01-15T10:00:00Z",
      modifiedAt: "2026-03-20T14:30:00Z",
      createdBy: "Jane Doe",
    };

    const doc = transformSeismicContent(content, context);

    expect(doc.id).toBe("conn_seismic_1_content_c-001");
    expect(doc.title).toBe("Q4 Sales Deck");
    expect(doc.document_type).toBe("content");
    expect(doc.document_subtype).toBe("Presentation");
    expect(doc.url).toBe("https://seismic.com/content/c-001");
    expect(doc.author_name).toBe("Jane Doe");
    expect(doc.content).toContain("enterprise accounts");
    expect(doc.content).toContain("Workspace: North America Sales");
    expect(doc.metadata?.format).toBe("pptx");
    expect(doc.metadata?.version).toBe("3");
    expect(doc.metadata?.tags).toBe("enterprise, q4, deck");
  });

  test("handles minimal content", () => {
    const content = {
      id: "c-002",
      name: "Minimal Content",
      type: "Document",
      version: 1,
      createdAt: "2026-01-01T00:00:00Z",
      modifiedAt: "2026-01-01T00:00:00Z",
    };

    const doc = transformSeismicContent(content, context);

    expect(doc.id).toBe("conn_seismic_1_content_c-002");
    expect(doc.title).toBe("Minimal Content");
    expect(doc.url).toBe("");
  });
});

describe("transformSeismicWorkspace", () => {
  test("transforms a workspace", () => {
    const workspace = {
      id: "ws-001",
      name: "Enterprise Sales",
      description: "Content workspace for enterprise sales team",
      isDefault: false,
      createdAt: "2025-06-01T00:00:00Z",
      modifiedAt: "2026-03-01T12:00:00Z",
    };

    const doc = transformSeismicWorkspace(workspace, context);

    expect(doc.id).toBe("conn_seismic_1_workspace_ws-001");
    expect(doc.title).toBe("Enterprise Sales");
    expect(doc.document_type).toBe("workspace");
    expect(doc.content).toBe("Content workspace for enterprise sales team");
  });
});

describe("transformSeismicLiveDoc", () => {
  test("transforms a LiveDoc", () => {
    const liveDoc = {
      id: "ld-001",
      name: "Proposal Generator",
      description: "Auto-generates proposals from CRM data",
      templateId: "tpl-001",
      templateName: "Enterprise Proposal",
      format: "docx",
      url: "https://seismic.com/livedocs/ld-001",
      createdAt: "2026-02-01T00:00:00Z",
      modifiedAt: "2026-03-15T09:00:00Z",
      createdBy: "John Smith",
      tags: ["proposal", "enterprise"],
    };

    const doc = transformSeismicLiveDoc(liveDoc, context);

    expect(doc.id).toBe("conn_seismic_1_livedoc_ld-001");
    expect(doc.title).toBe("Proposal Generator");
    expect(doc.document_type).toBe("livedoc");
    expect(doc.content).toContain("Template: Enterprise Proposal");
    expect(doc.metadata?.templateName).toBe("Enterprise Proposal");
    expect(doc.author_name).toBe("John Smith");
  });
});
