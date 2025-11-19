import { Logo as SlackLogo } from "./slack/assets/logo";
import { AppType } from "./types";

export const appLogos: Record<string, React.ComponentType> = {
  [AppType.SLACK]: SlackLogo,
};
