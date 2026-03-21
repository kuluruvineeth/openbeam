import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react";
import {
  ArtificialIntelligence01Icon,
  BookOpen01Icon,
  CommandLineIcon,
  FlowSquareIcon,
  GitBranchIcon,
  Home01Icon,
  Rocket01Icon,
  Search01Icon,
  ServerStackIcon,
  Settings01Icon,
} from "@hugeicons-pro/core-stroke-rounded";
import { type InferPageType, loader } from "fumadocs-core/source";
import { createElement, type ReactElement } from "react";
import { docs } from "@/.source";
import {
  AwsIotIcon,
  AzureIotIcon,
  BACnetIcon,
  ConfluenceIcon,
  FHIRIcon,
  GitHubIcon,
  GmailIcon,
  GoogleCalendarIcon,
  GoogleDriveIcon,
  JiraIcon,
  LinearIcon,
  MatterportIcon,
  MicrosoftCalendarIcon,
  MQTTIcon,
  NodeREDIcon,
  NotionIcon,
  OmniverseIcon,
  OPCUAIcon,
  OutlookIcon,
  SalesforceIcon,
  SamsaraIcon,
  SecurityShieldIcon,
  ServiceNowIcon,
  SharePointIcon,
  SlackIcon,
  SmartThingsIcon,
  TeamsIcon,
  ThingsBoardIcon,
  VerkadaIcon,
  ViamIcon,
  ZendeskIcon,
} from "@/components/connector-icons";

type IconType = HugeiconsIconProps["icon"];

const hugeIconMap: Record<string, IconType> = {
  BookOpen: BookOpen01Icon,
  Bot: ArtificialIntelligence01Icon,
  Connector: FlowSquareIcon,
  Connectors: FlowSquareIcon,
  GitBranch: GitBranchIcon,
  Home: Home01Icon,
  LayoutGrid: FlowSquareIcon,
  Rocket: Rocket01Icon,
  Search: Search01Icon,
  Server: ServerStackIcon,
  Settings: Settings01Icon,
  Terminal: CommandLineIcon,
};

const customIconMap: Record<
  string,
  (props: { size?: number }) => ReactElement
> = {
  Slack: SlackIcon,
  Gmail: GmailIcon,
  GoogleDrive: GoogleDriveIcon,
  Notion: NotionIcon,
  Linear: LinearIcon,
  GitHub: GitHubIcon,
  Samsara: SamsaraIcon,
  MQTT: MQTTIcon,
  OPCUA: OPCUAIcon,
  BACnet: BACnetIcon,
  ThingsBoard: ThingsBoardIcon,
  NodeRED: NodeREDIcon,
  FHIR: FHIRIcon,
  Matterport: MatterportIcon,
  Omniverse: OmniverseIcon,
  Viam: ViamIcon,
  AwsIot: AwsIotIcon,
  AzureIot: AzureIotIcon,
  SmartThings: SmartThingsIcon,
  Verkada: VerkadaIcon,
  Outlook: OutlookIcon,
  SharePoint: SharePointIcon,
  Teams: TeamsIcon,
  Confluence: ConfluenceIcon,
  Jira: JiraIcon,
  Salesforce: SalesforceIcon,
  GoogleCalendar: GoogleCalendarIcon,
  MicrosoftCalendar: MicrosoftCalendarIcon,
  SecurityShield: SecurityShieldIcon,
  ServiceNow: ServiceNowIcon,
  Zendesk: ZendeskIcon,
};

export const source = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
  icon(icon) {
    if (!icon) {
      return;
    }
    if (icon in customIconMap) {
      return createElement(customIconMap[icon], { size: 16 });
    }
    if (icon in hugeIconMap) {
      return createElement(HugeiconsIcon, {
        icon: hugeIconMap[icon],
        size: 16,
        strokeWidth: 1.5,
        color: "currentColor",
      });
    }
    return;
  },
});

export function getPageImage(page: InferPageType<typeof source>) {
  const segments = [...page.slugs, "image.png"];

  return {
    segments,
    url: `/og/docs/${segments.join("/")}`,
  };
}

export async function getLLMText(page: InferPageType<typeof source>) {
  const processed = await page.data.getText("processed");

  return `# ${page.data.title}

${processed}`;
}
