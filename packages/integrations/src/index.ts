import slackApp from "./slack/config";
import type { UnifiedApp } from "./types";

export * from "./types";

export const appStore: UnifiedApp[] = [slackApp];

export { default as slackApp } from "./slack/config";
