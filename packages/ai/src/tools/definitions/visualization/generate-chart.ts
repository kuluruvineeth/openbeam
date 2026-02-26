import { z } from "zod";
import { defineTool, success } from "../../builder";

export const generateChartTool = defineTool({
  name: "generate_chart",
  description: `Generate an interactive chart from structured data. Returns a chart artifact that the UI renders.

USE THIS WHEN:
- User asks to visualize data, create a chart, or plot results
- After a data query returns tabular results that would benefit from visualization
- User wants to see trends, distributions, comparisons, or funnels
- Building dashboards or reports

DO NOT USE WHEN:
- Data is not structured (no rows/columns)
- User wants a text summary instead of a visual
- Data has fewer than 2 data points

RETURNS: A chart artifact with type, data, and configuration that the frontend renders as an interactive chart.`,
  category: "data",
  deferLoading: true,
  searchKeywords: [
    "chart",
    "graph",
    "plot",
    "visualize",
    "visualization",
    "dashboard",
    "bar",
    "line",
    "pie",
    "funnel",
    "scatter",
    "metric",
  ],

  parameters: z.object({
    type: z
      .enum([
        "line",
        "bar",
        "area",
        "pie",
        "donut",
        "funnel",
        "scatter",
        "metric",
      ])
      .describe(
        "Chart type. Use 'line' for time series, 'bar' for comparisons, 'pie'/'donut' for proportions, 'funnel' for conversion stages, 'scatter' for correlations, 'metric' for single KPI values."
      ),
    data: z
      .array(z.record(z.string(), z.unknown()))
      .min(1)
      .describe(
        "Array of data objects. Each object is a row with key-value pairs. Keys become axis labels or series names."
      ),
    config: z.object({
      title: z
        .string()
        .optional()
        .describe("Chart title displayed above the visualization"),
      xField: z
        .string()
        .optional()
        .describe(
          "Key in data objects to use as x-axis. Auto-detected from first key if omitted."
        ),
      yField: z
        .string()
        .optional()
        .describe(
          "Key in data objects to use as y-axis value. Auto-detected from second key if omitted."
        ),
      yFields: z
        .array(z.string())
        .optional()
        .describe(
          "Multiple y-axis keys for multi-series charts (stacked bars, multi-line)."
        ),
      groupBy: z
        .string()
        .optional()
        .describe("Key to group data by for categorical charts."),
      nameKey: z
        .string()
        .optional()
        .describe(
          "Key for labels in pie/donut/funnel charts. Defaults to first key."
        ),
      valueKey: z
        .string()
        .optional()
        .describe(
          "Key for values in pie/donut/funnel charts. Defaults to second key."
        ),
      colors: z
        .array(z.string())
        .optional()
        .describe("Custom hex color palette. Falls back to default palette."),
      showLegend: z
        .boolean()
        .optional()
        .describe("Show chart legend. Defaults to true for multi-series."),
      showGrid: z
        .boolean()
        .optional()
        .describe("Show grid lines. Defaults to true for cartesian charts."),
    }),
  }),

  execute: (params, _ctx) => {
    const chartId = `chart_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const firstRow = params.data[0];
    return success(
      {
        chartId,
        type: params.type,
        data: params.data,
        config: params.config,
        rowCount: params.data.length,
        fields: firstRow ? Object.keys(firstRow) : [],
      },
      { latencyMs: 0 }
    );
  },
});
