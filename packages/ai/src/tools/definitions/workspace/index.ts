export { workspaceEntryCreateTool } from "./entry-create";
export { workspaceEntryListTool } from "./entry-list";
export { workspaceEntryUpdateTool } from "./entry-update";
export { workspaceImportTool } from "./import";
export { workspaceNl2sqlTool } from "./nl2sql";
export { workspaceObjectCreateTool } from "./object-create";
export { workspaceObjectListTool } from "./object-list";
export { workspaceQueryTool } from "./query";

import { workspaceEntryCreateTool } from "./entry-create";
import { workspaceEntryListTool } from "./entry-list";
import { workspaceEntryUpdateTool } from "./entry-update";
import { workspaceImportTool } from "./import";
import { workspaceNl2sqlTool } from "./nl2sql";
import { workspaceObjectCreateTool } from "./object-create";
import { workspaceObjectListTool } from "./object-list";
import { workspaceQueryTool } from "./query";

export function registerWorkspaceTools(): void {
  workspaceQueryTool.register();
  workspaceNl2sqlTool.register();
  workspaceObjectCreateTool.register();
  workspaceObjectListTool.register();
  workspaceEntryCreateTool.register();
  workspaceEntryListTool.register();
  workspaceEntryUpdateTool.register();
  workspaceImportTool.register();
}
