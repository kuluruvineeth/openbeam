import { describe, expect, it } from "bun:test";
import type { DatadogTransformContext } from "@openbeam/types/services/connectors/datadog";
import type { DatadogDashboardSummary, DatadogWidget } from "../api/dashboards";
import type { DatadogIncident } from "../api/incidents";
import type { DatadogMonitor } from "../api/monitors";
import type { DatadogNotebook } from "../api/notebooks";
import type { DatadogServiceDefinition } from "../api/services";
import type { DatadogSlo } from "../api/slos";
import { transformDashboard } from "../transformers/dashboard";
import { transformIncident } from "../transformers/incident";
import { transformMonitor } from "../transformers/monitor";
import { transformNotebook } from "../transformers/notebook";
import { transformService } from "../transformers/service";
import { transformSlo } from "../transformers/slo";
import {
  formatIncidentSeverity,
  formatMonitorStatus,
  formatSloType,
} from "../transformers/utils";

const context: DatadogTransformContext = {
  connectorId: "conn_dd_123",
  connectorType: "DATADOG",
  teamId: "team_456",
  workspaceId: "ws_789",
  site: "us1",
};

describe("transformMonitor", () => {
  const monitor: DatadogMonitor = {
    id: 12_345,
    name: "High CPU on web-prod",
    type: "metric alert",
    query: "avg(last_5m):avg:system.cpu.user{host:web-prod} > 90",
    message: "@ops-team CPU is above 90% on web-prod",
    tags: ["env:production", "service:web"],
    multi: false,
    overall_state: "Alert",
    priority: 1,
    creator: {
      email: "alice@example.com",
      handle: "alice@example.com",
      name: "Alice Smith",
    },
    created: "2026-01-15T10:00:00Z",
    modified: "2026-03-20T14:30:00Z",
    options: {
      thresholds: { critical: 90, warning: 80 },
    },
    deleted: null,
  };

  it("produces a valid GenericDocument", async () => {
    const doc = await transformMonitor(monitor, context);

    expect(doc.id).toBe("conn_dd_123_monitor_12345");
    expect(doc.connector_id).toBe("conn_dd_123");
    expect(doc.connector_type).toBe("DATADOG");
    expect(doc.team_id).toBe("team_456");
    expect(doc.external_id).toBe("12345");
    expect(doc.document_type).toBe("monitor");
    expect(doc.document_subtype).toBe("metric alert");
    expect(doc.title).toBe("High CPU on web-prod");
    expect(doc.source_type).toBe("datadog");
    expect(doc.author_name).toBe("Alice Smith");
    expect(doc.checksum).toBeDefined();
    expect(doc.url).toContain("datadoghq.com/monitors/12345");
  });

  it("includes metadata fields", async () => {
    const doc = await transformMonitor(monitor, context);

    expect(doc.metadata).toMatchObject({
      monitorId: 12_345,
      type: "metric alert",
      status: "Alert",
      statusLabel: "Alerting",
      priority: "P1",
      tags: "env:production, service:web",
      creator: "Alice Smith",
      multi: false,
    });
  });

  it("includes content with query and thresholds", async () => {
    const doc = await transformMonitor(monitor, context);

    expect(doc.content).toContain("@ops-team CPU is above 90% on web-prod");
    expect(doc.content).toContain("Query: avg(last_5m)");
    expect(doc.content).toContain("critical: 90");
    expect(doc.content).toContain("warning: 80");
  });
});

describe("transformDashboard", () => {
  const dashboard: DatadogDashboardSummary = {
    id: "dash-abc-123",
    title: "Production Overview",
    description: "Key metrics for production services",
    layout_type: "ordered",
    url: "/dashboard/dash-abc-123/production-overview",
    author_handle: "bob@example.com",
    author_name: "Bob Jones",
    created_at: "2026-02-01T09:00:00Z",
    modified_at: "2026-03-18T16:45:00Z",
    is_read_only: false,
  };

  const widgets: DatadogWidget[] = [
    {
      id: 1,
      definition: {
        type: "timeseries",
        title: "CPU Usage Over Time",
      },
    },
    {
      id: 2,
      definition: {
        type: "query_value",
        title: "Error Rate",
      },
    },
  ];

  it("produces a valid GenericDocument", async () => {
    const doc = await transformDashboard(dashboard, context, widgets);

    expect(doc.id).toBe("conn_dd_123_dashboard_dash-abc-123");
    expect(doc.document_type).toBe("dashboard");
    expect(doc.title).toBe("Production Overview");
    expect(doc.author_name).toBe("Bob Jones");
    expect(doc.url).toContain("dashboard/dash-abc-123");
  });

  it("includes widget titles in content", async () => {
    const doc = await transformDashboard(dashboard, context, widgets);

    expect(doc.content).toContain("CPU Usage Over Time");
    expect(doc.content).toContain("Error Rate");
  });

  it("includes metadata with widget count", async () => {
    const doc = await transformDashboard(dashboard, context, widgets);

    expect(doc.metadata).toMatchObject({
      dashboardId: "dash-abc-123",
      layoutType: "ordered",
      author: "Bob Jones",
      widgetCount: 2,
    });
  });
});

describe("transformIncident", () => {
  const incident: DatadogIncident = {
    id: "inc-xyz-789",
    type: "incidents",
    attributes: {
      title: "Database connection pool exhausted",
      severity: "SEV_2",
      state: "active",
      detection_method: "monitor",
      customer_impact_scope: "All US users",
      customer_impact_start: "2026-03-20T12:00:00Z",
      customer_impact_end: null,
      customer_impacted: true,
      created: "2026-03-20T12:05:00Z",
      modified: "2026-03-20T13:30:00Z",
      resolved: null,
    },
    relationships: {
      commander_user: {
        data: { id: "user-001", type: "users" },
      },
    },
  };

  it("produces a valid GenericDocument", async () => {
    const doc = await transformIncident(incident, context, "Carol Chen");

    expect(doc.id).toBe("conn_dd_123_incident_inc-xyz-789");
    expect(doc.document_type).toBe("incident");
    expect(doc.document_subtype).toBe("SEV_2");
    expect(doc.title).toBe("Database connection pool exhausted");
    expect(doc.author_name).toBe("Carol Chen");
  });

  it("includes severity and customer impact in content", async () => {
    const doc = await transformIncident(incident, context, "Carol Chen");

    expect(doc.content).toContain("SEV-2 (High)");
    expect(doc.content).toContain("Customer impacted: Yes");
    expect(doc.content).toContain("All US users");
    expect(doc.content).toContain("Commander: Carol Chen");
  });

  it("includes metadata fields", async () => {
    const doc = await transformIncident(incident, context, "Carol Chen");

    expect(doc.metadata).toMatchObject({
      incidentId: "inc-xyz-789",
      severity: "SEV_2",
      state: "active",
      detectionMethod: "monitor",
      customerImpacted: true,
      impactScope: "All US users",
      commander: "Carol Chen",
    });
  });
});

describe("transformService", () => {
  const service: DatadogServiceDefinition = {
    type: "service-definition",
    id: "svc-web-api",
    attributes: {
      meta: {
        "last-modified-time": "2026-03-15T08:00:00Z",
      },
      schema: {
        "dd-service": "web-api",
        team: "Platform Team",
        description: "Customer-facing REST API",
        application: "web-platform",
        tier: "Tier 1",
        lifecycle: "production",
        contacts: [
          { name: "Platform Slack", type: "slack", contact: "#platform" },
        ],
        links: [
          {
            name: "Runbook",
            type: "runbook",
            url: "https://runbooks.internal/web-api",
          },
        ],
        tags: ["go", "grpc", "critical"],
        "schema-version": "v2.1",
      },
    },
  };

  it("produces a valid GenericDocument", async () => {
    const doc = await transformService(service, context);

    expect(doc.id).toBe("conn_dd_123_service_svc-web-api");
    expect(doc.document_type).toBe("service");
    expect(doc.title).toBe("web-api");
    expect(doc.author_name).toBe("Platform Team");
  });

  it("includes service details in content", async () => {
    const doc = await transformService(service, context);

    expect(doc.content).toContain("Customer-facing REST API");
    expect(doc.content).toContain("Team: Platform Team");
    expect(doc.content).toContain("Tier: Tier 1");
    expect(doc.content).toContain("Lifecycle: production");
    expect(doc.content).toContain("Runbook: https://runbooks.internal/web-api");
  });
});

describe("transformNotebook", () => {
  const notebook: DatadogNotebook = {
    id: 42,
    type: "notebooks",
    attributes: {
      name: "Incident Investigation: 2026-03-20",
      author: {
        handle: "dave@example.com",
        name: "Dave Wilson",
      },
      cells: [
        {
          id: "cell-1",
          type: "notebook_cells",
          attributes: {
            definition: {
              type: "markdown",
              text: "## Root cause analysis\n\nThe connection pool was exhausted due to a leaked connection in the payment service.",
            },
          },
        },
        {
          id: "cell-2",
          type: "notebook_cells",
          attributes: {
            definition: {
              type: "timeseries",
            },
          },
        },
      ],
      time: { live_span: "1h" },
      status: "published",
      created: "2026-03-20T14:00:00Z",
      modified: "2026-03-20T16:00:00Z",
    },
  };

  it("produces a valid GenericDocument", async () => {
    const doc = await transformNotebook(notebook, context);

    expect(doc.id).toBe("conn_dd_123_notebook_42");
    expect(doc.document_type).toBe("notebook");
    expect(doc.title).toBe("Incident Investigation: 2026-03-20");
    expect(doc.author_name).toBe("Dave Wilson");
  });

  it("extracts markdown cell content", async () => {
    const doc = await transformNotebook(notebook, context);

    expect(doc.content).toContain("Root cause analysis");
    expect(doc.content).toContain("leaked connection");
  });

  it("includes metadata", async () => {
    const doc = await transformNotebook(notebook, context);

    expect(doc.metadata).toMatchObject({
      notebookId: 42,
      author: "Dave Wilson",
      cellCount: 2,
      status: "published",
    });
  });
});

describe("transformSlo", () => {
  const slo: DatadogSlo = {
    id: "slo-def-456",
    name: "Web API Availability",
    description: "99.9% availability for the web API",
    type: "metric",
    tags: ["service:web-api", "env:production"],
    thresholds: [
      {
        timeframe: "30d",
        target: 99.9,
        target_display: "99.9%",
        warning: 99.95,
        warning_display: "99.95%",
      },
    ],
    query: {
      numerator: "sum:requests.success{service:web-api}.as_count()",
      denominator: "sum:requests.total{service:web-api}.as_count()",
    },
    creator: {
      email: "eve@example.com",
      handle: "eve@example.com",
      name: "Eve Brown",
    },
    created_at: 1_706_000_000,
    modified_at: 1_710_000_000,
    overall_status: [
      {
        status: "OK",
        sli_value: 99.95,
        error_budget_remaining: 50,
        timeframe: "30d",
      },
    ],
  };

  it("produces a valid GenericDocument", async () => {
    const doc = await transformSlo(slo, context);

    expect(doc.id).toBe("conn_dd_123_slo_slo-def-456");
    expect(doc.document_type).toBe("slo");
    expect(doc.document_subtype).toBe("metric");
    expect(doc.title).toBe("Web API Availability");
    expect(doc.author_name).toBe("Eve Brown");
    expect(doc.url).toContain("slo/manage?slo_id=slo-def-456");
  });

  it("includes threshold and SLI in content", async () => {
    const doc = await transformSlo(slo, context);

    expect(doc.content).toContain("99.9% availability");
    expect(doc.content).toContain("Target (30d): 99.9%");
    expect(doc.content).toContain("warning: 99.95%");
    expect(doc.content).toContain("SLI (30d): 99.95%");
  });

  it("includes metadata", async () => {
    const doc = await transformSlo(slo, context);

    expect(doc.metadata).toMatchObject({
      sloId: "slo-def-456",
      type: "metric",
      typeLabel: "Metric-based",
      tags: "service:web-api, env:production",
      creator: "Eve Brown",
      primaryTarget: "99.9%",
      primaryTimeframe: "30d",
    });
  });
});

describe("utility formatters", () => {
  it("formats monitor status", () => {
    expect(formatMonitorStatus("Alert")).toBe("Alerting");
    expect(formatMonitorStatus("OK")).toBe("OK");
    expect(formatMonitorStatus("Warn")).toBe("Warning");
    expect(formatMonitorStatus("No Data")).toBe("No Data");
    expect(formatMonitorStatus("custom")).toBe("custom");
  });

  it("formats incident severity", () => {
    expect(formatIncidentSeverity("SEV_1")).toBe("SEV-1 (Critical)");
    expect(formatIncidentSeverity("SEV_2")).toBe("SEV-2 (High)");
    expect(formatIncidentSeverity("SEV_3")).toBe("SEV-3 (Moderate)");
    expect(formatIncidentSeverity("UNKNOWN")).toBe("Unknown");
    expect(formatIncidentSeverity("custom")).toBe("custom");
  });

  it("formats SLO type", () => {
    expect(formatSloType("metric")).toBe("Metric-based");
    expect(formatSloType("monitor")).toBe("Monitor-based");
    expect(formatSloType("time_slice")).toBe("Time-slice");
    expect(formatSloType("custom")).toBe("custom");
  });
});
