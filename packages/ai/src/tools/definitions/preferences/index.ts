export { preferencesGetTool } from "./get";
export { preferencesUpdateTool } from "./update";

import { preferencesGetTool } from "./get";
import { preferencesUpdateTool } from "./update";

export function registerPreferencesTools(): void {
  preferencesGetTool.register();
  preferencesUpdateTool.register();
}
