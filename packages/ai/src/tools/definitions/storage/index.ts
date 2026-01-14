export { storageExistsTool } from "./exists";
export { storageListTool } from "./list";
export { storageSignedUrlTool } from "./signed-url";

import { storageExistsTool } from "./exists";
import { storageListTool } from "./list";
import { storageSignedUrlTool } from "./signed-url";

export function registerStorageTools(): void {
  storageListTool.register();
  storageSignedUrlTool.register();
  storageExistsTool.register();
}
