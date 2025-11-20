import slackApp from "./slack/config";
import type { UnifiedApp } from "./types";

export * from "./slack/constants";
export * from "./slack/oauth";
export * from "./slack/types";
export * from "./types";

export const appStore: UnifiedApp[] = [slackApp];

export { default as slackApp } from "./slack/config";
