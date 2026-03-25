import { describe, expect, it } from "bun:test";
import type { HaystackTransformContext } from "@openbeam/types/services/connectors/haystack";
import { transformDepartment } from "../transformers/department";
import { transformLocation } from "../transformers/location";
import { transformPerson } from "../transformers/person";
import { transformTeam } from "../transformers/team";

const CONTEXT: HaystackTransformContext = {
  connectorId: "conn_haystack_1",
  connectorType: "HAYSTACK",
  teamId: "team_1",
  workspaceId: "ws_1",
};

describe("transformPerson", () => {
  it("transforms a person with full profile", async () => {
    const person = {
      id: "p-1",
      first_name: "Alice",
      last_name: "Smith",
      email: "alice@example.com",
      title: "Senior Engineer",
      department: { id: "d-1", name: "Engineering" },
      team: { id: "t-1", name: "Platform" },
      manager: {
        id: "p-2",
        first_name: "Bob",
        last_name: "Jones",
        email: "bob@example.com",
      },
      location: {
        id: "l-1",
        name: "SF Office",
        city: "San Francisco",
        country: "US",
      },
      phone: "+1-555-0100",
      start_date: "2023-06-01",
      bio: "Builds infrastructure at scale",
      pronouns: "she/her",
      status: "active",
      created_at: "2023-06-01T00:00:00Z",
      updated_at: "2024-01-15T00:00:00Z",
    };

    const doc = await transformPerson(person, CONTEXT);

    expect(doc.id).toBe("conn_haystack_1_person_p-1");
    expect(doc.document_type).toBe("person");
    expect(doc.title).toBe("Alice Smith");
    expect(doc.content).toContain("Senior Engineer");
    expect(doc.content).toContain("Department: Engineering");
    expect(doc.content).toContain("Team: Platform");
    expect(doc.content).toContain("Manager: Bob Jones");
    expect(doc.content).toContain("Location: SF Office, San Francisco, US");
    expect(doc.content).toContain("Email: alice@example.com");
    expect(doc.content).toContain("Phone: +1-555-0100");
    expect(doc.content).toContain("Builds infrastructure at scale");
    expect(doc.content).toContain("Pronouns: she/her");
    expect(doc.author_name).toBe("Alice Smith");
    expect(doc.author_email).toBe("alice@example.com");
    expect(doc.metadata?.department).toBe("Engineering");
    expect(doc.metadata?.team).toBe("Platform");
    expect(doc.metadata?.manager).toBe("Bob Jones");
  });

  it("transforms a minimal person", async () => {
    const person = {
      id: "p-3",
      first_name: "Charlie",
      last_name: "Davis",
      email: "charlie@example.com",
      status: "active",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    const doc = await transformPerson(person, CONTEXT);

    expect(doc.id).toBe("conn_haystack_1_person_p-3");
    expect(doc.title).toBe("Charlie Davis");
    expect(doc.content).toContain("Email: charlie@example.com");
    expect(doc.metadata?.department).toBeUndefined();
    expect(doc.metadata?.team).toBeUndefined();
  });
});

describe("transformTeam", () => {
  it("transforms a team with lead and members", async () => {
    const team = {
      id: "t-1",
      name: "Platform",
      description: "Core infrastructure team",
      lead: {
        id: "p-1",
        first_name: "Alice",
        last_name: "Smith",
        email: "alice@example.com",
      },
      member_count: 8,
      members: [
        { id: "p-1", first_name: "Alice", last_name: "Smith" },
        { id: "p-3", first_name: "Charlie", last_name: "Davis" },
      ],
      created_at: "2023-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    const doc = await transformTeam(team, CONTEXT);

    expect(doc.id).toBe("conn_haystack_1_team_t-1");
    expect(doc.document_type).toBe("team");
    expect(doc.title).toBe("Platform");
    expect(doc.content).toContain("Core infrastructure team");
    expect(doc.content).toContain("Lead: Alice Smith");
    expect(doc.content).toContain("Members: 8");
    expect(doc.content).toContain("Team Members: Alice Smith, Charlie Davis");
    expect(doc.metadata?.memberCount).toBe("8");
    expect(doc.metadata?.lead).toBe("Alice Smith");
    expect(doc.author_name).toBe("Alice Smith");
  });
});

describe("transformDepartment", () => {
  it("transforms a department with hierarchy", async () => {
    const dept = {
      id: "d-1",
      name: "Engineering",
      description: "Product engineering organization",
      head: {
        id: "p-5",
        first_name: "Eve",
        last_name: "Wilson",
        email: "eve@example.com",
      },
      parent: { id: "d-0", name: "Technology" },
      headcount: 45,
      created_at: "2022-01-01T00:00:00Z",
      updated_at: "2024-02-01T00:00:00Z",
    };

    const doc = await transformDepartment(dept, CONTEXT);

    expect(doc.id).toBe("conn_haystack_1_department_d-1");
    expect(doc.document_type).toBe("department");
    expect(doc.title).toBe("Engineering");
    expect(doc.content).toContain("Product engineering organization");
    expect(doc.content).toContain("Head: Eve Wilson");
    expect(doc.content).toContain("Headcount: 45");
    expect(doc.content).toContain("Parent Department: Technology");
    expect(doc.metadata?.headcount).toBe("45");
    expect(doc.metadata?.head).toBe("Eve Wilson");
    expect(doc.metadata?.parentDepartment).toBe("Technology");
  });
});

describe("transformLocation", () => {
  it("transforms a location with full address", async () => {
    const location = {
      id: "l-1",
      name: "SF Headquarters",
      address: "123 Market St",
      city: "San Francisco",
      state: "CA",
      country: "US",
      zip_code: "94105",
      timezone: "America/Los_Angeles",
      phone: "+1-555-0200",
      capacity: 500,
      created_at: "2020-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    const doc = await transformLocation(location, CONTEXT);

    expect(doc.id).toBe("conn_haystack_1_location_l-1");
    expect(doc.document_type).toBe("location");
    expect(doc.title).toBe("SF Headquarters");
    expect(doc.content).toContain("Address: 123 Market St");
    expect(doc.content).toContain("San Francisco, CA, US, 94105");
    expect(doc.content).toContain("Timezone: America/Los_Angeles");
    expect(doc.content).toContain("Capacity: 500");
    expect(doc.metadata?.city).toBe("San Francisco");
    expect(doc.metadata?.country).toBe("US");
    expect(doc.metadata?.capacity).toBe("500");
  });

  it("transforms a minimal location", async () => {
    const location = {
      id: "l-2",
      name: "Remote",
      created_at: "2023-01-01T00:00:00Z",
      updated_at: "2023-01-01T00:00:00Z",
    };

    const doc = await transformLocation(location, CONTEXT);

    expect(doc.id).toBe("conn_haystack_1_location_l-2");
    expect(doc.title).toBe("Remote");
    expect(doc.metadata?.city).toBeUndefined();
  });
});
