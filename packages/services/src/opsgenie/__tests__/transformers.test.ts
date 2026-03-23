import { describe, expect, it } from "bun:test";
import type { OpsGenieTransformContext } from "@openbeam/types/services/connectors/opsgenie";
import type { OpsGenieAlert } from "../api/alerts";
import type { OpsGenieIncident } from "../api/incidents";
import type { OpsGenieSchedule } from "../api/schedules";
import type { OpsGenieService } from "../api/services";
import { transformAlert } from "../transformers/alert";
import { transformIncident } from "../transformers/incident";
import { transformSchedule } from "../transformers/schedule";
import { transformService } from "../transformers/service";
import { formatPriority } from "../transformers/utils";

const context: OpsGenieTransformContext = {
  connectorId: "conn_og_123",
  connectorType: "OPSGENIE",
  teamId: "team_456",
  workspaceId: "ws_789",
  region: "us",
};

describe("transformAlert", () => {
  const alert: OpsGenieAlert = {
    id: "alert-abc-123",
    tinyId: "1234",
    message: "CPU spike on prod-web-01",
    description: "CPU utilization exceeded 95% for 10 minutes",
    status: "open",
    acknowledged: false,
    isSeen: true,
    tags: ["production", "critical"],
    snoozed: false,
    count: 3,
    lastOccurredAt: "2026-03-20T10:10:00Z",
    createdAt: "2026-03-20T10:00:00Z",
    updatedAt: "2026-03-20T10:05:00Z",
    source: "Datadog",
    owner: "alice@example.com",
    priority: "P1",
    responders: [{ id: "team-sre", type: "team", name: "SRE Team" }],
    integration: {
      id: "int-001",
      name: "Datadog Integration",
      type: "Datadog",
    },
    alias: "prod-web-01-cpu",
  };

  it("produces a valid GenericDocument", async () => {
    const doc = await transformAlert(alert, context);

    expect(doc.id).toBe("conn_og_123_alert_alert-abc-123");
    expect(doc.connector_id).toBe("conn_og_123");
    expect(doc.connector_type).toBe("OPSGENIE");
    expect(doc.team_id).toBe("team_456");
    expect(doc.external_id).toBe("alert-abc-123");
    expect(doc.document_type).toBe("alert");
    expect(doc.document_subtype).toBe("P1");
    expect(doc.title).toBe("CPU spike on prod-web-01");
    expect(doc.source_type).toBe("opsgenie");
    expect(doc.author_name).toBe("alice@example.com");
    expect(doc.checksum).toBeDefined();
  });

  it("includes metadata fields", async () => {
    const doc = await transformAlert(alert, context);

    expect(doc.metadata).toMatchObject({
      alertId: "alert-abc-123",
      tinyId: "1234",
      status: "open",
      priority: "P1",
      priorityLabel: "Critical",
      acknowledged: false,
      source: "Datadog",
      owner: "alice@example.com",
      tags: "production, critical",
      alias: "prod-web-01-cpu",
      responders: "SRE Team",
      integrationName: "Datadog Integration",
      occurrenceCount: 3,
    });
  });

  it("includes description in content", async () => {
    const doc = await transformAlert(alert, context);
    expect(doc.content).toContain("CPU utilization exceeded 95%");
    expect(doc.content).toContain("Status: open");
    expect(doc.content).toContain("Priority: Critical");
    expect(doc.content).toContain("Source: Datadog");
    expect(doc.content).toContain("Tags: production, critical");
    expect(doc.content).toContain("Responders: SRE Team");
  });

  it("handles minimal alert", async () => {
    const minimal: OpsGenieAlert = {
      id: "alert-min",
      tinyId: "1",
      message: "Test alert",
      status: "closed",
      acknowledged: true,
      isSeen: true,
      tags: [],
      snoozed: false,
      count: 1,
      lastOccurredAt: "2026-03-20T10:00:00Z",
      createdAt: "2026-03-20T10:00:00Z",
      updatedAt: "2026-03-20T10:00:00Z",
      priority: "P5",
    };

    const doc = await transformAlert(minimal, context);
    expect(doc.id).toBe("conn_og_123_alert_alert-min");
    expect(doc.author_name).toBeUndefined();
    expect(doc.metadata?.priorityLabel).toBe("Informational");
  });
});

describe("transformIncident", () => {
  const incident: OpsGenieIncident = {
    id: "incident-xyz-789",
    tinyId: "42",
    message: "Database outage affecting payments",
    description: "Primary DB replica lag exceeding 60s",
    status: "open",
    tags: ["database", "payments"],
    createdAt: "2026-03-20T09:00:00Z",
    updatedAt: "2026-03-20T09:30:00Z",
    priority: "P1",
    ownerTeam: "Platform Team",
    responders: [{ id: "user-001", type: "user", name: "Bob" }],
    impactedServices: ["payment-api", "checkout-service"],
  };

  it("produces a valid GenericDocument", async () => {
    const doc = await transformIncident(incident, context);

    expect(doc.id).toBe("conn_og_123_incident_incident-xyz-789");
    expect(doc.document_type).toBe("incident");
    expect(doc.title).toBe("[Incident] Database outage affecting payments");
    expect(doc.source_type).toBe("opsgenie");
    expect(doc.checksum).toBeDefined();
  });

  it("includes metadata", async () => {
    const doc = await transformIncident(incident, context);

    expect(doc.metadata).toMatchObject({
      incidentId: "incident-xyz-789",
      tinyId: "42",
      status: "open",
      priority: "P1",
      priorityLabel: "Critical",
      ownerTeam: "Platform Team",
      tags: "database, payments",
      responders: "Bob",
      impactedServices: "payment-api, checkout-service",
    });
  });

  it("includes content details", async () => {
    const doc = await transformIncident(incident, context);
    expect(doc.content).toContain("Primary DB replica lag");
    expect(doc.content).toContain("Owner Team: Platform Team");
    expect(doc.content).toContain(
      "Impacted Services: payment-api, checkout-service"
    );
  });
});

describe("transformService", () => {
  const service: OpsGenieService = {
    id: "svc-001",
    name: "Payment API",
    description: "Handles payment processing for all channels",
    teamId: "team-platform",
    teamName: "Platform Team",
    tags: ["critical", "tier-1"],
    isExternal: false,
  };

  it("produces a valid GenericDocument", async () => {
    const doc = await transformService(service, context);

    expect(doc.id).toBe("conn_og_123_service_svc-001");
    expect(doc.document_type).toBe("service");
    expect(doc.title).toBe("Payment API");
    expect(doc.content).toContain("Handles payment processing");
    expect(doc.content).toContain("Team: Platform Team");
    expect(doc.content).toContain("Tags: critical, tier-1");
  });

  it("includes metadata", async () => {
    const doc = await transformService(service, context);

    expect(doc.metadata).toMatchObject({
      serviceId: "svc-001",
      teamId: "team-platform",
      teamName: "Platform Team",
      tags: "critical, tier-1",
      isExternal: false,
    });
  });
});

describe("transformSchedule", () => {
  const schedule: OpsGenieSchedule = {
    id: "sched-001",
    name: "Primary On-Call",
    description: "Primary on-call rotation for production",
    timezone: "America/New_York",
    enabled: true,
    ownerTeam: { id: "team-sre", name: "SRE Team" },
    rotations: [
      {
        id: "rot-001",
        name: "Weekly Rotation",
        startDate: "2026-01-01T00:00:00Z",
        type: "weekly",
        length: 604_800,
        participants: [
          { id: "user-001", type: "user", username: "alice" },
          { id: "user-002", type: "user", username: "bob" },
        ],
      },
    ],
  };

  const onCallParticipants = [{ id: "user-001", name: "Alice", type: "user" }];

  it("produces a valid GenericDocument", async () => {
    const doc = await transformSchedule(schedule, context, onCallParticipants);

    expect(doc.id).toBe("conn_og_123_schedule_sched-001");
    expect(doc.document_type).toBe("schedule");
    expect(doc.title).toBe("Primary On-Call");
    expect(doc.content).toContain("Primary on-call rotation");
    expect(doc.content).toContain("Timezone: America/New_York");
    expect(doc.content).toContain("Currently on-call: Alice");
    expect(doc.content).toContain("Weekly Rotation: alice, bob (1w rotation)");
  });

  it("includes metadata", async () => {
    const doc = await transformSchedule(schedule, context, onCallParticipants);

    expect(doc.metadata).toMatchObject({
      scheduleId: "sched-001",
      enabled: true,
      timezone: "America/New_York",
      teamName: "SRE Team",
      rotationCount: 1,
      currentOnCall: "Alice",
      onCallCount: 1,
    });
  });

  it("handles schedule without on-call participants", async () => {
    const doc = await transformSchedule(schedule, context);
    expect(doc.content).not.toContain("Currently on-call");
    expect(doc.metadata?.currentOnCall).toBeUndefined();
  });
});

describe("formatPriority", () => {
  it("maps P1-P5 to labels", () => {
    expect(formatPriority("P1")).toBe("Critical");
    expect(formatPriority("P2")).toBe("High");
    expect(formatPriority("P3")).toBe("Moderate");
    expect(formatPriority("P4")).toBe("Low");
    expect(formatPriority("P5")).toBe("Informational");
  });

  it("returns unknown values as-is", () => {
    expect(formatPriority("Custom")).toBe("Custom");
  });
});
