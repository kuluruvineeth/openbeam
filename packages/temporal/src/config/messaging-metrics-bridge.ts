import {
  type MessagingMetricsHook,
  setMessagingMetricsHook,
} from "@openplane/redis";
import { swarmMetrics } from "./metrics";

const bridge: MessagingMetricsHook = {
  onPublished(missionId) {
    swarmMetrics.messagesSent.inc({ missionId });
  },
  onRateLimited(missionId, _senderId, window) {
    swarmMetrics.messagesRateLimited.inc({ missionId, window });
  },
  onDeduplicated(missionId) {
    swarmMetrics.messagesDeduplicated.inc({ missionId });
  },
  onDeadLettered(streamKey) {
    swarmMetrics.messagesDeadLettered.inc({ streamKey });
  },
  onReclaimed(streamKey, count) {
    swarmMetrics.messagesReclaimed.inc({ streamKey }, count);
  },
  onReprocessed(streamKey) {
    swarmMetrics.messagesReprocessed.inc({ streamKey });
  },
};

let initialized = false;

export function initMessagingMetricsBridge(): void {
  if (initialized) {
    return;
  }
  setMessagingMetricsHook(bridge);
  initialized = true;
}

export function resetMessagingMetricsBridge(): void {
  initialized = false;
}
