import {
  type ConnectorType,
  normalizeToConnectorType,
} from "@openbeam/types/services/connectors/events";
import { Logo as AhaLogo } from "./aha/assets/logo";
import { Logo as AirtableLogo } from "./airtable/assets/logo";
import { Logo as AmplitudeLogo } from "./amplitude/assets/logo";
import { Logo as AsanaLogo } from "./asana/assets/logo";
import { Logo as AwsIotLogo } from "./aws-iot/assets/logo";
import { Logo as AzureDevOpsLogo } from "./azure-devops/assets/logo";
import { Logo as AzureIotLogo } from "./azure-iot/assets/logo";
import { Logo as BACnetLogo } from "./bacnet/assets/logo";
import { Logo as BambooHRLogo } from "./bamboohr/assets/logo";
import { Logo as BenchlingLogo } from "./benchling/assets/logo";
import { Logo as BitbucketLogo } from "./bitbucket/assets/logo";
import { Logo as BoxLogo } from "./box/assets/logo";
import { Logo as BynderLogo } from "./bynder/assets/logo";
import { Logo as CanvaLogo } from "./canva/assets/logo";
import { Logo as CisaKevLogo } from "./cisa-kev/assets/logo";
import { Logo as ClickUpLogo } from "./clickup/assets/logo";
import { Logo as CodaLogo } from "./coda/assets/logo";
import { Logo as ConfluenceLogo } from "./confluence/assets/logo";
import { Logo as CoupaLogo } from "./coupa/assets/logo";
import { Logo as DatadogLogo } from "./datadog/assets/logo";
import { Logo as DoceboLogo } from "./docebo/assets/logo";
import { Logo as DocuSignLogo } from "./docusign/assets/logo";
import { Logo as DropboxLogo } from "./dropbox/assets/logo";
import { Logo as Dynamics365Logo } from "./dynamics365/assets/logo";
import { Logo as EgnyteLogo } from "./egnyte/assets/logo";
import { Logo as EvernoteLogo } from "./evernote/assets/logo";
import { Logo as FellowLogo } from "./fellow/assets/logo";
import { Logo as FHIRLogo } from "./fhir/assets/logo";
import { Logo as FifteenFiveLogo } from "./fifteen-five/assets/logo";
import { Logo as FigmaLogo } from "./figma/assets/logo";
import { Logo as FreshserviceLogo } from "./freshservice/assets/logo";
import { Logo as GitHubLogo } from "./github/assets/logo";
import { Logo as GitLabLogo } from "./gitlab/assets/logo";
import { Logo as GmailLogo } from "./gmail/assets/logo";
import { Logo as GongLogo } from "./gong/assets/logo";
import { Logo as GoogleCalendarLogo } from "./google-calendar/assets/logo";
import { Logo as GoogleChatLogo } from "./google-chat/assets/logo";
import { Logo as GoogleDriveLogo } from "./google-drive/assets/logo";
import { Logo as GoogleSitesLogo } from "./google-sites/assets/logo";
import { Logo as GreenhouseLogo } from "./greenhouse/assets/logo";
import { Logo as GuruLogo } from "./guru/assets/logo";
import { Logo as HarvestLogo } from "./harvest/assets/logo";
import { Logo as HaystackLogo } from "./haystack/assets/logo";
import { Logo as HighspotLogo } from "./highspot/assets/logo";
import { Logo as HubSpotLogo } from "./hubspot/assets/logo";
import { Logo as InsidedLogo } from "./insided/assets/logo";
import { Logo as InteractLogo } from "./interact/assets/logo";
import { Logo as IntercomLogo } from "./intercom/assets/logo";
import { Logo as IroncladLogo } from "./ironclad/assets/logo";
import { Logo as JenkinsLogo } from "./jenkins/assets/logo";
import { Logo as JFrogLogo } from "./jfrog/assets/logo";
import { Logo as JiraLogo } from "./jira/assets/logo";
import { Logo as KlueLogo } from "./klue/assets/logo";
import { Logo as LessonlyLogo } from "./lessonly/assets/logo";
import { Logo as LinearLogo } from "./linear/assets/logo";
import { Logo as LookerStudioLogo } from "./looker-studio/assets/logo";
import { Logo as LoopioLogo } from "./loopio/assets/logo";
import { Logo as LucidLogo } from "./lucid/assets/logo";
import { Logo as LumAppsLogo } from "./lumapps/assets/logo";
import { Logo as MarketoLogo } from "./marketo/assets/logo";
import { Logo as MatterportLogo } from "./matterport/assets/logo";
import { Logo as MicrosoftCalendarLogo } from "./microsoft-calendar/assets/logo";
import { Logo as MindtickleLogo } from "./mindtickle/assets/logo";
import { Logo as MindtouchLogo } from "./mindtouch/assets/logo";
import { Logo as MiroLogo } from "./miro/assets/logo";
import { Logo as MitreAttackLogo } from "./mitre-attack/assets/logo";
import { Logo as MondayLogo } from "./monday/assets/logo";
import { Logo as MQTTLogo } from "./mqtt/assets/logo";
import { Logo as NetsuiteLogo } from "./netsuite/assets/logo";
import { Logo as NodeREDLogo } from "./nodered/assets/logo";
import { Logo as NotionLogo } from "./notion/assets/logo";
import { Logo as NvdLogo } from "./nvd/assets/logo";
import { Logo as OmniverseLogo } from "./omniverse/assets/logo";
import { Logo as OneNoteLogo } from "./onenote/assets/logo";
import { Logo as OPCUALogo } from "./opcua/assets/logo";
import { Logo as OpsGenieLogo } from "./opsgenie/assets/logo";
import { Logo as OutlookLogo } from "./outlook/assets/logo";
import { Logo as OwaspLogo } from "./owasp/assets/logo";
import { Logo as PagerDutyLogo } from "./pagerduty/assets/logo";
import { Logo as PipedriveLogo } from "./pipedrive/assets/logo";
import { Logo as S3Logo } from "./s3/assets/logo";
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
import { Logo as WorkdayLogo } from "./workday/assets/logo";
import { Logo as ZendeskLogo } from "./zendesk/assets/logo";
import { Logo as ZoomLogo } from "./zoom/assets/logo";

export const appLogos: Record<string, LogoComponent> = {
  [AppType.AHA]: AhaLogo,
  [AppType.AIRTABLE]: AirtableLogo,
  [AppType.AMPLITUDE]: AmplitudeLogo,
  [AppType.CANVA]: CanvaLogo,
  [AppType.ASANA]: AsanaLogo,
  [AppType.BITBUCKET]: BitbucketLogo,
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
  [AppType.COUPA]: CoupaLogo,
  [AppType.DOCEBO]: DoceboLogo,
  [AppType.BOX]: BoxLogo,
  [AppType.DROPBOX]: DropboxLogo,
  [AppType.EGNYTE]: EgnyteLogo,
  [AppType.JIRA]: JiraLogo,
  [AppType.SALESFORCE]: SalesforceLogo,
  [AppType.SERVICENOW]: ServiceNowLogo,
  [AppType.GOOGLE_SITES]: GoogleSitesLogo,
  [AppType.GOOGLE_CALENDAR]: GoogleCalendarLogo,
  [AppType.GOOGLE_CHAT]: GoogleChatLogo,
  [AppType.MICROSOFT_CALENDAR]: MicrosoftCalendarLogo,
  [AppType.AWS_IOT]: AwsIotLogo,
  [AppType.AZURE_IOT]: AzureIotLogo,
  [AppType.SMARTTHINGS]: SmartThingsLogo,
  [AppType.VERKADA]: VerkadaLogo,
  [AppType.ZENDESK]: ZendeskLogo,
  [AppType.HUBSPOT]: HubSpotLogo,
  [AppType.FIGMA]: FigmaLogo,
  [AppType.INTERCOM]: IntercomLogo,
  [AppType.ZOOM]: ZoomLogo,
  [AppType.MONDAY]: MondayLogo,
  [AppType.PAGERDUTY]: PagerDutyLogo,
  [AppType.PIPEDRIVE]: PipedriveLogo,
  [AppType.CLICKUP]: ClickUpLogo,
  [AppType.CODA]: CodaLogo,
  [AppType.AZURE_DEVOPS]: AzureDevOpsLogo,
  [AppType.S3]: S3Logo,
  [AppType.FRESHSERVICE]: FreshserviceLogo,
  [AppType.GONG]: GongLogo,
  [AppType.BAMBOOHR]: BambooHRLogo,
  [AppType.WORKDAY]: WorkdayLogo,
  [AppType.GREENHOUSE]: GreenhouseLogo,
  [AppType.GURU]: GuruLogo,
  [AppType.HIGHSPOT]: HighspotLogo,
  [AppType.ONENOTE]: OneNoteLogo,
  [AppType.MIRO]: MiroLogo,
  [AppType.DYNAMICS_365]: Dynamics365Logo,
  [AppType.OPSGENIE]: OpsGenieLogo,
  [AppType.DATADOG]: DatadogLogo,
  [AppType.DOCUSIGN]: DocuSignLogo,
  [AppType.MARKETO]: MarketoLogo,
  [AppType.EVERNOTE]: EvernoteLogo,
  [AppType.FELLOW]: FellowLogo,
  [AppType.HARVEST]: HarvestLogo,
  [AppType.HAYSTACK]: HaystackLogo,
  [AppType.FIFTEEN_FIVE]: FifteenFiveLogo,
  [AppType.BENCHLING]: BenchlingLogo,
  [AppType.BYNDER]: BynderLogo,
  [AppType.INSIDED]: InsidedLogo,
  [AppType.INTERACT]: InteractLogo,
  [AppType.IRONCLAD]: IroncladLogo,
  [AppType.JENKINS]: JenkinsLogo,
  [AppType.JFROG]: JFrogLogo,
  [AppType.KLUE]: KlueLogo,
  [AppType.LESSONLY]: LessonlyLogo,
  [AppType.LOOKER_STUDIO]: LookerStudioLogo,
  [AppType.LOOPIO]: LoopioLogo,
  [AppType.LUCID]: LucidLogo,
  [AppType.LUMAPPS]: LumAppsLogo,
  [AppType.MINDTICKLE]: MindtickleLogo,
  [AppType.MINDTOUCH]: MindtouchLogo,
  [AppType.NETSUITE]: NetsuiteLogo,
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
