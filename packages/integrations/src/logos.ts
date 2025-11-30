import { Logo as GmailLogo } from "./gmail/assets/logo";
import { Logo as GoogleDriveLogo } from "./google-drive/assets/logo";
import { Logo as SlackLogo } from "./slack/assets/logo";
import { AppType, type LogoComponent } from "./types";

export const appLogos: Record<string, LogoComponent> = {
  [AppType.GMAIL]: GmailLogo,
  [AppType.GOOGLE_DRIVE]: GoogleDriveLogo,
  [AppType.SLACK]: SlackLogo,
};
