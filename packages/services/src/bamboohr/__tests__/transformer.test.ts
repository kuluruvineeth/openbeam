import { describe, expect, it } from "bun:test";
import type { BambooHRTransformContext } from "@openbeam/types/services/connectors/bamboohr";
import type { BambooHREmployee, BambooHRTimeOffRequest } from "../client";
import {
  transformEmployee,
  transformEmployees,
} from "../transformers/employee";
import {
  transformTimeOffRequest,
  transformTimeOffRequests,
} from "../transformers/time-off";

const CONTEXT: BambooHRTransformContext = {
  connectorId: "conn_test_123",
  connectorType: "BAMBOOHR",
  teamId: "team_abc",
  workspaceId: "ws_xyz",
  subdomain: "acme",
};

function makeEmployee(
  overrides: Partial<BambooHREmployee> = {}
): BambooHREmployee {
  return {
    id: "101",
    displayName: "Jane Smith",
    firstName: "Jane",
    lastName: "Smith",
    preferredName: "",
    workEmail: "jane@acme.com",
    homeEmail: "jane@home.com",
    bestEmail: "jane@acme.com",
    jobTitle: "Software Engineer",
    department: "Engineering",
    division: "Product",
    location: "San Francisco",
    workPhone: "415-555-1234",
    mobilePhone: "415-555-5678",
    hireDate: "2023-06-15",
    originalHireDate: "2023-06-15",
    status: "Active",
    employeeNumber: "EMP-101",
    supervisor: "John Doe",
    supervisorEId: "100",
    supervisorEmail: "john@acme.com",
    photoUrl: "",
    employmentHistoryStatus: "Full-Time",
    terminationDate: "",
    country: "US",
    city: "San Francisco",
    state: "CA",
    ...overrides,
  };
}

function makeTimeOffRequest(
  overrides: Partial<BambooHRTimeOffRequest> = {}
): BambooHRTimeOffRequest {
  return {
    id: "501",
    employeeId: "101",
    name: "Jane Smith",
    status: {
      lastChanged: "2024-01-10T12:00:00Z",
      lastChangedByUserId: "100",
      status: "approved",
    },
    start: "2024-02-01",
    end: "2024-02-05",
    created: "2024-01-08T09:00:00Z",
    type: { id: "1", name: "Vacation", icon: "palm-tree" },
    amount: { unit: "days", amount: "5" },
    notes: { employee: "Family trip", manager: "Approved" },
    dates: { "2024-02-01": "1", "2024-02-02": "1" },
    ...overrides,
  };
}

describe("transformEmployee", () => {
  it("produces a valid GenericDocument with all fields", async () => {
    const emp = makeEmployee();
    const doc = await transformEmployee(emp, CONTEXT);

    expect(doc.id).toBe("conn_test_123_employee_101");
    expect(doc.connector_id).toBe("conn_test_123");
    expect(doc.connector_type).toBe("BAMBOOHR");
    expect(doc.team_id).toBe("team_abc");
    expect(doc.external_id).toBe("101");
    expect(doc.document_type).toBe("employee");
    expect(doc.title).toBe("Jane Smith");
    expect(doc.url).toContain("acme.bamboohr.com");
    expect(doc.url).toContain("id=101");
    expect(doc.is_public).toBe(false);
    expect(doc.author_email).toBe("jane@acme.com");
    expect(doc.author_name).toBe("Jane Smith");
    expect(doc.checksum).toBeDefined();
  });

  it("includes department and title in content", async () => {
    const doc = await transformEmployee(makeEmployee(), CONTEXT);

    expect(doc.content).toContain("Title: Software Engineer");
    expect(doc.content).toContain("Department: Engineering");
    expect(doc.content).toContain("Division: Product");
    expect(doc.content).toContain("Location: San Francisco");
    expect(doc.content).toContain("Reports To: John Doe");
  });

  it("populates metadata fields", async () => {
    const doc = await transformEmployee(makeEmployee(), CONTEXT);

    expect(doc.metadata?.jobTitle).toBe("Software Engineer");
    expect(doc.metadata?.department).toBe("Engineering");
    expect(doc.metadata?.status).toBe("Active");
    expect(doc.metadata?.subdomain).toBe("acme");
    expect(doc.metadata?.supervisorEId).toBe("100");
  });

  it("falls back to firstName+lastName when displayName is empty", async () => {
    const emp = makeEmployee({ displayName: "" });
    const doc = await transformEmployee(emp, CONTEXT);

    expect(doc.title).toBe("Jane Smith");
  });

  it("handles inactive employees", async () => {
    const emp = makeEmployee({ status: "Inactive" });
    const doc = await transformEmployee(emp, CONTEXT);

    expect(doc.document_subtype).toBe("inactive");
    expect(doc.metadata?.status).toBe("Inactive");
  });
});

describe("transformEmployees", () => {
  it("transforms a batch of employees", async () => {
    const employees = [
      makeEmployee({ id: "1", displayName: "Alice" }),
      makeEmployee({ id: "2", displayName: "Bob" }),
    ];
    const docs = await transformEmployees(employees, CONTEXT);

    expect(docs).toHaveLength(2);
    expect(docs[0]?.id).toBe("conn_test_123_employee_1");
    expect(docs[1]?.id).toBe("conn_test_123_employee_2");
  });
});

describe("transformTimeOffRequest", () => {
  it("produces a valid GenericDocument", async () => {
    const req = makeTimeOffRequest();
    const doc = await transformTimeOffRequest(req, CONTEXT);

    expect(doc.id).toBe("conn_test_123_timeoff_501");
    expect(doc.connector_id).toBe("conn_test_123");
    expect(doc.document_type).toBe("time_off_request");
    expect(doc.title).toContain("Jane Smith");
    expect(doc.title).toContain("Vacation");
    expect(doc.author_id).toBe("101");
    expect(doc.author_name).toBe("Jane Smith");
  });

  it("includes time off details in content", async () => {
    const doc = await transformTimeOffRequest(makeTimeOffRequest(), CONTEXT);

    expect(doc.content).toContain("Type: Vacation");
    expect(doc.content).toContain("Start: 2024-02-01");
    expect(doc.content).toContain("End: 2024-02-05");
    expect(doc.content).toContain("Status: approved");
    expect(doc.content).toContain("Amount: 5 days");
  });

  it("populates metadata", async () => {
    const doc = await transformTimeOffRequest(makeTimeOffRequest(), CONTEXT);

    expect(doc.metadata?.employeeId).toBe("101");
    expect(doc.metadata?.typeName).toBe("Vacation");
    expect(doc.metadata?.status).toBe("approved");
  });
});

describe("transformTimeOffRequests", () => {
  it("transforms a batch of requests", async () => {
    const requests = [
      makeTimeOffRequest({ id: "1" }),
      makeTimeOffRequest({ id: "2" }),
    ];
    const docs = await transformTimeOffRequests(requests, CONTEXT);

    expect(docs).toHaveLength(2);
    expect(docs[0]?.id).toBe("conn_test_123_timeoff_1");
    expect(docs[1]?.id).toBe("conn_test_123_timeoff_2");
  });
});
