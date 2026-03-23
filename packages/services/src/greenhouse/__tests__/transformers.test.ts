import { describe, expect, test } from "bun:test";
import type { GreenhouseTransformContext } from "@openbeam/types/services/connectors/greenhouse";
import type {
  GreenhouseApplication,
  GreenhouseCandidate,
  GreenhouseJob,
  GreenhouseOffer,
} from "../client";
import { transformApplication } from "../transformers/application";
import { transformCandidate } from "../transformers/candidate";
import { transformJob } from "../transformers/job";
import { transformOffer } from "../transformers/offer";

const CTX: GreenhouseTransformContext = {
  connectorId: "conn_gh_1",
  connectorType: "GREENHOUSE",
  teamId: "team_1",
  workspaceId: "ws_1",
};

const SAMPLE_JOB: GreenhouseJob = {
  id: 101,
  name: "Senior Engineer",
  status: "open",
  departments: [{ id: 1, name: "Engineering" }],
  offices: [{ id: 10, name: "San Francisco" }],
  hiring_team: {
    hiring_managers: [
      {
        user_id: 50,
        first_name: "Alice",
        last_name: "Smith",
        name: "Alice Smith",
      },
    ],
    recruiters: [
      { user_id: 51, first_name: "Bob", last_name: "Jones", name: "Bob Jones" },
    ],
    coordinators: [],
  },
  openings: [
    { id: 200, status: "open" },
    { id: 201, status: "closed" },
  ],
  created_at: "2025-01-15T10:00:00Z",
  updated_at: "2025-06-20T14:30:00Z",
  notes: "Backfill for departed team member",
  confidential: false,
  is_template: false,
};

const SAMPLE_CANDIDATE: GreenhouseCandidate = {
  id: 300,
  first_name: "Jane",
  last_name: "Doe",
  company: "Acme Corp",
  title: "Software Engineer",
  emails: [
    { value: "jane@acme.com", type: "personal" },
    { value: "jane@work.com", type: "work" },
  ],
  phone_numbers: [{ value: "+1-555-1234", type: "mobile" }],
  tags: ["senior", "backend"],
  applications: [
    { id: 400, status: "active" },
    { id: 401, status: "rejected" },
  ],
  created_at: "2025-03-01T08:00:00Z",
  updated_at: "2025-06-18T12:00:00Z",
  last_activity: "2025-06-18T12:00:00Z",
  is_private: false,
};

const SAMPLE_APPLICATION: GreenhouseApplication = {
  id: 400,
  candidate_id: 300,
  status: "active",
  current_stage: { id: 5, name: "Technical Interview" },
  source: { id: 1, public_name: "LinkedIn" },
  jobs: [{ id: 101, name: "Senior Engineer" }],
  rejection_reason: null,
  applied_at: "2025-03-05T09:00:00Z",
  rejected_at: null,
  last_activity_at: "2025-06-18T12:00:00Z",
  prospect: false,
  created_at: "2025-03-05T09:00:00Z",
  updated_at: "2025-06-18T12:00:00Z",
};

const SAMPLE_OFFER: GreenhouseOffer = {
  id: 500,
  application_id: 400,
  status: "accepted",
  starts_at: "2025-08-01",
  created_at: "2025-06-20T10:00:00Z",
  sent_at: "2025-06-20T11:00:00Z",
  resolved_at: "2025-06-22T09:00:00Z",
  version: 1,
};

describe("transformJob", () => {
  test("produces valid GenericDocument", async () => {
    const doc = await transformJob(SAMPLE_JOB, CTX);

    expect(doc.id).toBe("conn_gh_1_job_101");
    expect(doc.document_type).toBe("job");
    expect(doc.title).toBe("Senior Engineer");
    expect(doc.source_type).toBe("greenhouse");
    expect(doc.connector_id).toBe("conn_gh_1");
    expect(doc.team_id).toBe("team_1");
    expect(doc.external_id).toBe("101");
    expect(doc.author_name).toBe("Alice Smith");
    expect(doc.metadata?.status).toBe("open");
    expect(doc.metadata?.departments).toBe("Engineering");
    expect(doc.metadata?.offices).toBe("San Francisco");
    expect(doc.metadata?.openPositions).toBe(1);
    expect(doc.content).toContain("Backfill for departed team member");
    expect(doc.checksum).toBeDefined();
    expect(doc.url).toContain("greenhouse.io");
  });

  test("handles job with no departments", async () => {
    const job = { ...SAMPLE_JOB, departments: [], offices: [] };
    const doc = await transformJob(job, CTX);

    expect(doc.metadata?.departments).toBeUndefined();
    expect(doc.metadata?.offices).toBeUndefined();
  });
});

describe("transformCandidate", () => {
  test("produces valid GenericDocument with PII fields", async () => {
    const doc = await transformCandidate(SAMPLE_CANDIDATE, CTX);

    expect(doc.id).toBe("conn_gh_1_candidate_300");
    expect(doc.document_type).toBe("candidate");
    expect(doc.title).toBe("Jane Doe");
    expect(doc.author_name).toBe("Jane Doe");
    expect(doc.author_email).toBe("jane@acme.com");
    expect(doc.metadata?.company).toBe("Acme Corp");
    expect(doc.metadata?.tags).toBe("senior, backend");
    expect(doc.metadata?.activeApplications).toBe(1);
    expect(doc.content).toContain("jane@acme.com");
    expect(doc.content).toContain("+1-555-1234");
  });
});

describe("transformApplication", () => {
  test("produces valid GenericDocument", async () => {
    const doc = await transformApplication(SAMPLE_APPLICATION, CTX);

    expect(doc.id).toBe("conn_gh_1_application_400");
    expect(doc.document_type).toBe("application");
    expect(doc.title).toContain("Senior Engineer");
    expect(doc.metadata?.currentStage).toBe("Technical Interview");
    expect(doc.metadata?.source).toBe("LinkedIn");
    expect(doc.metadata?.status).toBe("active");
    expect(doc.metadata?.prospect).toBe(false);
  });

  test("handles rejected application", async () => {
    const rejected: GreenhouseApplication = {
      ...SAMPLE_APPLICATION,
      status: "rejected",
      rejected_at: "2025-06-19T10:00:00Z",
      rejection_reason: {
        id: 1,
        name: "Not enough experience",
        type: { id: 1, name: "We rejected them" },
      },
    };
    const doc = await transformApplication(rejected, CTX);

    expect(doc.metadata?.rejectionReason).toBe("Not enough experience");
    expect(doc.document_subtype).toBe("rejected");
  });
});

describe("transformOffer", () => {
  test("produces valid GenericDocument", async () => {
    const doc = await transformOffer(SAMPLE_OFFER, CTX);

    expect(doc.id).toBe("conn_gh_1_offer_500");
    expect(doc.document_type).toBe("offer");
    expect(doc.metadata?.status).toBe("accepted");
    expect(doc.metadata?.startsAt).toBe("2025-08-01");
    expect(doc.metadata?.applicationId).toBe(400);
    expect(doc.content).toContain("accepted");
  });
});
