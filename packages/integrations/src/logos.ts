import { Logo as GmailLogo } from "./gmail/assets/logo";
import { Logo as SlackLogo } from "./slack/assets/logo";
import { AppType, type LogoComponent } from "./types";

export const appLogos: Record<string, LogoComponent> = {
  [AppType.GMAIL]: GmailLogo,
  [AppType.SLACK]: SlackLogo,
};
