import { describe, expect, it } from "bun:test";
import type { AhaTransformContext } from "@openbeam/types/services/connectors/aha";
import { transformEpic } from "../transformers/epic";
import { transformFeature } from "../transformers/feature";
import { transformIdea } from "../transformers/idea";
import { transformInitiative } from "../transformers/initiative";
import { transformRelease } from "../transformers/release";

const CONTEXT: AhaTransformContext = {
  connectorId: "conn_aha_1",
  connectorType: "AHA",
  teamId: "team_1",
  workspaceId: "ws_1",
  subdomain: "testco",
};

describe("transformIdea", () => {
  it("transforms a basic idea", async () => {
    const idea = {
      id: "idea-1",
      reference_num: "IDEA-1",
      name: "Add dark mode",
      description: {
        body: "<p>Users want dark mode</p>",
        created_at: "2024-01-01T00:00:00Z",
        attachments: [],
      },
      workflow_status: { id: "ws-1", name: "Under review", color: "#ff0000" },
      categories: [{ id: "cat-1", name: "UX" }],
      visibility: "public",
      num_endorsements: 5,
      score: 80,
      initial_votes: 12,
      has_been_promoted: false,
      assigned_to_user: { id: "u-1", name: "Alice", email: "alice@test.com" },
      created_by_user: { id: "u-2", name: "Bob" },
      product_id: "prod-1",
      url: "https://testco.aha.io/ideas/IDEA-1",
      resource: "ideas",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-15T00:00:00Z",
    };

    const doc = await transformIdea(idea, CONTEXT);

    expect(doc.id).toBe("conn_aha_1_idea_idea-1");
    expect(doc.document_type).toBe("idea");
    expect(doc.title).toBe("Add dark mode");
    expect(doc.content).toContain("Users want dark mode");
    expect(doc.content).toContain("Status: Under review");
    expect(doc.content).toContain("Categories: UX");
    expect(doc.content).toContain("Votes: 12");
    expect(doc.author_name).toBe("Alice");
    expect(doc.metadata?.referenceNum).toBe("IDEA-1");
    expect(doc.metadata?.votes).toBe("12");
    expect(doc.url).toBe("https://testco.aha.io/ideas/IDEA-1");
  });
});

describe("transformFeature", () => {
  it("transforms a feature with release and epic", async () => {
    const feature = {
      id: "feat-1",
      reference_num: "FEAT-1",
      name: "OAuth integration",
      description: {
        body: "Add OAuth 2.0 support",
        created_at: "2024-01-01T00:00:00Z",
        attachments: [],
      },
      workflow_status: { id: "ws-1", name: "In progress", color: "#00ff00" },
      assigned_to_user: { id: "u-1", name: "Alice", email: "alice@test.com" },
      created_by_user: { id: "u-2", name: "Bob" },
      due_date: "2024-03-01",
      start_date: "2024-02-01",
      release: { id: "rel-1", reference_num: "REL-1", name: "v2.0" },
      initiative: { id: "init-1", name: "Platform growth" },
      epic: { id: "epic-1", reference_num: "EPIC-1", name: "Auth overhaul" },
      score: 90,
      tags: ["auth", "security"],
      product_id: "prod-1",
      url: "https://testco.aha.io/features/FEAT-1",
      resource: "features",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-02-01T00:00:00Z",
    };

    const doc = await transformFeature(feature, CONTEXT);

    expect(doc.id).toBe("conn_aha_1_feature_feat-1");
    expect(doc.document_type).toBe("feature");
    expect(doc.content).toContain("OAuth 2.0 support");
    expect(doc.content).toContain("Release: v2.0");
    expect(doc.content).toContain("Epic: Auth overhaul");
    expect(doc.content).toContain("Tags: auth, security");
    expect(doc.metadata?.releaseName).toBe("v2.0");
    expect(doc.metadata?.epicName).toBe("Auth overhaul");
  });
});

describe("transformRelease", () => {
  it("transforms a release", async () => {
    const release = {
      id: "rel-1",
      reference_num: "REL-1",
      name: "v2.0",
      release_date: "2024-06-01",
      released: false,
      parking_lot: false,
      theme: { body: "<p>Major platform update</p>" },
      workflow_status: { id: "ws-1", name: "In development", color: "#0000ff" },
      owner: { id: "u-1", name: "Alice", email: "alice@test.com" },
      progress: 45.5,
      progress_source: "feature_completion",
      product_id: "prod-1",
      url: "https://testco.aha.io/releases/REL-1",
      resource: "releases",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-03-01T00:00:00Z",
    };

    const doc = await transformRelease(release, CONTEXT);

    expect(doc.id).toBe("conn_aha_1_release_rel-1");
    expect(doc.document_type).toBe("release");
    expect(doc.content).toContain("Major platform update");
    expect(doc.content).toContain("Progress: 46%");
    expect(doc.metadata?.progress).toBe("46");
    expect(doc.metadata?.released).toBe(false);
  });
});

describe("transformInitiative", () => {
  it("transforms an initiative", async () => {
    const initiative = {
      id: "init-1",
      name: "Platform growth",
      description: {
        body: "Grow the platform",
        created_at: "2024-01-01T00:00:00Z",
      },
      status: "In progress",
      color: "#00ff00",
      progress: 60,
      progress_source: "manual",
      effort: { value: 3, text: "Large" },
      value: { value: 5, text: "Critical" },
      url: "https://testco.aha.io/initiatives/init-1",
      resource: "initiatives",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-02-01T00:00:00Z",
    };

    const doc = await transformInitiative(initiative, CONTEXT);

    expect(doc.id).toBe("conn_aha_1_initiative_init-1");
    expect(doc.document_type).toBe("initiative");
    expect(doc.content).toContain("Progress: 60%");
    expect(doc.content).toContain("Effort: Large");
    expect(doc.content).toContain("Value: Critical");
  });
});

describe("transformEpic", () => {
  it("transforms an epic", async () => {
    const epic = {
      id: "epic-1",
      reference_num: "EPIC-1",
      name: "Auth overhaul",
      description: {
        body: "Revamp authentication",
        created_at: "2024-01-01T00:00:00Z",
      },
      workflow_status: { id: "ws-1", name: "Planned", color: "#ffff00" },
      progress: 0,
      progress_source: "feature_completion",
      color: "#ff0000",
      product_id: "prod-1",
      url: "https://testco.aha.io/epics/EPIC-1",
      resource: "epics",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    const doc = await transformEpic(epic, CONTEXT);

    expect(doc.id).toBe("conn_aha_1_epic_epic-1");
    expect(doc.document_type).toBe("epic");
    expect(doc.content).toContain("Revamp authentication");
    expect(doc.content).toContain("Status: Planned");
    expect(doc.metadata?.referenceNum).toBe("EPIC-1");
  });
});
