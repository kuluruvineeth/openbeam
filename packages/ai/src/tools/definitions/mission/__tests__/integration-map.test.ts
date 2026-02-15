import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { toolRegistry } from "../../../registry";
import { registerMissionTools } from "../index";

const REQUIRED_SECTION6_TOOL_NAMES = [
  "mission_send_message",
  "mission_wait_for_reply",
  "mission_get_inbox",
  "mission_spawn_agent",
  "mission_query_capabilities",
  "mission_query_team_knowledge",
  "mission_store_team_knowledge",
  "mission_discover_missions",
  "mission_delegate_to_mission",
  "mission_evaluate_progress",
  "mission_request_replan",
  "mission_escalate",
] as const;

describe("registerMissionTools integration", () => {
  beforeEach(() => {
    toolRegistry.clear();
  });

  afterEach(() => {
    toolRegistry.clear();
  });

  it("registers section 6 integration tools for systems 1-5", () => {
    registerMissionTools();

    const names = new Set(toolRegistry.listNames());

    for (const toolName of REQUIRED_SECTION6_TOOL_NAMES) {
      expect(names.has(toolName)).toBe(true);
    }
  });

  it("is idempotent when invoked multiple times", () => {
    registerMissionTools();
    const initialSize = toolRegistry.size();

    registerMissionTools();

    expect(toolRegistry.size()).toBe(initialSize);
  });
});
