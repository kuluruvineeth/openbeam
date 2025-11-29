import gmailApp from "./gmail/config";
import slackApp from "./slack/config";
import type { UnifiedApp } from "./types";

// Gmail exports
export * from "./gmail/oauth";
export * from "./gmail/service-account";
export * from "./gmail/types";

// Slack exports
export * from "./slack/oauth";
export * from "./slack/types";

// Common exports
export * from "./types";

export const appStore: UnifiedApp[] = [gmailApp, slackApp];

export { default as gmailApp } from "./gmail/config";
export { default as slackApp } from "./slack/config";
