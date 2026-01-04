export { docChunksTool } from "./chunks";
export { docGetTool } from "./get";
export { docListTool } from "./list";

import { docChunksTool } from "./chunks";
import { docGetTool } from "./get";
import { docListTool } from "./list";

export function registerDocumentTools(): void {
  docChunksTool.register();
  docGetTool.register();
  docListTool.register();
}
