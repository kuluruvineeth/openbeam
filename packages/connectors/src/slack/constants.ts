import { AuthType } from "../types";
import slackApp from "./config";

export const SLACK_SCOPES =
  slackApp.auth.type === AuthType.OAUTH2 ? slackApp.auth.config.scopes : [];
