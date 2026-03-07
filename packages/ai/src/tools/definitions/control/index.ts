export {
  controlAgentGetTool,
  controlAgentListTool,
  controlAgentWakeTool,
} from "./agents";
export {
  controlApprovalListTool,
  controlApprovalRequestTool,
  controlApprovalRespondTool,
} from "./approvals";
export { controlArtifactCreateTool } from "./artifacts";
export { controlEscalateTool, controlMessageTool } from "./communication";
export { controlCostQueryTool, controlCostRecordTool } from "./costs";
export {
  controlAgentDelegateTool,
  controlAgentSpawnTool,
} from "./delegation";
export { controlGoalGetTool, controlGoalListTool } from "./goals";
export {
  controlIssueCheckoutTool,
  controlIssueCommentTool,
  controlIssueCreateTool,
  controlIssueListTool,
  controlIssueUpdateTool,
} from "./issues";
export {
  controlKnowledgeQueryTool,
  controlKnowledgeStoreTool,
} from "./knowledge";
export { controlMemoryReadTool, controlMemoryWriteTool } from "./memory";
export {
  controlEvaluateProgressTool,
  controlRequestReplanTool,
} from "./progress";
export { controlProjectListTool } from "./projects";

import { registerAgentTools } from "./agents";
import { registerApprovalTools } from "./approvals";
import { registerArtifactTools } from "./artifacts";
import { registerCommunicationTools } from "./communication";
import { registerCostTools } from "./costs";
import { registerDelegationTools } from "./delegation";
import { registerGoalTools } from "./goals";
import { registerIssueTools } from "./issues";
import { registerKnowledgeTools } from "./knowledge";
import { registerControlMemoryTools } from "./memory";
import { registerProgressTools } from "./progress";
import { registerProjectTools } from "./projects";

export function registerControlTools() {
  registerAgentTools();
  registerApprovalTools();
  registerArtifactTools();
  registerCommunicationTools();
  registerCostTools();
  registerDelegationTools();
  registerGoalTools();
  registerIssueTools();
  registerKnowledgeTools();
  registerControlMemoryTools();
  registerProgressTools();
  registerProjectTools();
}
