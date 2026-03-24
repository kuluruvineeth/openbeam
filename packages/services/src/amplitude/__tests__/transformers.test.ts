import { describe, expect, it } from "bun:test";
import type { AmplitudeTransformContext } from "@openbeam/types/services/connectors/amplitude";
import type { AmplitudeChart } from "../api/charts";
import type { AmplitudeCohort } from "../api/cohorts";
import type { AmplitudeDashboard } from "../api/dashboards";
import { transformChart } from "../transformers/chart";
import { transformCohort } from "../transformers/cohort";
import { transformDashboard } from "../transformers/dashboard";
import { formatChartType } from "../transformers/utils";

const context: AmplitudeTransformContext = {
  connectorId: "conn_amp_123",
  connectorType: "AMPLITUDE",
  teamId: "team_456",
  workspaceId: "ws_789",
  orgSlug: "my-org",
};

describe("transformChart", () => {
  const chart: AmplitudeChart = {
    id: 12_345,
    name: "Weekly Active Users",
    chartType: "event_segmentation",
    description: "Tracks WAU across all platforms",
    owner: "alice@example.com",
    lastModified: "2026-03-20T10:00:00Z",
    createdAt: "2026-01-15T08:00:00Z",
    isPublic: false,
    projectId: 100,
  };

  it("produces a valid GenericDocument", async () => {
    const doc = await transformChart(chart, context);

    expect(doc.id).toBe("conn_amp_123_chart_12345");
    expect(doc.connector_id).toBe("conn_amp_123");
    expect(doc.connector_type).toBe("AMPLITUDE");
    expect(doc.team_id).toBe("team_456");
    expect(doc.external_id).toBe("12345");
    expect(doc.document_type).toBe("chart");
    expect(doc.document_subtype).toBe("event_segmentation");
    expect(doc.title).toBe("Weekly Active Users");
    expect(doc.source_type).toBe("amplitude");
    expect(doc.author_name).toBe("alice@example.com");
    expect(doc.checksum).toBeDefined();
  });

  it("includes metadata fields", async () => {
    const doc = await transformChart(chart, context);

    expect(doc.metadata).toMatchObject({
      chartId: "12345",
      chartType: "event_segmentation",
      chartTypeLabel: "Event Segmentation",
      owner: "alice@example.com",
      isPublic: false,
      projectId: "100",
    });
  });

  it("builds correct URL with org slug", async () => {
    const doc = await transformChart(chart, context);
    expect(doc.url).toBe("https://analytics.amplitude.com/my-org/chart/12345");
  });

  it("includes content with description and chart type", async () => {
    const doc = await transformChart(chart, context);
    expect(doc.content).toContain("Tracks WAU across all platforms");
    expect(doc.content).toContain("Chart Type: Event Segmentation");
    expect(doc.content).toContain("Creator: alice@example.com");
  });
});

describe("transformDashboard", () => {
  const dashboard: AmplitudeDashboard = {
    id: 67_890,
    name: "Product Overview",
    description: "High-level product metrics dashboard",
    owner: "bob@example.com",
    lastModified: "2026-03-19T14:30:00Z",
    createdAt: "2026-02-01T09:00:00Z",
    isPublic: true,
    charts: [
      { chartId: 1, name: "DAU" },
      { chartId: 2, name: "Retention" },
    ],
    projectId: 100,
  };

  it("produces a valid GenericDocument", async () => {
    const doc = await transformDashboard(dashboard, context);

    expect(doc.id).toBe("conn_amp_123_dashboard_67890");
    expect(doc.document_type).toBe("dashboard");
    expect(doc.title).toBe("Product Overview");
    expect(doc.is_public).toBe(true);
  });

  it("includes chart list in content", async () => {
    const doc = await transformDashboard(dashboard, context);
    expect(doc.content).toContain("Charts: DAU, Retention");
    expect(doc.content).toContain("Chart Count: 2");
  });

  it("builds correct URL with org slug", async () => {
    const doc = await transformDashboard(dashboard, context);
    expect(doc.url).toBe(
      "https://analytics.amplitude.com/my-org/dashboard/67890"
    );
  });
});

describe("transformCohort", () => {
  const cohort: AmplitudeCohort = {
    id: "cohort-abc-123",
    name: "Power Users",
    description: "Users who performed 10+ events in the last 7 days",
    size: 15_000,
    owner: "carol@example.com",
    lastModified: "2026-03-18T16:00:00Z",
    createdAt: "2026-01-10T12:00:00Z",
    published: true,
    appId: 200,
  };

  it("produces a valid GenericDocument", async () => {
    const doc = await transformCohort(cohort, context);

    expect(doc.id).toBe("conn_amp_123_cohort_cohort-abc-123");
    expect(doc.document_type).toBe("cohort");
    expect(doc.title).toBe("Power Users");
    expect(doc.is_public).toBe(false);
  });

  it("includes size in content", async () => {
    const doc = await transformCohort(cohort, context);
    expect(doc.content).toContain("Estimated Size: 15,000 users");
    expect(doc.content).toContain("Published: Yes");
  });

  it("builds correct URL with org slug", async () => {
    const doc = await transformCohort(cohort, context);
    expect(doc.url).toBe(
      "https://analytics.amplitude.com/my-org/cohort/cohort-abc-123"
    );
  });
});

describe("formatChartType", () => {
  it("maps known chart types", () => {
    expect(formatChartType("event_segmentation")).toBe("Event Segmentation");
    expect(formatChartType("funnel_analysis")).toBe("Funnel Analysis");
    expect(formatChartType("retention_analysis")).toBe("Retention Analysis");
  });

  it("returns original for unknown types", () => {
    expect(formatChartType("custom_type")).toBe("custom_type");
  });
});
