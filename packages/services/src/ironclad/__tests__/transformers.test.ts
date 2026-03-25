import { describe, expect, it } from "bun:test";
import type { IroncladTransformContext } from "@openbeam/types/services/connectors/ironclad";
import { transformApproval } from "../transformers/approval";
import { transformComment } from "../transformers/comment";
import { transformRecord } from "../transformers/record";
import { transformWorkflow } from "../transformers/workflow";

const CONTEXT: IroncladTransformContext = {
  connectorId: "conn_ironclad_1",
  connectorType: "IRONCLAD",
  teamId: "team_1",
  workspaceId: "ws_1",
};

describe("transformWorkflow", () => {
  it("transforms a workflow with attributes", async () => {
    const workflow = {
      id: "wf-1",
      title: "NDA with Acme Corp",
      template: "Mutual NDA",
      status: "In Review",
      step: "Legal Review",
      creator: {
        id: "u-1",
        name: "Alice Smith",
        email: "alice@example.com",
      },
      attributes: {
        counterpartyName: "Acme Corp",
        effectiveDate: "2024-06-01",
      },
      created: "2024-01-01T00:00:00Z",
      lastUpdated: "2024-01-15T00:00:00Z",
    };

    const doc = await transformWorkflow(workflow, CONTEXT);

    expect(doc.id).toBe("conn_ironclad_1_workflow_wf-1");
    expect(doc.document_type).toBe("workflow");
    expect(doc.title).toBe("NDA with Acme Corp");
    expect(doc.content).toContain("Status: In Review");
    expect(doc.content).toContain("Step: Legal Review");
    expect(doc.content).toContain("Template: Mutual NDA");
    expect(doc.content).toContain("Creator: Alice Smith");
    expect(doc.content).toContain("Counterparty: Acme Corp");
    expect(doc.author_name).toBe("Alice Smith");
    expect(doc.author_email).toBe("alice@example.com");
    expect(doc.metadata?.status).toBe("In Review");
    expect(doc.metadata?.template).toBe("Mutual NDA");
    expect(doc.url).toBe("https://ironcladapp.com/workflow/wf-1");
  });

  it("handles workflow without title", async () => {
    const workflow = {
      id: "wf-2",
      title: "",
      template: "MSA",
      status: "Draft",
      step: "Creation",
      creator: { id: "u-1", name: "Bob", email: "bob@example.com" },
      attributes: {},
      created: "2024-01-01T00:00:00Z",
      lastUpdated: "2024-01-01T00:00:00Z",
    };

    const doc = await transformWorkflow(workflow, CONTEXT);

    expect(doc.title).toBe("Workflow wf-2");
  });
});

describe("transformRecord", () => {
  it("transforms a record with counterparty", async () => {
    const record = {
      id: "rec-1",
      name: "Acme Corp MSA 2024",
      type: "Master Service Agreement",
      status: "Executed",
      counterpartyName: "Acme Corp",
      properties: {
        effectiveDate: "2024-01-01",
        expirationDate: "2025-01-01",
        totalValue: "$500,000",
      },
      created: "2024-01-01T00:00:00Z",
      lastUpdated: "2024-06-01T00:00:00Z",
    };

    const doc = await transformRecord(record, CONTEXT);

    expect(doc.id).toBe("conn_ironclad_1_record_rec-1");
    expect(doc.document_type).toBe("record");
    expect(doc.title).toBe("Acme Corp MSA 2024");
    expect(doc.content).toContain("Type: Master Service Agreement");
    expect(doc.content).toContain("Status: Executed");
    expect(doc.content).toContain("Counterparty: Acme Corp");
    expect(doc.content).toContain("effectiveDate: 2024-01-01");
    expect(doc.metadata?.counterparty).toBe("Acme Corp");
    expect(doc.metadata?.recordType).toBe("Master Service Agreement");
  });
});

describe("transformApproval", () => {
  it("transforms an approval with reviewer", async () => {
    const approval = {
      id: "appr-1",
      workflowId: "wf-1",
      role: "Legal Reviewer",
      status: "Pending",
      assignee: {
        id: "u-2",
        name: "Carol Lee",
        email: "carol@example.com",
      },
      created: "2024-01-05T00:00:00Z",
      lastUpdated: "2024-01-05T00:00:00Z",
    };

    const doc = await transformApproval(approval, "NDA with Acme", CONTEXT);

    expect(doc.id).toBe("conn_ironclad_1_approval_appr-1");
    expect(doc.document_type).toBe("approval");
    expect(doc.title).toBe("Approval: Legal Reviewer - NDA with Acme");
    expect(doc.content).toContain("Role: Legal Reviewer");
    expect(doc.content).toContain("Status: Pending");
    expect(doc.content).toContain("Reviewer: Carol Lee");
    expect(doc.metadata?.role).toBe("Legal Reviewer");
    expect(doc.metadata?.workflowId).toBe("wf-1");
    expect(doc.author_name).toBe("Carol Lee");
  });

  it("includes completed date when present", async () => {
    const approval = {
      id: "appr-2",
      workflowId: "wf-1",
      role: "Finance",
      status: "Approved",
      assignee: { id: "u-3", name: "Dave", email: "dave@example.com" },
      completedDate: "2024-01-10T00:00:00Z",
      created: "2024-01-05T00:00:00Z",
      lastUpdated: "2024-01-10T00:00:00Z",
    };

    const doc = await transformApproval(approval, "MSA", CONTEXT);

    expect(doc.content).toContain("Completed: 2024-01-10T00:00:00Z");
    expect(doc.metadata?.completedDate).toBe("2024-01-10T00:00:00Z");
  });
});

describe("transformComment", () => {
  it("transforms a comment", async () => {
    const comment = {
      id: "cmt-1",
      workflowId: "wf-1",
      body: "Please review section 3.2 regarding indemnification.",
      author: {
        id: "u-1",
        name: "Alice Smith",
        email: "alice@example.com",
      },
      created: "2024-01-08T00:00:00Z",
      lastUpdated: "2024-01-08T00:00:00Z",
    };

    const doc = await transformComment(comment, "NDA with Acme", CONTEXT);

    expect(doc.id).toBe("conn_ironclad_1_comment_cmt-1");
    expect(doc.document_type).toBe("comment");
    expect(doc.title).toContain("Comment on NDA with Acme");
    expect(doc.content).toContain("review section 3.2");
    expect(doc.author_name).toBe("Alice Smith");
    expect(doc.metadata?.workflowId).toBe("wf-1");
  });

  it("strips HTML from comment body", async () => {
    const comment = {
      id: "cmt-2",
      workflowId: "wf-1",
      body: "<p>This is <strong>important</strong></p>",
      author: { id: "u-2", name: "Bob", email: "bob@example.com" },
      created: "2024-01-09T00:00:00Z",
      lastUpdated: "2024-01-09T00:00:00Z",
    };

    const doc = await transformComment(comment, "MSA", CONTEXT);

    expect(doc.content).toBe("This is important");
    expect(doc.content).not.toContain("<p>");
    expect(doc.content).not.toContain("<strong>");
  });
});
