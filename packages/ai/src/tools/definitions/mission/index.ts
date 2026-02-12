export { missionRequestApproval } from "./approvals";
export { missionCreateArtifact } from "./artifacts";
export type { MissionToolServices } from "./memory";
export {
  missionReadMemory,
  missionWriteMemory,
  setMissionToolServices,
} from "./memory";
export {
  missionCreateTask,
  missionSendFeedback,
  missionUpdateTaskStatus,
} from "./tasks";

import { missionRequestApproval } from "./approvals";
import { missionCreateArtifact } from "./artifacts";
import { missionReadMemory, missionWriteMemory } from "./memory";
import {
  missionCreateTask,
  missionSendFeedback,
  missionUpdateTaskStatus,
} from "./tasks";

export function registerMissionTools(): void {
  missionReadMemory.register();
  missionWriteMemory.register();
  missionCreateArtifact.register();
  missionRequestApproval.register();
  missionUpdateTaskStatus.register();
  missionCreateTask.register();
  missionSendFeedback.register();
}
