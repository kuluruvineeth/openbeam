import { describe, expect, it } from "bun:test";
import type { PipedriveTransformContext } from "@openbeam/types/services/connectors/pipedrive";
import { transformPipedriveActivity } from "../transformers/activity";
import { transformPipedriveDeal } from "../transformers/deal";
import { transformPipedriveNote } from "../transformers/note";
import { transformPipedriveOrganization } from "../transformers/organization";
import { transformPipedrivePerson } from "../transformers/person";

const context: PipedriveTransformContext = {
  connectorId: "conn_pd_1",
  connectorType: "PIPEDRIVE",
  teamId: "team_1",
  workspaceId: "ws_1",
  companyDomain: "mycompany",
};

describe("transformPipedriveDeal", () => {
  it("transforms a deal with all fields", () => {
    const deal = {
      id: 42,
      title: "Enterprise License",
      value: 50_000,
      currency: "USD",
      status: "open",
      stage_id: 3,
      pipeline_id: 1,
      expected_close_date: "2026-06-15",
      probability: 75,
      lost_reason: null,
      add_time: "2026-01-10T12:00:00Z",
      update_time: "2026-03-20T14:30:00Z",
      stage_order_nr: 3,
      person_id: { value: 10, name: "Jane Smith" },
      org_id: { value: 5, name: "Acme Corp" },
      user_id: { id: 1, name: "John Doe", email: "john@example.com" },
      won_time: null,
      lost_time: null,
      close_time: null,
      visible_to: "3",
    };

    const doc = transformPipedriveDeal(deal, context);

    expect(doc.id).toBe("conn_pd_1_deal_42");
    expect(doc.document_type).toBe("deal");
    expect(doc.title).toBe("Enterprise License");
    expect(doc.url).toBe("https://mycompany.pipedrive.com/deal/42");
    expect(doc.author_name).toBe("John Doe");
    expect(doc.author_email).toBe("john@example.com");
    expect(doc.metadata?.value).toBe("50000");
    expect(doc.metadata?.currency).toBe("USD");
    expect(doc.metadata?.personName).toBe("Jane Smith");
    expect(doc.metadata?.organizationName).toBe("Acme Corp");
  });
});

describe("transformPipedrivePerson", () => {
  it("transforms a person with email and phone", () => {
    const person = {
      id: 10,
      name: "Jane Smith",
      first_name: "Jane",
      last_name: "Smith",
      email: [{ value: "jane@acme.com", primary: true, label: "work" }],
      phone: [{ value: "+1234567890", primary: true, label: "work" }],
      org_id: { value: 5, name: "Acme Corp" },
      owner_id: { id: 1, name: "John Doe", email: "john@example.com" },
      add_time: "2026-01-05T10:00:00Z",
      update_time: "2026-03-18T11:00:00Z",
      visible_to: "3",
      active_flag: true,
    };

    const doc = transformPipedrivePerson(person, context);

    expect(doc.id).toBe("conn_pd_1_person_10");
    expect(doc.document_type).toBe("person");
    expect(doc.title).toBe("Jane Smith");
    expect(doc.metadata?.email).toBe("jane@acme.com");
    expect(doc.metadata?.phone).toBe("+1234567890");
    expect(doc.metadata?.organizationName).toBe("Acme Corp");
  });
});

describe("transformPipedriveOrganization", () => {
  it("transforms an organization", () => {
    const org = {
      id: 5,
      name: "Acme Corp",
      address: "123 Main St, Springfield",
      address_street_number: "123",
      address_route: "Main St",
      address_locality: "Springfield",
      address_country: "US",
      owner_id: { id: 1, name: "John Doe", email: "john@example.com" },
      add_time: "2026-01-01T08:00:00Z",
      update_time: "2026-03-15T09:00:00Z",
      visible_to: "3",
      active_flag: true,
      people_count: 12,
    };

    const doc = transformPipedriveOrganization(org, context);

    expect(doc.id).toBe("conn_pd_1_organization_5");
    expect(doc.document_type).toBe("organization");
    expect(doc.title).toBe("Acme Corp");
    expect(doc.metadata?.address).toBe("123 Main St, Springfield");
    expect(doc.metadata?.country).toBe("US");
  });
});

describe("transformPipedriveActivity", () => {
  it("transforms an activity", () => {
    const activity = {
      id: 100,
      subject: "Follow up call",
      type: "call",
      due_date: "2026-03-25",
      due_time: "14:00",
      done: false,
      note: "<p>Discuss renewal terms</p>",
      deal_id: 42,
      person_id: 10,
      org_id: null,
      user_id: 1,
      add_time: "2026-03-20T09:00:00Z",
      update_time: "2026-03-20T09:00:00Z",
      marked_as_done_time: null,
      active_flag: true,
      location: null,
    };

    const doc = transformPipedriveActivity(activity, context);

    expect(doc.id).toBe("conn_pd_1_activity_100");
    expect(doc.document_type).toBe("activity");
    expect(doc.title).toBe("Follow up call");
    expect(doc.content).toContain("Discuss renewal terms");
    expect(doc.content).not.toContain("<p>");
    expect(doc.metadata?.activityType).toBe("call");
    expect(doc.metadata?.dealId).toBe("42");
  });
});

describe("transformPipedriveNote", () => {
  it("transforms a note linked to a deal", () => {
    const note = {
      id: 200,
      content: "<p>Customer expressed interest in premium plan.</p>",
      deal_id: 42,
      person_id: null,
      org_id: null,
      user_id: 1,
      add_time: "2026-03-19T16:00:00Z",
      update_time: "2026-03-19T16:00:00Z",
      active_flag: true,
      pinned_to_deal_flag: true,
      pinned_to_person_flag: false,
      pinned_to_organization_flag: false,
    };

    const doc = transformPipedriveNote(note, context);

    expect(doc.id).toBe("conn_pd_1_note_200");
    expect(doc.document_type).toBe("note");
    expect(doc.document_subtype).toBe("deal");
    expect(doc.content).toBe("Customer expressed interest in premium plan.");
    expect(doc.content).not.toContain("<p>");
    expect(doc.metadata?.dealId).toBe("42");
    expect(doc.metadata?.linkedEntity).toBe("deal");
  });

  it("truncates long note titles", () => {
    const longContent = "A".repeat(200);
    const note = {
      id: 201,
      content: longContent,
      deal_id: null,
      person_id: null,
      org_id: null,
      user_id: 1,
      add_time: "2026-03-19T16:00:00Z",
      update_time: "2026-03-19T16:00:00Z",
      active_flag: true,
      pinned_to_deal_flag: false,
      pinned_to_person_flag: false,
      pinned_to_organization_flag: false,
    };

    const doc = transformPipedriveNote(note, context);

    expect(doc.title.length).toBeLessThanOrEqual(84);
    expect(doc.title).toContain("...");
  });
});
