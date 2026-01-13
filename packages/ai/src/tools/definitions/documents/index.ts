export { docChunksTool } from "./chunks";
export { docExportTool } from "./export";
export { docGetTool } from "./get";
export { docListTool } from "./list";
export { docShareTool } from "./share";

import { docChunksTool } from "./chunks";
import { docExportTool } from "./export";
import { docGetTool } from "./get";
import { docListTool } from "./list";
import { docShareTool } from "./share";

export function registerDocumentTools(): void {
  docChunksTool.register();
  docExportTool.register();
  docGetTool.register();
  docListTool.register();
  docShareTool.register();
}
