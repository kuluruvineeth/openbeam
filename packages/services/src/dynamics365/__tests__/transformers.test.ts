import { describe, expect, it } from "bun:test";
import type { Dynamics365TransformContext } from "@openbeam/types/services/connectors/dynamics365";
import type { Dynamics365Account } from "../api/accounts";
import type { Dynamics365Activity } from "../api/activities";
import type { Dynamics365Case } from "../api/cases";
import type { Dynamics365Contact } from "../api/contacts";
import type { Dynamics365Lead } from "../api/leads";
import type { Dynamics365Opportunity } from "../api/opportunities";
import { transformDynamics365Account } from "../transformers/account";
import { transformDynamics365Activity } from "../transformers/activity";
import { transformDynamics365Case } from "../transformers/case";
import { transformDynamics365Contact } from "../transformers/contact";
import { transformDynamics365Lead } from "../transformers/lead";
import { transformDynamics365Opportunity } from "../transformers/opportunity";

const context: Dynamics365TransformContext = {
  connectorId: "conn_d365_1",
  connectorType: "DYNAMICS_365",
  teamId: "team_1",
  workspaceId: "ws_1",
  orgUrl: "https://testorg.crm.dynamics.com",
};

describe("transformDynamics365Account", () => {
  it("transforms account with all fields", () => {
    const account: Dynamics365Account = {
      accountid: "acc-001",
      name: "Contoso Ltd",
      description: "Enterprise technology company",
      revenue: 5_000_000,
      industrycode: 7,
      telephone1: "+1-555-0100",
      emailaddress1: "info@contoso.com",
      websiteurl: "https://contoso.com",
      address1_city: "Seattle",
      address1_stateorprovince: "WA",
      address1_country: "US",
      numberofemployees: 500,
      statecode: 0,
      statuscode: 1,
      _ownerid_value: "user-001",
      createdon: "2024-01-15T10:00:00Z",
      modifiedon: "2024-06-20T15:30:00Z",
    };

    const doc = transformDynamics365Account(account, context);

    expect(doc.id).toBe("conn_d365_1_account_acc-001");
    expect(doc.document_type).toBe("account");
    expect(doc.title).toBe("Contoso Ltd");
    expect(doc.external_id).toBe("acc-001");
    expect(doc.content).toContain("Enterprise technology company");
    expect(doc.content).toContain("Phone: +1-555-0100");
    expect(doc.metadata?.email).toBe("info@contoso.com");
    expect(doc.metadata?.revenue).toBe("5000000");
    expect(doc.metadata?.active).toBe("true");
    expect(doc.url).toContain("testorg.crm.dynamics.com");
  });

  it("transforms inactive account", () => {
    const account: Dynamics365Account = {
      accountid: "acc-002",
      name: "Inactive Corp",
      description: null,
      revenue: null,
      industrycode: null,
      telephone1: null,
      emailaddress1: null,
      websiteurl: null,
      address1_city: null,
      address1_stateorprovince: null,
      address1_country: null,
      numberofemployees: null,
      statecode: 1,
      statuscode: 2,
      _ownerid_value: null,
      createdon: "2024-01-01T00:00:00Z",
      modifiedon: "2024-01-01T00:00:00Z",
    };

    const doc = transformDynamics365Account(account, context);

    expect(doc.metadata?.active).toBe("false");
    expect(doc.title).toBe("Inactive Corp");
  });
});

describe("transformDynamics365Contact", () => {
  it("transforms contact with account association", () => {
    const contact: Dynamics365Contact = {
      contactid: "cnt-001",
      fullname: "Jane Doe",
      firstname: "Jane",
      lastname: "Doe",
      jobtitle: "VP Sales",
      emailaddress1: "jane@contoso.com",
      telephone1: "+1-555-0101",
      mobilephone: null,
      department: "Sales",
      address1_city: "Seattle",
      address1_stateorprovince: "WA",
      address1_country: "US",
      description: null,
      _parentcustomerid_value: "acc-001",
      _ownerid_value: "user-001",
      statecode: 0,
      createdon: "2024-02-01T09:00:00Z",
      modifiedon: "2024-06-15T14:00:00Z",
    };

    const doc = transformDynamics365Contact(contact, context);

    expect(doc.id).toBe("conn_d365_1_contact_cnt-001");
    expect(doc.document_type).toBe("contact");
    expect(doc.title).toBe("Jane Doe");
    expect(doc.content).toContain("Title: VP Sales");
    expect(doc.content).toContain("Email: jane@contoso.com");
    expect(doc.metadata?.jobTitle).toBe("VP Sales");
    expect(doc.metadata?.department).toBe("Sales");
    expect(doc.author_email).toBe("jane@contoso.com");
  });
});

describe("transformDynamics365Lead", () => {
  it("transforms open lead", () => {
    const lead: Dynamics365Lead = {
      leadid: "lead-001",
      fullname: "John Smith",
      firstname: "John",
      lastname: "Smith",
      subject: "Enterprise License Interest",
      emailaddress1: "john@prospect.com",
      telephone1: "+1-555-0200",
      companyname: "Prospect Inc",
      jobtitle: "CTO",
      description: "Interested in enterprise plan",
      leadsourcecode: 1,
      leadqualitycode: 2,
      estimatedvalue: 50_000,
      statuscode: 1,
      statecode: 0,
      _ownerid_value: "user-001",
      createdon: "2024-03-01T10:00:00Z",
      modifiedon: "2024-06-10T16:00:00Z",
    };

    const doc = transformDynamics365Lead(lead, context);

    expect(doc.id).toBe("conn_d365_1_lead_lead-001");
    expect(doc.document_type).toBe("lead");
    expect(doc.document_subtype).toBe("open");
    expect(doc.title).toBe("John Smith");
    expect(doc.content).toContain("Topic: Enterprise License Interest");
    expect(doc.content).toContain("Company: Prospect Inc");
    expect(doc.metadata?.status).toBe("Open");
    expect(doc.metadata?.estimatedValue).toBe("50000");
  });
});

describe("transformDynamics365Opportunity", () => {
  it("transforms open opportunity with value", () => {
    const opp: Dynamics365Opportunity = {
      opportunityid: "opp-001",
      name: "Contoso Enterprise Deal",
      description: "Full platform deployment",
      estimatedvalue: 250_000,
      actualvalue: null,
      estimatedclosedate: "2024-09-30",
      actualclosedate: null,
      closeprobability: 75,
      stepname: "Proposal",
      statuscode: 1,
      statecode: 0,
      _parentaccountid_value: "acc-001",
      _parentcontactid_value: "cnt-001",
      _ownerid_value: "user-001",
      createdon: "2024-04-01T09:00:00Z",
      modifiedon: "2024-06-18T11:00:00Z",
    };

    const doc = transformDynamics365Opportunity(opp, context);

    expect(doc.id).toBe("conn_d365_1_opportunity_opp-001");
    expect(doc.document_type).toBe("opportunity");
    expect(doc.document_subtype).toBe("open");
    expect(doc.title).toBe("Contoso Enterprise Deal");
    expect(doc.content).toContain("Value: 250000");
    expect(doc.content).toContain("Stage: Proposal");
    expect(doc.content).toContain("Probability: 75%");
    expect(doc.metadata?.estimatedValue).toBe("250000");
    expect(doc.metadata?.stage).toBe("Proposal");
    expect(doc.metadata?.probability).toBe("75");
  });
});

describe("transformDynamics365Case", () => {
  it("transforms active case with priority", () => {
    const incident: Dynamics365Case = {
      incidentid: "case-001",
      title: "Login issues with SSO",
      description: "Users unable to authenticate via SAML SSO",
      ticketnumber: "CAS-2024-0001",
      prioritycode: 1,
      severitycode: 2,
      casetypecode: 1,
      statuscode: 1,
      statecode: 0,
      _customerid_value: "acc-001",
      _ownerid_value: "user-002",
      _subjectid_value: null,
      createdon: "2024-05-01T08:00:00Z",
      modifiedon: "2024-06-19T10:00:00Z",
      resolvedon: null,
    };

    const doc = transformDynamics365Case(incident, context);

    expect(doc.id).toBe("conn_d365_1_case_case-001");
    expect(doc.document_type).toBe("case");
    expect(doc.document_subtype).toBe("active");
    expect(doc.title).toBe("Login issues with SSO");
    expect(doc.content).toContain("Case #CAS-2024-0001");
    expect(doc.content).toContain("Priority: High");
    expect(doc.metadata?.ticketNumber).toBe("CAS-2024-0001");
    expect(doc.metadata?.priority).toBe("High");
    expect(doc.metadata?.status).toBe("Active");
  });
});

describe("transformDynamics365Activity", () => {
  it("transforms scheduled activity", () => {
    const activity: Dynamics365Activity = {
      activityid: "act-001",
      subject: "Follow-up call with Contoso",
      description: "Discuss pricing for enterprise plan",
      activitytypecode: "phonecall",
      statecode: 3,
      statuscode: 1,
      scheduledstart: "2024-06-25T14:00:00Z",
      scheduledend: "2024-06-25T14:30:00Z",
      actualstart: null,
      actualend: null,
      _regardingobjectid_value: "opp-001",
      _ownerid_value: "user-001",
      createdon: "2024-06-20T09:00:00Z",
      modifiedon: "2024-06-20T09:00:00Z",
    };

    const doc = transformDynamics365Activity(activity, context);

    expect(doc.id).toBe("conn_d365_1_activity_act-001");
    expect(doc.document_type).toBe("event");
    expect(doc.document_subtype).toBe("phonecall");
    expect(doc.title).toBe("Follow-up call with Contoso");
    expect(doc.content).toContain("Type: phonecall");
    expect(doc.content).toContain("Status: Scheduled");
    expect(doc.metadata?.activityType).toBe("phonecall");
    expect(doc.metadata?.status).toBe("Scheduled");
  });
});
