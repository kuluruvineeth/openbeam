import { describe, expect, it } from "bun:test";
import type { HubSpotTransformContext } from "@openbeam/types/services/connectors/hubspot";
import type { HubSpotCompany } from "../api/companies";
import type { HubSpotContact } from "../api/contacts";
import type { HubSpotDeal } from "../api/deals";
import type { HubSpotTicket } from "../api/tickets";
import { transformHubSpotCompany } from "../transformers/company";
import { transformHubSpotContact } from "../transformers/contact";
import { transformHubSpotDeal } from "../transformers/deal";
import { transformHubSpotTicket } from "../transformers/ticket";

const context: HubSpotTransformContext = {
  connectorId: "conn_test",
  connectorType: "hubspot",
  teamId: "team_test",
  workspaceId: "ws_test",
  portalId: "12345",
};

describe("transformHubSpotContact", () => {
  it("transforms a contact with all fields", () => {
    const contact: HubSpotContact = {
      id: "501",
      properties: {
        firstname: "Jane",
        lastname: "Doe",
        email: "jane@example.com",
        phone: "+1-555-0100",
        company: "Acme Corp",
        jobtitle: "VP Engineering",
        lifecyclestage: "customer",
        createdate: "2024-01-15T10:00:00Z",
        lastmodifieddate: "2024-03-20T14:30:00Z",
      },
      createdAt: "2024-01-15T10:00:00Z",
      updatedAt: "2024-03-20T14:30:00Z",
    };

    const doc = transformHubSpotContact(contact, context);

    expect(doc.id).toBe("conn_test_contact_501");
    expect(doc.title).toBe("Jane Doe");
    expect(doc.document_type).toBe("contact");
    expect(doc.content).toContain("VP Engineering");
    expect(doc.content).toContain("at Acme Corp");
    expect(doc.url).toBe("https://app.hubspot.com/contacts/12345/contact/501");
    expect(doc.metadata).toEqual({
      email: "jane@example.com",
      phone: "+1-555-0100",
      jobTitle: "VP Engineering",
      company: "Acme Corp",
      lifecycleStage: "customer",
    });
  });

  it("uses id as fallback name when names are missing", () => {
    const contact: HubSpotContact = {
      id: "502",
      properties: { createdate: "2024-01-15T10:00:00Z" },
      createdAt: "2024-01-15T10:00:00Z",
      updatedAt: "2024-03-20T14:30:00Z",
    };

    const doc = transformHubSpotContact(contact, context);
    expect(doc.title).toBe("502");
  });
});

describe("transformHubSpotCompany", () => {
  it("transforms a company with all fields", () => {
    const company: HubSpotCompany = {
      id: "601",
      properties: {
        name: "Acme Corp",
        domain: "acme.com",
        industry: "Technology",
        description: "Enterprise software company",
        numberofemployees: "500",
        city: "San Francisco",
        state: "CA",
        country: "US",
        createdate: "2024-02-01T08:00:00Z",
        lastmodifieddate: "2024-03-10T16:00:00Z",
      },
      createdAt: "2024-02-01T08:00:00Z",
      updatedAt: "2024-03-10T16:00:00Z",
    };

    const doc = transformHubSpotCompany(company, context);

    expect(doc.id).toBe("conn_test_company_601");
    expect(doc.title).toBe("Acme Corp");
    expect(doc.document_type).toBe("company");
    expect(doc.content).toContain("Enterprise software company");
    expect(doc.content).toContain("Technology");
    expect(doc.url).toBe("https://app.hubspot.com/contacts/12345/company/601");
    expect(doc.metadata).toEqual({
      domain: "acme.com",
      industry: "Technology",
      city: "San Francisco",
      state: "CA",
      country: "US",
      employees: 500,
    });
  });
});

describe("transformHubSpotDeal", () => {
  it("transforms a deal with all fields", () => {
    const deal: HubSpotDeal = {
      id: "701",
      properties: {
        dealname: "Enterprise License",
        amount: "50000",
        dealstage: "contractsent",
        pipeline: "default",
        closedate: "2024-06-30T00:00:00Z",
        description: "Annual enterprise license renewal",
        hs_deal_stage_probability: "80",
        createdate: "2024-01-20T09:00:00Z",
        lastmodifieddate: "2024-03-15T11:00:00Z",
      },
      createdAt: "2024-01-20T09:00:00Z",
      updatedAt: "2024-03-15T11:00:00Z",
    };

    const doc = transformHubSpotDeal(deal, context);

    expect(doc.id).toBe("conn_test_deal_701");
    expect(doc.title).toBe("Enterprise License");
    expect(doc.document_type).toBe("deal");
    expect(doc.content).toContain("contractsent");
    expect(doc.content).toContain("50000");
    expect(doc.url).toBe("https://app.hubspot.com/contacts/12345/deal/701");
    expect(doc.metadata).toEqual({
      amount: "50000",
      stage: "contractsent",
      pipeline: "default",
      closeDate: "2024-06-30T00:00:00Z",
      probability: "80",
    });
  });
});

describe("transformHubSpotTicket", () => {
  it("transforms a ticket with all fields", () => {
    const ticket: HubSpotTicket = {
      id: "801",
      properties: {
        subject: "Login page broken",
        content: "<p>Users cannot log in since <b>yesterday</b></p>",
        hs_pipeline_stage: "1",
        hs_pipeline: "0",
        hs_ticket_priority: "HIGH",
        closed_date: "2024-03-18T09:00:00Z",
        createdate: "2024-03-17T15:00:00Z",
        lastmodifieddate: "2024-03-18T09:00:00Z",
      },
      createdAt: "2024-03-17T15:00:00Z",
      updatedAt: "2024-03-18T09:00:00Z",
    };

    const doc = transformHubSpotTicket(ticket, context);

    expect(doc.id).toBe("conn_test_ticket_801");
    expect(doc.title).toBe("Login page broken");
    expect(doc.document_type).toBe("ticket");
    expect(doc.content).toBe("Users cannot log in since yesterday");
    expect(doc.url).toBe("https://app.hubspot.com/contacts/12345/ticket/801");
    expect(doc.metadata).toEqual({
      stage: "1",
      pipeline: "0",
      priority: "HIGH",
      closedDate: "2024-03-18T09:00:00Z",
    });
  });

  it("uses fallback title when subject is missing", () => {
    const ticket: HubSpotTicket = {
      id: "802",
      properties: { createdate: "2024-01-01T00:00:00Z" },
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };

    const doc = transformHubSpotTicket(ticket, context);
    expect(doc.title).toBe("Ticket #802");
  });
});
