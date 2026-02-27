export { voiceDictateTool } from "./dictate";
export { voiceNoteTool } from "./note";
export { voiceSearchTool } from "./search";

import { voiceDictateTool } from "./dictate";
import { voiceNoteTool } from "./note";
import { voiceSearchTool } from "./search";

export function registerVoiceTools(): void {
  voiceDictateTool.register();
  voiceSearchTool.register();
  voiceNoteTool.register();
}
