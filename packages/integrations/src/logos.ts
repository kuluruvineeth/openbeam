import {
  type ConnectorType,
  normalizeToConnectorType,
} from "@openplane/types/services/connectors/events";
import { Logo as GmailLogo } from "./gmail/assets/logo";
import { Logo as GoogleDriveLogo } from "./google-drive/assets/logo";
import { Logo as LinearLogo } from "./linear/assets/logo";
import { Logo as NotionLogo } from "./notion/assets/logo";
import { Logo as SlackLogo } from "./slack/assets/logo";
import { AppType, type LogoComponent } from "./types";

export const appLogos: Record<string, LogoComponent> = {
  [AppType.GMAIL]: GmailLogo,
  [AppType.GOOGLE_DRIVE]: GoogleDriveLogo,
  [AppType.LINEAR]: LinearLogo,
  [AppType.NOTION]: NotionLogo,
  [AppType.SLACK]: SlackLogo,
};

export const connectorLogos: Partial<Record<ConnectorType, LogoComponent>> =
  Object.fromEntries(
    Object.entries(appLogos)
      .map(([appType, Logo]) => {
        const connectorType = normalizeToConnectorType(appType);
        return connectorType ? [connectorType, Logo] : null;
      })
      .filter(Boolean) as [ConnectorType, LogoComponent][]
  );
