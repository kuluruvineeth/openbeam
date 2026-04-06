import type { ConnectorActionsRegistry } from "@openbeam/types/connector-actions";
import { ahaActionsRegistry } from "./aha";
import { airtableActionsRegistry } from "./airtable";
import { amplitudeActionsRegistry } from "./amplitude";
import { asanaActionsRegistry } from "./asana";
import { awsIotActionsRegistry } from "./aws-iot";
import { azureDevOpsActionsRegistry } from "./azure-devops";
import { bamboohrActionsRegistry } from "./bamboohr";
import { benchlingActionsRegistry } from "./benchling";
import { bitbucketActionsRegistry } from "./bitbucket";
import { boxActionsRegistry } from "./box";
import { bynderActionsRegistry } from "./bynder";
import { canvaActionsRegistry } from "./canva";
import { clickUpActionsRegistry } from "./clickup";
import { codaActionsRegistry } from "./coda";
import { confluenceActionsRegistry } from "./confluence";
import { coupaActionsRegistry } from "./coupa";
import { datadogActionsRegistry } from "./datadog";
import { doceboActionsRegistry } from "./docebo";
import { docuSignActionsRegistry } from "./docusign";
import { dropboxActionsRegistry } from "./dropbox";
import { dynamics365ActionsRegistry } from "./dynamics365";
import { egnyteActionsRegistry } from "./egnyte";
import { evernoteActionsRegistry } from "./evernote";
import { fellowActionsRegistry } from "./fellow";
import { fifteenFiveActionsRegistry } from "./fifteen-five";
import { figmaActionsRegistry } from "./figma";
import { freshserviceActionsRegistry } from "./freshservice";
import { githubActionsRegistry } from "./github";
import { gitlabActionsRegistry } from "./gitlab";
import { gmailActionsRegistry } from "./gmail";
import { gongActionsRegistry } from "./gong";
import { googleCalendarActionsRegistry } from "./google-calendar";
import { googleChatActionsRegistry } from "./google-chat";
import { googleDriveActionsRegistry } from "./google-drive";
import { googleSitesActionsRegistry } from "./google-sites";
import { greenhouseActionsRegistry } from "./greenhouse";
import { guruActionsRegistry } from "./guru";
import { harvestActionsRegistry } from "./harvest";
import { haystackActionsRegistry } from "./haystack";
import { highspotActionsRegistry } from "./highspot";
import { hubspotActionsRegistry } from "./hubspot";
import { insidedActionsRegistry } from "./insided";
import { interactActionsRegistry } from "./interact";
import { intercomActionsRegistry } from "./intercom";
import { ironcladActionsRegistry } from "./ironclad";
import { jenkinsActionsRegistry } from "./jenkins";
import { jfrogActionsRegistry } from "./jfrog";
import { jiraActionsRegistry } from "./jira";
import { klueActionsRegistry } from "./klue";
import { lessonlyActionsRegistry } from "./lessonly";
import { linearActionsRegistry } from "./linear";
import { lookerStudioActionsRegistry } from "./looker-studio";
import { loopioActionsRegistry } from "./loopio";
import { lucidActionsRegistry } from "./lucid";
import { lumappsActionsRegistry } from "./lumapps";
import { marketoActionsRegistry } from "./marketo";
import { microsoftCalendarActionsRegistry } from "./microsoft-calendar";
import { mindtickleActionsRegistry } from "./mindtickle";
import { mindtouchActionsRegistry } from "./mindtouch";
import { miroActionsRegistry } from "./miro";
import { mondayActionsRegistry } from "./monday";
import { netsuiteActionsRegistry } from "./netsuite";
import { niceCxoneActionsRegistry } from "./nice-cxone";
import { notionActionsRegistry } from "./notion";
import { onenoteActionsRegistry } from "./onenote";
import { opsgenieActionsRegistry } from "./opsgenie";
import { outlookActionsRegistry } from "./outlook";
import { pagerdutyActionsRegistry } from "./pagerduty";
import { panoptoActionsRegistry } from "./panopto";
import { phabricatorActionsRegistry } from "./phabricator";
import { pipedriveActionsRegistry } from "./pipedrive";
import { procoreActionsRegistry } from "./procore";
import { s3ActionsRegistry } from "./s3";
import { salesforceActionsRegistry } from "./salesforce";
import { samsaraActionsRegistry } from "./samsara";
import { seismicActionsRegistry } from "./seismic";
import { servicenowActionsRegistry } from "./servicenow";
import { sharePointActionsRegistry } from "./sharepoint";
import { showpadActionsRegistry } from "./showpad";
import { simpplrActionsRegistry } from "./simpplr";
import { slackActionsRegistry } from "./slack";
import { smartsheetActionsRegistry } from "./smartsheet";
import { smartThingsActionsRegistry } from "./smartthings";
import { teamsActionsRegistry } from "./teams";
import { verkadaActionsRegistry } from "./verkada";
import { workdayActionsRegistry } from "./workday";
import { zendeskActionsRegistry } from "./zendesk";
import { zoomActionsRegistry } from "./zoom";

export const ALL_CONNECTOR_ACTION_REGISTRIES: ConnectorActionsRegistry[] = [
  ahaActionsRegistry,
  airtableActionsRegistry,
  amplitudeActionsRegistry,
  asanaActionsRegistry,
  awsIotActionsRegistry,
  azureDevOpsActionsRegistry,
  bamboohrActionsRegistry,
  benchlingActionsRegistry,
  bitbucketActionsRegistry,
  boxActionsRegistry,
  bynderActionsRegistry,
  canvaActionsRegistry,
  clickUpActionsRegistry,
  codaActionsRegistry,
  confluenceActionsRegistry,
  coupaActionsRegistry,
  datadogActionsRegistry,
  doceboActionsRegistry,
  docuSignActionsRegistry,
  dropboxActionsRegistry,
  dynamics365ActionsRegistry,
  egnyteActionsRegistry,
  evernoteActionsRegistry,
  fellowActionsRegistry,
  fifteenFiveActionsRegistry,
  figmaActionsRegistry,
  freshserviceActionsRegistry,
  githubActionsRegistry,
  gitlabActionsRegistry,
  gmailActionsRegistry,
  gongActionsRegistry,
  googleCalendarActionsRegistry,
  googleChatActionsRegistry,
  googleDriveActionsRegistry,
  googleSitesActionsRegistry,
  greenhouseActionsRegistry,
  guruActionsRegistry,
  harvestActionsRegistry,
  haystackActionsRegistry,
  highspotActionsRegistry,
  hubspotActionsRegistry,
  insidedActionsRegistry,
  interactActionsRegistry,
  intercomActionsRegistry,
  ironcladActionsRegistry,
  jenkinsActionsRegistry,
  jfrogActionsRegistry,
  jiraActionsRegistry,
  klueActionsRegistry,
  lessonlyActionsRegistry,
  linearActionsRegistry,
  lookerStudioActionsRegistry,
  loopioActionsRegistry,
  lucidActionsRegistry,
  lumappsActionsRegistry,
  marketoActionsRegistry,
  microsoftCalendarActionsRegistry,
  mindtickleActionsRegistry,
  mindtouchActionsRegistry,
  miroActionsRegistry,
  mondayActionsRegistry,
  netsuiteActionsRegistry,
  niceCxoneActionsRegistry,
  notionActionsRegistry,
  onenoteActionsRegistry,
  opsgenieActionsRegistry,
  outlookActionsRegistry,
  pagerdutyActionsRegistry,
  panoptoActionsRegistry,
  phabricatorActionsRegistry,
  pipedriveActionsRegistry,
  procoreActionsRegistry,
  s3ActionsRegistry,
  salesforceActionsRegistry,
  samsaraActionsRegistry,
  seismicActionsRegistry,
  servicenowActionsRegistry,
  sharePointActionsRegistry,
  showpadActionsRegistry,
  simpplrActionsRegistry,
  slackActionsRegistry,
  smartsheetActionsRegistry,
  smartThingsActionsRegistry,
  teamsActionsRegistry,
  verkadaActionsRegistry,
  workdayActionsRegistry,
  zendeskActionsRegistry,
  zoomActionsRegistry,
];
