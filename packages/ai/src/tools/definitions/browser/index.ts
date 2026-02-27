export { browserAutonomousTaskTool } from "./autonomous";
export { browserCloseTool } from "./close";
export { browserEvaluateTool } from "./evaluate";
export {
  browserClickTool,
  browserSelectTool,
  browserTypeTool,
} from "./interact";
export { browserLaunchTool } from "./launch";
export { browserNavigateTool } from "./navigate";
export { browserScrapeTool } from "./scrape";
export { browserScreenshotTool } from "./screenshot";
export { browserSnapshotTool } from "./snapshot";

import { browserAutonomousTaskTool } from "./autonomous";
import { browserCloseTool } from "./close";
import { browserEvaluateTool } from "./evaluate";
import {
  browserClickTool,
  browserSelectTool,
  browserTypeTool,
} from "./interact";
import { browserLaunchTool } from "./launch";
import { browserNavigateTool } from "./navigate";
import { browserScrapeTool } from "./scrape";
import { browserScreenshotTool } from "./screenshot";
import { browserSnapshotTool } from "./snapshot";

export function registerBrowserTools(): void {
  browserLaunchTool.register();
  browserNavigateTool.register();
  browserScreenshotTool.register();
  browserSnapshotTool.register();
  browserClickTool.register();
  browserTypeTool.register();
  browserSelectTool.register();
  browserEvaluateTool.register();
  browserScrapeTool.register();
  browserCloseTool.register();
  browserAutonomousTaskTool.register();
}
