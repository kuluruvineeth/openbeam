export { mediaAnalyzeTool, mediaSummaryTool } from "./analyze";
export { mediaSearchImageTool, mediaSearchTextTool } from "./search";
export {
  mediaChaptersTool,
  mediaHighlightsTool,
  mediaMetadataTool,
} from "./structure";
export {
  mediaTranscriptTimestampsTool,
  mediaTranscriptTool,
} from "./transcript";

import { mediaAnalyzeTool, mediaSummaryTool } from "./analyze";
import { mediaSearchImageTool, mediaSearchTextTool } from "./search";
import {
  mediaChaptersTool,
  mediaHighlightsTool,
  mediaMetadataTool,
} from "./structure";
import {
  mediaTranscriptTimestampsTool,
  mediaTranscriptTool,
} from "./transcript";

export function registerMediaTools(): void {
  mediaSearchTextTool.register();
  mediaSearchImageTool.register();
  mediaTranscriptTool.register();
  mediaTranscriptTimestampsTool.register();
  mediaAnalyzeTool.register();
  mediaSummaryTool.register();
  mediaChaptersTool.register();
  mediaHighlightsTool.register();
  mediaMetadataTool.register();
}
