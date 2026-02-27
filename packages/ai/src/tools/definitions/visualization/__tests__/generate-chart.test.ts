import { describe, expect, it } from "bun:test";
import type { ToolContext } from "../../../types";
import { generateChartTool } from "../generate-chart";

const CHART_ID_PATTERN = /^chart_/;

function createTestContext(): ToolContext {
  return {
    teamId: "team_abc",
    userId: "user_123",
    services: {} as never,
  };
}

describe("generateChartTool", () => {
  describe("metadata", () => {
    it("has correct name", () => {
      expect(generateChartTool.metadata.name).toBe("generate_chart");
    });

    it("has data category", () => {
      expect(generateChartTool.metadata.category).toBe("data");
    });

    it("has deferLoading enabled", () => {
      expect(generateChartTool.metadata.deferLoading).toBe(true);
    });

    it("includes search keywords for chart types", () => {
      const keywords = generateChartTool.metadata.searchKeywords;
      expect(keywords).toContain("chart");
      expect(keywords).toContain("graph");
      expect(keywords).toContain("visualize");
      expect(keywords).toContain("bar");
      expect(keywords).toContain("line");
      expect(keywords).toContain("pie");
    });
  });

  describe("interface", () => {
    it("exposes coreTool", () => {
      expect(generateChartTool.coreTool).toBeDefined();
    });

    it("exposes register function", () => {
      expect(typeof generateChartTool.register).toBe("function");
    });

    it("exposes execute function", () => {
      expect(typeof generateChartTool.execute).toBe("function");
    });
  });

  describe("execute", () => {
    it("returns chart artifact with correct type", async () => {
      const result = await generateChartTool.execute(
        {
          type: "bar",
          data: [
            { month: "Jan", revenue: 100 },
            { month: "Feb", revenue: 150 },
          ],
          config: { title: "Monthly Revenue" },
        },
        createTestContext()
      );

      expect(result.success).toBe(true);
      const data = result.data as {
        chartId: string;
        type: string;
        data: Record<string, unknown>[];
        config: Record<string, unknown>;
        rowCount: number;
        fields: string[];
      };
      expect(data.type).toBe("bar");
      expect(data.rowCount).toBe(2);
      expect(data.fields).toEqual(["month", "revenue"]);
      expect(data.config.title).toBe("Monthly Revenue");
    });

    it("generates unique chartId", async () => {
      const result1 = await generateChartTool.execute(
        {
          type: "line",
          data: [{ x: 1, y: 2 }],
          config: {},
        },
        createTestContext()
      );

      const result2 = await generateChartTool.execute(
        {
          type: "line",
          data: [{ x: 1, y: 2 }],
          config: {},
        },
        createTestContext()
      );

      const id1 = (result1.data as { chartId: string }).chartId;
      const id2 = (result2.data as { chartId: string }).chartId;
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(CHART_ID_PATTERN);
    });

    it("preserves all chart types", async () => {
      const chartTypes = [
        "line",
        "bar",
        "area",
        "pie",
        "donut",
        "funnel",
        "scatter",
        "metric",
      ] as const;

      for (const chartType of chartTypes) {
        const result = await generateChartTool.execute(
          {
            type: chartType,
            data: [{ label: "A", value: 10 }],
            config: {},
          },
          createTestContext()
        );

        expect(result.success).toBe(true);
        expect((result.data as { type: string }).type).toBe(chartType);
      }
    });

    it("passes through config options", async () => {
      const result = await generateChartTool.execute(
        {
          type: "line",
          data: [{ date: "2024-01", value: 100 }],
          config: {
            title: "Revenue Trend",
            xField: "date",
            yField: "value",
            colors: ["#1971c2"],
            showLegend: false,
            showGrid: true,
          },
        },
        createTestContext()
      );

      expect(result.success).toBe(true);
      const config = (result.data as { config: Record<string, unknown> })
        .config;
      expect(config.title).toBe("Revenue Trend");
      expect(config.xField).toBe("date");
      expect(config.yField).toBe("value");
      expect(config.colors).toEqual(["#1971c2"]);
      expect(config.showLegend).toBe(false);
      expect(config.showGrid).toBe(true);
    });

    it("extracts fields from first data row", async () => {
      const result = await generateChartTool.execute(
        {
          type: "scatter",
          data: [
            { x: 1, y: 2, label: "A" },
            { x: 3, y: 4, label: "B" },
          ],
          config: {},
        },
        createTestContext()
      );

      const fields = (result.data as { fields: string[] }).fields;
      expect(fields).toEqual(["x", "y", "label"]);
    });

    it("includes zero latency metadata", async () => {
      const result = await generateChartTool.execute(
        {
          type: "metric",
          data: [{ value: 42 }],
          config: { title: "Active Users" },
        },
        createTestContext()
      );

      expect(result.metadata?.latencyMs).toBe(0);
    });
  });
});
