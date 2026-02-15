export { missionRequestApproval } from "./approvals";
export { missionCreateArtifact } from "./artifacts";
export type { MissionClaimServices } from "./claim-task";
export {
  missionBrowseInbox,
  missionClaimTask,
  setMissionClaimServices,
} from "./claim-task";
export type { MissionDelegationServices } from "./delegation";
export {
  missionDelegateToMission,
  missionDiscoverMissions,
  setMissionDelegationServices,
} from "./delegation";
export { missionEscalate } from "./escalate";
export { missionEvaluateProgress } from "./evaluate-progress";
export { missionListAgents } from "./list-agents";
export type { MissionToolServices } from "./memory";
export {
  getTeamIdFromContext,
  missionReadMemory,
  missionWriteMemory,
  setMissionToolServices,
} from "./memory";
export type { MissionMessagingServices } from "./messaging";
export {
  missionGetInbox,
  missionSendMessage,
  missionWaitForReply,
  setMissionMessagingServices,
} from "./messaging";
export type { MissionPeerReviewServices } from "./peer-review";
export {
  missionRequestPeerReview,
  missionSubmitPeerReview,
  setMissionPeerReviewServices,
} from "./peer-review";
export { missionQueryCapabilities } from "./query-capabilities";
export { missionRequestReplan } from "./request-replan";
export type { MissionSpawnServices } from "./spawn-agent";
export { missionSpawnAgent, setMissionSpawnServices } from "./spawn-agent";
export { missionGetSpawnTree } from "./spawn-tree";
export {
  missionCreateTask,
  missionSendFeedback,
  missionUpdateTaskStatus,
} from "./tasks";
export type { TeamKnowledgeServices } from "./team-knowledge";
export {
  missionQueryTeamKnowledge,
  missionStoreTeamKnowledge,
  setTeamKnowledgeServices,
} from "./team-knowledge";

import { missionRequestApproval } from "./approvals";
import { missionCreateArtifact } from "./artifacts";
import { missionBrowseInbox, missionClaimTask } from "./claim-task";
import {
  missionDelegateToMission,
  missionDiscoverMissions,
} from "./delegation";
import { missionEscalate } from "./escalate";
import { missionEvaluateProgress } from "./evaluate-progress";
import { missionListAgents } from "./list-agents";
import { missionReadMemory, missionWriteMemory } from "./memory";
import {
  missionGetInbox,
  missionSendMessage,
  missionWaitForReply,
} from "./messaging";
import {
  missionRequestPeerReview,
  missionSubmitPeerReview,
} from "./peer-review";
import { missionQueryCapabilities } from "./query-capabilities";
import { missionRequestReplan } from "./request-replan";
import { missionSpawnAgent } from "./spawn-agent";
import { missionGetSpawnTree } from "./spawn-tree";
import {
  missionCreateTask,
  missionSendFeedback,
  missionUpdateTaskStatus,
} from "./tasks";
import {
  missionQueryTeamKnowledge,
  missionStoreTeamKnowledge,
} from "./team-knowledge";

export function registerMissionTools(): void {
  missionReadMemory.register();
  missionWriteMemory.register();
  missionCreateArtifact.register();
  missionRequestApproval.register();
  missionBrowseInbox.register();
  missionClaimTask.register();
  missionEvaluateProgress.register();
  missionRequestReplan.register();
  missionEscalate.register();
  missionUpdateTaskStatus.register();
  missionCreateTask.register();
  missionSendFeedback.register();
  missionSendMessage.register();
  missionWaitForReply.register();
  missionGetInbox.register();
  missionQueryCapabilities.register();
  missionSpawnAgent.register();
  missionListAgents.register();
  missionGetSpawnTree.register();
  missionQueryTeamKnowledge.register();
  missionStoreTeamKnowledge.register();
  missionDiscoverMissions.register();
  missionDelegateToMission.register();
  missionRequestPeerReview.register();
  missionSubmitPeerReview.register();
}
