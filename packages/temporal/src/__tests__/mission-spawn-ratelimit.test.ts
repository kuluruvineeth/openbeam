import { MissionWakePayloadSchema } from "@openplane/types/temporal/mission";
import { describe, expect, it } from "vitest";

describe("spawn rate limiting", () => {
  it("MissionWakePayloadSchema accepts spawn_backpressure reason", () => {
    const result = MissionWakePayloadSchema.parse({
      missionId: "m1",
      reason: "spawn_backpressure",
    });
    expect(result.reason).toBe("spawn_backpressure");
  });

  describe("spawn_backpressure wake event", () => {
    it("valid wake payload with spawn_backpressure and metadata", () => {
      const payload = {
        missionId: "mission-1",
        reason: "spawn_backpressure" as const,
        metadata: { remaining: 15 },
      };
      const parsed = MissionWakePayloadSchema.parse(payload);
      expect(parsed.reason).toBe("spawn_backpressure");
      expect(parsed.metadata).toEqual({ remaining: 15 });
    });

    it("all existing reason values still valid", () => {
      const reasons = [
        "initial",
        "heartbeat",
        "task",
        "mention",
        "manual",
        "run_complete",
        "spawn_backpressure",
      ];
      for (const reason of reasons) {
        const result = MissionWakePayloadSchema.safeParse({
          missionId: "m1",
          reason,
        });
        expect(result.success, `reason "${reason}" should be valid`).toBe(true);
      }
    });
  });
});
