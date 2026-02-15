import { describe, expect, it } from "vitest";
import { createAgentActivities } from "../activities/agents";
import {
  createMissionActivities,
  createReflectionActivities,
} from "../activities/mission";
import { extendTimeoutSignal } from "../workflows/agents/signals";
import {
  agentInboxDeliverySignal,
  agentMessageRouteSignal,
  crossMissionSignal,
  dependencyFailureSignal,
  missionHealthQuery,
  missionRuntimeQuery,
  missionWakeSignal,
  spawnAgentSignal,
} from "../workflows/types";

describe("section 6 integration map contract", () => {
  it("exposes shared signal and query infrastructure", () => {
    expect(missionWakeSignal).toBeDefined();
    expect(spawnAgentSignal).toBeDefined();
    expect(agentMessageRouteSignal).toBeDefined();
    expect(agentInboxDeliverySignal).toBeDefined();
    expect(crossMissionSignal).toBeDefined();
    expect(dependencyFailureSignal).toBeDefined();
    expect(missionRuntimeQuery).toBeDefined();
    expect(missionHealthQuery).toBeDefined();
    expect(extendTimeoutSignal).toBeDefined();
  });

  it("exposes mission activity surface across messaging, spawning, and cross-mission", () => {
    const missionActivities = createMissionActivities({
      db: {} as never,
    });

    expect(typeof missionActivities.routeAgentMessage).toBe("function");
    expect(typeof missionActivities.fetchAgentInbox).toBe("function");
    expect(typeof missionActivities.waitForAgentReply).toBe("function");
    expect(typeof missionActivities.requestAgentSpawn).toBe("function");
    expect(typeof missionActivities.validateSpawnRequest).toBe("function");
    expect(typeof missionActivities.generateSpawnedSoulPrompt).toBe("function");
    expect(typeof missionActivities.createSpawnedAgent).toBe("function");
    expect(typeof missionActivities.discoverMissions).toBe("function");
    expect(typeof missionActivities.delegateTaskToMission).toBe("function");
    expect(typeof missionActivities.queryTeamKnowledge).toBe("function");
    expect(typeof missionActivities.storeTeamKnowledge).toBe("function");
  });

  it("exposes unbounded-chain and reflection activity surfaces", () => {
    const agentActivities = createAgentActivities({
      db: {} as never,
      executor: {
        executeStep: async () => ({
          artifacts: [],
          complete: true,
          tokensUsed: 0,
          costCents: 0,
        }),
      },
    });

    expect(typeof agentActivities.executeAgentStep).toBe("function");
    expect(typeof agentActivities.executeAgentStepChunked).toBe("function");
    expect(typeof agentActivities.executeParallelAgentSteps).toBe("function");

    const reflectionActivities = createReflectionActivities({
      db: {} as never,
      generateText: async () => "{}",
    });

    expect(typeof reflectionActivities.evaluateProgress).toBe("function");
    expect(typeof reflectionActivities.generateReplan).toBe("function");
    expect(typeof reflectionActivities.criticReview).toBe("function");
    expect(typeof reflectionActivities.escalate).toBe("function");
    expect(typeof reflectionActivities.checkMissionHealth).toBe("function");
    expect(typeof reflectionActivities.notifyDependencyFailure).toBe(
      "function"
    );
  });
});
