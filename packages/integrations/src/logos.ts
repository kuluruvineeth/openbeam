import {
  type ConnectorType,
  normalizeToConnectorType,
} from "@openbeam/types/services/connectors/events";
import { Logo as AsanaLogo } from "./asana/assets/logo";
import { Logo as AwsIotLogo } from "./aws-iot/assets/logo";
import { Logo as AzureIotLogo } from "./azure-iot/assets/logo";
import { Logo as BACnetLogo } from "./bacnet/assets/logo";
import { Logo as BoxLogo } from "./box/assets/logo";
import { Logo as CisaKevLogo } from "./cisa-kev/assets/logo";
import { Logo as ConfluenceLogo } from "./confluence/assets/logo";
import { Logo as DropboxLogo } from "./dropbox/assets/logo";
import { Logo as FHIRLogo } from "./fhir/assets/logo";
import { Logo as FigmaLogo } from "./figma/assets/logo";
import { Logo as GitHubLogo } from "./github/assets/logo";
import { Logo as GitLabLogo } from "./gitlab/assets/logo";
import { Logo as GmailLogo } from "./gmail/assets/logo";
import { Logo as GoogleCalendarLogo } from "./google-calendar/assets/logo";
import { Logo as GoogleDriveLogo } from "./google-drive/assets/logo";
import { Logo as HubSpotLogo } from "./hubspot/assets/logo";
import { Logo as IntercomLogo } from "./intercom/assets/logo";
import { Logo as JiraLogo } from "./jira/assets/logo";
import { Logo as LinearLogo } from "./linear/assets/logo";
import { Logo as MatterportLogo } from "./matterport/assets/logo";
import { Logo as MicrosoftCalendarLogo } from "./microsoft-calendar/assets/logo";
import { Logo as MitreAttackLogo } from "./mitre-attack/assets/logo";
import { Logo as MQTTLogo } from "./mqtt/assets/logo";
import { Logo as NodeREDLogo } from "./nodered/assets/logo";
import { Logo as NotionLogo } from "./notion/assets/logo";
import { Logo as NvdLogo } from "./nvd/assets/logo";
import { Logo as OmniverseLogo } from "./omniverse/assets/logo";
import { Logo as OPCUALogo } from "./opcua/assets/logo";
import { Logo as OutlookLogo } from "./outlook/assets/logo";
import { Logo as OwaspLogo } from "./owasp/assets/logo";
import { Logo as SalesforceLogo } from "./salesforce/assets/logo";
import { Logo as SamsaraLogo } from "./samsara/assets/logo";
import { Logo as ServiceNowLogo } from "./servicenow/assets/logo";
import { Logo as SharePointLogo } from "./sharepoint/assets/logo";
import { Logo as SlackLogo } from "./slack/assets/logo";
import { Logo as SmartThingsLogo } from "./smartthings/assets/logo";
import { Logo as TeamsLogo } from "./teams/assets/logo";
import { Logo as ThingsBoardLogo } from "./thingsboard/assets/logo";
import { AppType, type LogoComponent } from "./types";
import { Logo as VerkadaLogo } from "./verkada/assets/logo";
import { Logo as ViamLogo } from "./viam/assets/logo";
import { Logo as ZendeskLogo } from "./zendesk/assets/logo";

export const appLogos: Record<string, LogoComponent> = {
  [AppType.ASANA]: AsanaLogo,
  [AppType.GMAIL]: GmailLogo,
  [AppType.GITHUB]: GitHubLogo,
  [AppType.GITLAB]: GitLabLogo,
  [AppType.GOOGLE_DRIVE]: GoogleDriveLogo,
  [AppType.LINEAR]: LinearLogo,
  [AppType.NOTION]: NotionLogo,
  [AppType.SLACK]: SlackLogo,
  [AppType.SAMSARA]: SamsaraLogo,
  [AppType.MQTT]: MQTTLogo,
  [AppType.OPCUA]: OPCUALogo,
  [AppType.BACNET]: BACnetLogo,
  [AppType.THINGSBOARD]: ThingsBoardLogo,
  [AppType.NODERED]: NodeREDLogo,
  [AppType.OMNIVERSE]: OmniverseLogo,
  [AppType.MATTERPORT]: MatterportLogo,
  [AppType.VIAM]: ViamLogo,
  [AppType.FHIR]: FHIRLogo,
  [AppType.NVD]: NvdLogo,
  [AppType.CISA_KEV]: CisaKevLogo,
  [AppType.MITRE_ATTACK]: MitreAttackLogo,
  [AppType.OWASP]: OwaspLogo,
  [AppType.OUTLOOK]: OutlookLogo,
  [AppType.SHAREPOINT]: SharePointLogo,
  [AppType.MICROSOFT_TEAMS]: TeamsLogo,
  [AppType.CONFLUENCE]: ConfluenceLogo,
  [AppType.BOX]: BoxLogo,
  [AppType.DROPBOX]: DropboxLogo,
  [AppType.JIRA]: JiraLogo,
  [AppType.SALESFORCE]: SalesforceLogo,
  [AppType.SERVICENOW]: ServiceNowLogo,
  [AppType.GOOGLE_CALENDAR]: GoogleCalendarLogo,
  [AppType.MICROSOFT_CALENDAR]: MicrosoftCalendarLogo,
  [AppType.AWS_IOT]: AwsIotLogo,
  [AppType.AZURE_IOT]: AzureIotLogo,
  [AppType.SMARTTHINGS]: SmartThingsLogo,
  [AppType.VERKADA]: VerkadaLogo,
  [AppType.ZENDESK]: ZendeskLogo,
  [AppType.HUBSPOT]: HubSpotLogo,
  [AppType.FIGMA]: FigmaLogo,
  [AppType.INTERCOM]: IntercomLogo,
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
