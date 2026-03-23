import { describe, expect, it } from "bun:test";
import type { FreshserviceTransformContext } from "@openbeam/types/services/connectors/freshservice";
import { transformArticle } from "../transformers/article";
import { transformChange } from "../transformers/change";
import { transformProblem } from "../transformers/problem";
import { transformTicket } from "../transformers/ticket";

const CONTEXT: FreshserviceTransformContext = {
  connectorId: "conn_fs_123",
  connectorType: "FRESHSERVICE",
  teamId: "team_456",
  workspaceId: "ws_789",
  domain: "acme",
};

describe("transformTicket", () => {
  it("transforms a basic ticket", async () => {
    const ticket = {
      id: 42,
      subject: "Laptop not booting",
      description_text: "My laptop shows a black screen on startup",
      status: 2,
      priority: 3,
      type: "Incident",
      created_at: "2026-03-20T10:00:00Z",
      updated_at: "2026-03-21T14:30:00Z",
      tags: ["hardware", "urgent"],
      requester: { name: "Jane Doe", email: "jane@acme.com" },
      category: "Hardware",
    };

    const doc = await transformTicket(ticket, CONTEXT);

    expect(doc.id).toBe("conn_fs_123_ticket_42");
    expect(doc.title).toBe("[#42] Laptop not booting");
    expect(doc.document_type).toBe("ticket");
    expect(doc.document_subtype).toBe("High");
    expect(doc.url).toBe("https://acme.freshservice.com/helpdesk/tickets/42");
    expect(doc.content).toContain("black screen");
    expect(doc.content).toContain("Status: Open");
    expect(doc.content).toContain("Priority: High");
    expect(doc.content).toContain("Type: Incident");
    expect(doc.content).toContain("Tags: hardware, urgent");
    expect(doc.metadata?.status).toBe("Open");
    expect(doc.metadata?.priority).toBe("High");
    expect(doc.metadata?.requesterName).toBe("Jane Doe");
    expect(doc.author_name).toBe("Jane Doe");
    expect(doc.is_public).toBe(false);
    expect(doc.connector_id).toBe("conn_fs_123");
    expect(doc.team_id).toBe("team_456");
    expect(doc.checksum).toBeDefined();
  });

  it("handles missing optional fields", async () => {
    const ticket = {
      id: 1,
      subject: "Simple ticket",
      status: 5,
      priority: 1,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    const doc = await transformTicket(ticket, CONTEXT);

    expect(doc.title).toBe("[#1] Simple ticket");
    expect(doc.content).toContain("Status: Closed");
    expect(doc.content).toContain("Priority: Low");
    expect(doc.author_name).toBeUndefined();
  });
});

describe("transformArticle", () => {
  it("transforms a knowledge article", async () => {
    const article = {
      id: 100,
      title: "How to reset your password",
      description_text: "Follow these steps to reset your password...",
      status: 2,
      created_at: "2026-02-10T09:00:00Z",
      updated_at: "2026-03-15T12:00:00Z",
      tags: ["password", "self-service"],
      folder: { name: "Account Management" },
      category: { name: "IT Knowledge Base" },
    };

    const doc = await transformArticle(article, CONTEXT);

    expect(doc.id).toBe("conn_fs_123_article_100");
    expect(doc.title).toBe("How to reset your password");
    expect(doc.document_type).toBe("article");
    expect(doc.url).toBe(
      "https://acme.freshservice.com/support/solutions/articles/100"
    );
    expect(doc.content).toContain("reset your password");
    expect(doc.content).toContain("Folder: Account Management");
    expect(doc.is_public).toBe(true);
    expect(doc.metadata?.folderName).toBe("Account Management");
  });
});

describe("transformChange", () => {
  it("transforms a change request", async () => {
    const change = {
      id: 55,
      subject: "Upgrade database to v15",
      description_text: "Migrate production database to PostgreSQL 15",
      status: 3,
      priority: 2,
      change_type: 2,
      created_at: "2026-03-01T08:00:00Z",
      updated_at: "2026-03-10T16:00:00Z",
      planned_start_date: "2026-03-15T02:00:00Z",
      planned_end_date: "2026-03-15T06:00:00Z",
    };

    const doc = await transformChange(change, CONTEXT);

    expect(doc.id).toBe("conn_fs_123_change_55");
    expect(doc.title).toBe("[Change #55] Upgrade database to v15");
    expect(doc.document_type).toBe("change");
    expect(doc.document_subtype).toBe("Standard");
    expect(doc.content).toContain("Status: Awaiting Approval");
    expect(doc.content).toContain("Change Type: Standard");
    expect(doc.metadata?.changeType).toBe("Standard");
  });
});

describe("transformProblem", () => {
  it("transforms a problem record", async () => {
    const problem = {
      id: 33,
      subject: "Recurring VPN disconnects",
      description_text: "Multiple users report VPN dropping every 30 minutes",
      status: 1,
      priority: 3,
      impact: 3,
      known_error: true,
      created_at: "2026-02-20T11:00:00Z",
      updated_at: "2026-03-18T09:00:00Z",
      category: "Network",
    };

    const doc = await transformProblem(problem, CONTEXT);

    expect(doc.id).toBe("conn_fs_123_problem_33");
    expect(doc.title).toBe("[Problem #33] Recurring VPN disconnects");
    expect(doc.document_type).toBe("problem");
    expect(doc.content).toContain("Status: Open");
    expect(doc.content).toContain("Impact: High");
    expect(doc.content).toContain("Known Error: Yes");
    expect(doc.metadata?.impact).toBe("High");
    expect(doc.metadata?.knownError).toBe(true);
  });
});
