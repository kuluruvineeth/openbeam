import { describe, expect, it } from "bun:test";
import type { ProcoreTransformContext } from "@openbeam/types/services/connectors/procore";
import { transformProcoreDocument } from "../transformers/document";
import { transformProcoreDrawing } from "../transformers/drawing";
import { transformProcoreProject } from "../transformers/project";
import { transformProcoreRfi } from "../transformers/rfi";
import { transformProcoreSubmittal } from "../transformers/submittal";

const context: ProcoreTransformContext = {
  connectorId: "conn_procore_1",
  connectorType: "PROCORE",
  teamId: "team_1",
  workspaceId: "ws_1",
  companyId: "company_42",
};

describe("transformProcoreProject", () => {
  it("transforms a project with all fields", () => {
    const project = {
      id: 100,
      name: "Highway Bridge",
      display_name: "Highway Bridge Expansion",
      project_number: "PRJ-001",
      address: "123 Main St",
      city: "Portland",
      state_code: "OR",
      zip: "97201",
      country_code: "US",
      stage: "Active",
      active: true,
      start_date: "2025-06-01",
      estimated_completion_date: "2026-12-31",
      actual_start_date: "2025-06-15",
      completion_date: null,
      total_value: "15000000",
      description: "Expansion of I-5 highway bridge",
      created_at: "2025-01-15T10:00:00Z",
      updated_at: "2026-03-20T14:30:00Z",
      company: { id: 42, name: "BuildCo" },
    };

    const doc = transformProcoreProject(project, context);

    expect(doc.id).toBe("conn_procore_1_project_100");
    expect(doc.document_type).toBe("project");
    expect(doc.title).toBe("Highway Bridge Expansion");
    expect(doc.url).toBe("https://app.procore.com/projects/100");
    expect(doc.content).toContain("Expansion of I-5 highway bridge");
    expect(doc.content).toContain("Location: 123 Main St");
    expect(doc.metadata?.stage).toBe("Active");
    expect(doc.metadata?.projectNumber).toBe("PRJ-001");
    expect(doc.metadata?.companyName).toBe("BuildCo");
  });

  it("handles minimal fields", () => {
    const project = {
      id: 200,
      name: "Simple Project",
      display_name: "",
      project_number: null,
      address: null,
      city: null,
      state_code: null,
      zip: null,
      country_code: null,
      stage: null,
      active: true,
      start_date: null,
      estimated_completion_date: null,
      actual_start_date: null,
      completion_date: null,
      total_value: null,
      description: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      company: null,
    };

    const doc = transformProcoreProject(project, context);

    expect(doc.id).toBe("conn_procore_1_project_200");
    expect(doc.title).toBe("Simple Project");
    expect(doc.metadata?.projectNumber).toBeUndefined();
    expect(doc.metadata?.stage).toBeUndefined();
  });
});

describe("transformProcoreRfi", () => {
  it("transforms an RFI with question and response", () => {
    const rfi = {
      id: 50,
      number: 12,
      subject: "Steel beam specifications",
      question: {
        body: "<p>What gauge steel for the main supports?</p>",
        plain_text_body: "What gauge steel for the main supports?",
      },
      official_response: "Use A992 grade steel, W14x22 sections.",
      status: "open",
      priority: "high",
      due_date: "2026-04-15",
      created_at: "2026-03-01T09:00:00Z",
      updated_at: "2026-03-15T11:00:00Z",
      assignee: { id: 10, name: "Bob Builder" },
      responsible_contractor: { id: 20, name: "SteelWorks Inc" },
      rfi_manager: { id: 30, name: "Alice Manager" },
      created_by: { id: 5, name: "Carol Engineer" },
      project: { id: 100, name: "Highway Bridge" },
      cost_code: { id: 1, name: "05-Structural Steel" },
      spec_section: { id: 2, label: "05 12 00" },
    };

    const doc = transformProcoreRfi(rfi, 100, context);

    expect(doc.id).toBe("conn_procore_1_rfi_50");
    expect(doc.document_type).toBe("rfi");
    expect(doc.title).toBe("RFI #12: Steel beam specifications");
    expect(doc.url).toBe("https://app.procore.com/projects/100/rfis/50");
    expect(doc.content).toContain("What gauge steel for the main supports?");
    expect(doc.content).toContain("Use A992 grade steel");
    expect(doc.author_name).toBe("Carol Engineer");
    expect(doc.metadata?.rfiNumber).toBe("12");
    expect(doc.metadata?.priority).toBe("high");
    expect(doc.metadata?.assignee).toBe("Bob Builder");
    expect(doc.metadata?.specSection).toBe("05 12 00");
  });
});

describe("transformProcoreSubmittal", () => {
  it("transforms a submittal with all fields", () => {
    const submittal = {
      id: 75,
      number: 5,
      revision: 2,
      title: "Concrete Mix Design",
      description: "4000 PSI concrete mix for foundation",
      status: { id: 1, name: "Approved" },
      submittal_type: "Product Data",
      spec_section: { id: 3, label: "03 30 00" },
      received_from: { id: 15, name: "ConcretePros LLC" },
      responsible_contractor: { id: 20, name: "FoundationCo" },
      created_by: { id: 5, name: "Carol Engineer" },
      submit_by: "2026-04-01",
      due_date: "2026-04-15",
      created_at: "2026-03-01T08:00:00Z",
      updated_at: "2026-03-10T16:00:00Z",
      project: { id: 100, name: "Highway Bridge" },
    };

    const doc = transformProcoreSubmittal(submittal, 100, context);

    expect(doc.id).toBe("conn_procore_1_submittal_75");
    expect(doc.document_type).toBe("submittal");
    expect(doc.title).toBe("Submittal #5: Concrete Mix Design");
    expect(doc.url).toBe("https://app.procore.com/projects/100/submittals/75");
    expect(doc.content).toContain("4000 PSI concrete mix");
    expect(doc.metadata?.submittalNumber).toBe("5");
    expect(doc.metadata?.revision).toBe("2");
    expect(doc.metadata?.status).toBe("Approved");
    expect(doc.metadata?.specSection).toBe("03 30 00");
    expect(doc.metadata?.receivedFrom).toBe("ConcretePros LLC");
  });
});

describe("transformProcoreDocument", () => {
  it("transforms a document", () => {
    const doc = {
      id: 300,
      name: "Site Plan Rev B.pdf",
      document_type: "PDF",
      private: false,
      size: 2_500_000,
      created_at: "2026-02-10T10:00:00Z",
      updated_at: "2026-03-05T12:00:00Z",
      created_by: { id: 5, name: "Carol Engineer" },
      parent: { id: 10, name: "Site Plans" },
      project: { id: 100, name: "Highway Bridge" },
    };

    const result = transformProcoreDocument(doc, 100, context);

    expect(result.id).toBe("conn_procore_1_document_300");
    expect(result.document_type).toBe("document");
    expect(result.title).toBe("Site Plan Rev B.pdf");
    expect(result.url).toBe(
      "https://app.procore.com/projects/100/documents/300"
    );
    expect(result.author_name).toBe("Carol Engineer");
    expect(result.is_public).toBe(true);
    expect(result.metadata?.documentType).toBe("PDF");
    expect(result.metadata?.folder).toBe("Site Plans");
    expect(result.content).toContain("2.4 MB");
  });
});

describe("transformProcoreDrawing", () => {
  it("transforms a drawing with all fields", () => {
    const drawing = {
      id: 400,
      number: "A-101",
      title: "First Floor Plan",
      discipline: "Architectural",
      set: { id: 1, name: "Construction Set" },
      revision_number: 3,
      current: true,
      description: "Main floor plan with dimensions",
      created_at: "2026-01-20T08:00:00Z",
      updated_at: "2026-03-01T10:00:00Z",
      received_date: "2026-01-15",
      drawing_date: "2026-01-10",
      project: { id: 100, name: "Highway Bridge" },
    };

    const result = transformProcoreDrawing(drawing, 100, context);

    expect(result.id).toBe("conn_procore_1_drawing_400");
    expect(result.document_type).toBe("drawing");
    expect(result.title).toBe("A-101 - First Floor Plan");
    expect(result.url).toBe(
      "https://app.procore.com/projects/100/drawings/400"
    );
    expect(result.content).toContain("Discipline: Architectural");
    expect(result.content).toContain("Revision: 3");
    expect(result.content).toContain("Current");
    expect(result.metadata?.drawingNumber).toBe("A-101");
    expect(result.metadata?.revision).toBe("3");
    expect(result.metadata?.current).toBe("true");
    expect(result.metadata?.discipline).toBe("Architectural");
    expect(result.metadata?.set).toBe("Construction Set");
  });

  it("uses number as title when title is null", () => {
    const drawing = {
      id: 401,
      number: "S-200",
      title: null,
      discipline: "Structural",
      set: null,
      revision_number: 1,
      current: true,
      description: null,
      created_at: "2026-01-20T08:00:00Z",
      updated_at: "2026-01-20T08:00:00Z",
      received_date: null,
      drawing_date: null,
      project: { id: 100, name: "Highway Bridge" },
    };

    const result = transformProcoreDrawing(drawing, 100, context);

    expect(result.title).toBe("S-200");
  });
});
