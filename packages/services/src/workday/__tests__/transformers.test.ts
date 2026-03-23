import { describe, expect, it } from "bun:test";
import type { WorkdayTransformContext } from "@openbeam/types/services/connectors/workday";
import type { WorkdayOrganization, WorkdayWorker } from "../client";
import { transformOrganization } from "../transformers/organization";
import { transformWorker } from "../transformers/worker";

const CTX: WorkdayTransformContext = {
  connectorId: "conn_wd_1",
  connectorType: "WORKDAY",
  teamId: "team_1",
  workspaceId: "acme_prod",
  tenant: "acme_prod",
  host: "wd5-services1.myworkday.com",
};

describe("transformWorker", () => {
  const worker: WorkdayWorker = {
    id: "wk_001",
    descriptor: "Jane Smith",
    primaryWorkEmail: "jane.smith@acme.com",
    primaryWorkPhone: "+1-555-0100",
    businessTitle: "Staff Engineer",
    supervisoryOrganization: { id: "org_eng", descriptor: "Engineering" },
    location: { id: "loc_sf", descriptor: "San Francisco" },
    hireDate: "2022-03-15",
    workerType: "Regular",
    isActive: true,
    firstName: "Jane",
    lastName: "Smith",
    employeeId: "EMP-1234",
  };

  it("produces correct document structure", async () => {
    const doc = await transformWorker(worker, CTX);

    expect(doc.id).toBe("conn_wd_1_worker_wk_001");
    expect(doc.connector_id).toBe("conn_wd_1");
    expect(doc.connector_type).toBe("WORKDAY");
    expect(doc.team_id).toBe("team_1");
    expect(doc.external_id).toBe("wk_001");
    expect(doc.document_type).toBe("worker");
    expect(doc.document_subtype).toBe("active");
    expect(doc.title).toBe("Jane Smith");
    expect(doc.source_type).toBe("workday");
    expect(doc.is_public).toBe(false);
    expect(doc.author_email).toBe("jane.smith@acme.com");
    expect(doc.author_name).toBe("Jane Smith");
  });

  it("includes all searchable content", async () => {
    const doc = await transformWorker(worker, CTX);

    expect(doc.content).toContain("Name: Jane Smith");
    expect(doc.content).toContain("Title: Staff Engineer");
    expect(doc.content).toContain("Department: Engineering");
    expect(doc.content).toContain("Location: San Francisco");
    expect(doc.content).toContain("Email: jane.smith@acme.com");
    expect(doc.content).toContain("Hire Date: 2022-03-15");
    expect(doc.content).toContain("Worker Type: Regular");
    expect(doc.content).toContain("Employee ID: EMP-1234");
  });

  it("populates metadata for filtering", async () => {
    const doc = await transformWorker(worker, CTX);
    const meta = doc.metadata;

    expect(meta).toBeDefined();
    expect(meta?.workerId).toBe("wk_001");
    expect(meta?.businessTitle).toBe("Staff Engineer");
    expect(meta?.department).toBe("Engineering");
    expect(meta?.location).toBe("San Francisco");
    expect(meta?.tenant).toBe("acme_prod");
    expect(meta?.isActive).toBe("true");
  });

  it("generates a checksum", async () => {
    const doc = await transformWorker(worker, CTX);
    expect(doc.checksum).toBeDefined();
    expect(typeof doc.checksum).toBe("string");
    expect(doc.checksum!.length).toBeGreaterThan(0);
  });

  it("marks inactive workers correctly", async () => {
    const inactive: WorkdayWorker = { ...worker, isActive: false };
    const doc = await transformWorker(inactive, CTX);
    expect(doc.document_subtype).toBe("inactive");
  });

  it("handles missing optional fields", async () => {
    const minimal: WorkdayWorker = {
      id: "wk_002",
      descriptor: "Unknown",
    };
    const doc = await transformWorker(minimal, CTX);

    expect(doc.title).toBe("Unknown");
    expect(doc.author_email).toBe("");
    expect(doc.content).toContain("Name: Unknown");
  });

  it("builds URL with encoded tenant and host", async () => {
    const doc = await transformWorker(worker, CTX);
    expect(doc.url).toContain("wd5-services1.myworkday.com");
    expect(doc.url).toContain("acme_prod");
    expect(doc.url).toContain("wk_001");
  });
});

describe("transformOrganization", () => {
  const org: WorkdayOrganization = {
    id: "org_eng",
    descriptor: "Engineering",
    organizationType: "Supervisory",
    parent: { id: "org_tech", descriptor: "Technology" },
    manager: { id: "wk_mgr", descriptor: "John Director" },
    memberCount: 42,
    isActive: true,
  };

  it("produces correct document structure", async () => {
    const doc = await transformOrganization(org, CTX);

    expect(doc.id).toBe("conn_wd_1_org_org_eng");
    expect(doc.connector_id).toBe("conn_wd_1");
    expect(doc.document_type).toBe("organization");
    expect(doc.document_subtype).toBe("supervisory");
    expect(doc.title).toBe("Engineering");
    expect(doc.source_type).toBe("workday");
    expect(doc.author_name).toBe("John Director");
  });

  it("includes org hierarchy in content", async () => {
    const doc = await transformOrganization(org, CTX);

    expect(doc.content).toContain("Organization: Engineering");
    expect(doc.content).toContain("Type: Supervisory");
    expect(doc.content).toContain("Parent: Technology");
    expect(doc.content).toContain("Manager: John Director");
    expect(doc.content).toContain("Members: 42");
  });

  it("populates metadata", async () => {
    const doc = await transformOrganization(org, CTX);
    const meta = doc.metadata;

    expect(meta?.organizationType).toBe("Supervisory");
    expect(meta?.parentName).toBe("Technology");
    expect(meta?.managerName).toBe("John Director");
    expect(meta?.memberCount).toBe("42");
    expect(meta?.tenant).toBe("acme_prod");
  });
});
