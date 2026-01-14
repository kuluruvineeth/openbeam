export { integrationCapabilitiesTool } from "./capabilities";
export { integrationListAvailableTool } from "./list";

import { integrationCapabilitiesTool } from "./capabilities";
import { integrationListAvailableTool } from "./list";

export function registerIntegrationTools(): void {
  integrationListAvailableTool.register();
  integrationCapabilitiesTool.register();
}
