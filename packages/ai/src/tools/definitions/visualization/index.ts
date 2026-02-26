export { generateChartTool } from "./generate-chart";

import { generateChartTool } from "./generate-chart";

export function registerVisualizationTools(): void {
  generateChartTool.register();
}
