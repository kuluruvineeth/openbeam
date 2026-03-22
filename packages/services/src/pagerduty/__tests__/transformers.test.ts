import { describe, expect, it } from "bun:test";
import type { PagerDutyTransformContext } from "@openbeam/types/services/connectors/pagerduty";
import type { PagerDutyIncident } from "../transformers/incident";
import { transformIncident } from "../transformers/incident";
import type { PagerDutySchedule } from "../transformers/schedule";
import { transformSchedule } from "../transformers/schedule";
import type { PagerDutyService } from "../transformers/service";
import { transformService } from "../transformers/service";

const context: PagerDutyTransformContext = {
  connectorId: "conn_pd_123",
  connectorType: "PAGERDUTY",
  teamId: "team_456",
  workspaceId: "ws_789",
  subdomain: "acme",
};

describe("transformIncident", () => {
  const incident: PagerDutyIncident = {
    id: "P123ABC",
    incident_number: 42,
    title: "CPU spike on web-01",
    description: "CPU utilization exceeded 95% for 10 minutes",
    status: "triggered",
    urgency: "high",
    html_url: "https://acme.pagerduty.com/incidents/P123ABC",
    created_at: "2026-03-20T10:00:00Z",
    updated_at: "2026-03-20T10:05:00Z",
    priority: { id: "P1", summary: "P1", name: "P1" },
    service: {
      id: "PSVC001",
      summary: "Web Service",
      html_url: "https://acme.pagerduty.com/services/PSVC001",
    },
    escalation_policy: { id: "PEP001", summary: "Default Policy" },
    teams: [{ id: "PT001", summary: "SRE Team" }],
    assignments: [
      {
        at: "2026-03-20T10:00:00Z",
        assignee: { id: "PU001", summary: "Alice" },
      },
    ],
    acknowledgements: [],
    incident_key: "web-01-cpu-spike",
  };

  it("produces a valid GenericDocument", async () => {
    const doc = await transformIncident(incident, context);

    expect(doc.id).toBe("conn_pd_123_incident_P123ABC");
    expect(doc.connector_id).toBe("conn_pd_123");
    expect(doc.connector_type).toBe("PAGERDUTY");
    expect(doc.team_id).toBe("team_456");
    expect(doc.external_id).toBe("P123ABC");
    expect(doc.document_type).toBe("incident");
    expect(doc.document_subtype).toBe("high");
    expect(doc.title).toBe("[#42] CPU spike on web-01");
    expect(doc.url).toBe("https://acme.pagerduty.com/incidents/P123ABC");
    expect(doc.source_type).toBe("pagerduty");
    expect(doc.author_name).toBe("Alice");
    expect(doc.checksum).toBeDefined();
  });

  it("includes metadata fields", async () => {
    const doc = await transformIncident(incident, context);

    expect(doc.metadata).toMatchObject({
      incidentId: "P123ABC",
      incidentNumber: 42,
      status: "triggered",
      urgency: "high",
      serviceId: "PSVC001",
      serviceName: "Web Service",
      priority: "P1",
      escalationPolicy: "Default Policy",
      teams: "SRE Team",
      assignees: "Alice",
      incidentKey: "web-01-cpu-spike",
    });
  });

  it("includes description in content", async () => {
    const doc = await transformIncident(incident, context);
    expect(doc.content).toContain("CPU utilization exceeded 95%");
    expect(doc.content).toContain("Status: triggered");
    expect(doc.content).toContain("Urgency: high");
    expect(doc.content).toContain("Priority: P1");
    expect(doc.content).toContain("Service: Web Service");
  });

  it("handles minimal incident", async () => {
    const minimal: PagerDutyIncident = {
      id: "P999",
      incident_number: 1,
      title: "Test",
      status: "resolved",
      urgency: "low",
      html_url: "https://acme.pagerduty.com/incidents/P999",
      created_at: "2026-03-20T10:00:00Z",
      service: { id: "PSVC001", summary: "Test Service" },
    };

    const doc = await transformIncident(minimal, context);
    expect(doc.id).toBe("conn_pd_123_incident_P999");
    expect(doc.author_name).toBeUndefined();
  });
});

describe("transformService", () => {
  const service: PagerDutyService = {
    id: "PSVC001",
    name: "Web Service",
    description: "Main production web service",
    status: "active",
    html_url: "https://acme.pagerduty.com/services/PSVC001",
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2026-03-15T12:00:00Z",
    escalation_policy: { id: "PEP001", summary: "Default Policy" },
    teams: [{ id: "PT001", summary: "SRE Team" }],
    integrations: [
      {
        id: "PI001",
        summary: "Datadog",
        type: "generic_events_api_inbound_integration",
      },
    ],
    alert_creation: "create_alerts_and_incidents",
  };

  it("produces a valid GenericDocument", async () => {
    const doc = await transformService(service, context);

    expect(doc.id).toBe("conn_pd_123_service_PSVC001");
    expect(doc.document_type).toBe("service");
    expect(doc.title).toBe("Web Service");
    expect(doc.content).toContain("Main production web service");
    expect(doc.content).toContain("Escalation Policy: Default Policy");
    expect(doc.content).toContain("Teams: SRE Team");
    expect(doc.content).toContain("Integrations: Datadog");
  });

  it("includes metadata", async () => {
    const doc = await transformService(service, context);

    expect(doc.metadata).toMatchObject({
      serviceId: "PSVC001",
      status: "active",
      escalationPolicyId: "PEP001",
      escalationPolicy: "Default Policy",
      teams: "SRE Team",
      alertCreation: "create_alerts_and_incidents",
    });
  });
});

describe("transformSchedule", () => {
  const schedule: PagerDutySchedule = {
    id: "PSCHED001",
    name: "Primary On-Call",
    description: "Primary on-call rotation for production",
    time_zone: "America/New_York",
    html_url: "https://acme.pagerduty.com/schedules/PSCHED001",
    users: [
      { id: "PU001", summary: "Alice" },
      { id: "PU002", summary: "Bob" },
    ],
    schedule_layers: [
      {
        id: "PL001",
        name: "Layer 1",
        start: "2026-01-01T00:00:00Z",
        rotation_virtual_start: "2026-01-01T00:00:00Z",
        rotation_turn_length_seconds: 604_800,
        users: [
          { user: { id: "PU001", summary: "Alice" } },
          { user: { id: "PU002", summary: "Bob" } },
        ],
      },
    ],
    escalation_policies: [{ id: "PEP001", summary: "Default Policy" }],
  };

  it("produces a valid GenericDocument", async () => {
    const doc = await transformSchedule(schedule, context);

    expect(doc.id).toBe("conn_pd_123_schedule_PSCHED001");
    expect(doc.document_type).toBe("schedule");
    expect(doc.title).toBe("Primary On-Call");
    expect(doc.content).toContain("Primary on-call rotation");
    expect(doc.content).toContain("Time Zone: America/New_York");
    expect(doc.content).toContain("Users: Alice, Bob");
    expect(doc.content).toContain("Layer 1: Alice, Bob (168h rotation)");
  });

  it("includes metadata", async () => {
    const doc = await transformSchedule(schedule, context);

    expect(doc.metadata).toMatchObject({
      scheduleId: "PSCHED001",
      timeZone: "America/New_York",
      users: "Alice, Bob",
      userCount: 2,
      layerCount: 1,
      escalationPolicies: "Default Policy",
    });
  });
});
