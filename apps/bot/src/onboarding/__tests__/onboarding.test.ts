import { describe, expect, test } from "bun:test";
import { stageFromCount } from "@openbeam/types/bot";
import { checkMilestones, updateStreak } from "../milestones";
import {
  isExplicitUnresolved,
  isRephrase,
  trigramJaccard,
} from "../resolution";
import { buildWelcomeBack } from "../welcome-back";

describe("stageFromCount", () => {
  test("0-3 queries = TOURIST", () => {
    expect(stageFromCount(0)).toBe("TOURIST");
    expect(stageFromCount(3)).toBe("TOURIST");
  });

  test("4-10 queries = EVALUATOR", () => {
    expect(stageFromCount(4)).toBe("EVALUATOR");
    expect(stageFromCount(10)).toBe("EVALUATOR");
  });

  test("11-50 queries = ADOPTER", () => {
    expect(stageFromCount(11)).toBe("ADOPTER");
    expect(stageFromCount(50)).toBe("ADOPTER");
  });

  test("51+ queries = POWER", () => {
    expect(stageFromCount(51)).toBe("POWER");
    expect(stageFromCount(500)).toBe("POWER");
  });
});

describe("trigramJaccard", () => {
  test("identical strings = 1.0", () => {
    expect(trigramJaccard("hello world", "hello world")).toBe(1);
  });

  test("completely different strings ≈ 0", () => {
    const score = trigramJaccard("hello world", "xyz abc 123");
    expect(score).toBeLessThan(0.2);
  });

  test("rephrased query has high similarity", () => {
    const score = trigramJaccard(
      "how do I deploy to staging",
      "how to deploy to staging environment"
    );
    expect(score).toBeGreaterThan(0.4);
  });

  test("empty strings = 0", () => {
    expect(trigramJaccard("", "")).toBe(0);
  });
});

describe("isRephrase", () => {
  test("detects rephrased queries", () => {
    expect(isRephrase("deploy to staging", "how to deploy to staging")).toBe(
      true
    );
  });

  test("rejects unrelated queries", () => {
    expect(isRephrase("deploy to staging", "onboarding process")).toBe(false);
  });
});

describe("isExplicitUnresolved", () => {
  test("detects unresolved signals", () => {
    expect(isExplicitUnresolved("that's not what I was looking for")).toBe(
      true
    );
    expect(isExplicitUnresolved("wrong answer")).toBe(true);
    expect(isExplicitUnresolved("try again")).toBe(true);
    expect(isExplicitUnresolved("never mind")).toBe(true);
  });

  test("normal queries not flagged", () => {
    expect(isExplicitUnresolved("show me deploy docs")).toBe(false);
    expect(isExplicitUnresolved("thanks")).toBe(false);
  });
});

describe("buildWelcomeBack", () => {
  test("returns null for same-day return", () => {
    const today = new Date().toISOString();
    expect(buildWelcomeBack(today, null, 0)).toBeNull();
  });

  test("returns null for 1-day absence", () => {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString();
    expect(buildWelcomeBack(yesterday, null, 0)).toBeNull();
  });

  test("returns welcome with last query for 3+ day absence", () => {
    const fourDaysAgo = new Date(Date.now() - 4 * 86_400_000).toISOString();
    const msg = buildWelcomeBack(fourDaysAgo, "deploy process", 0);
    expect(msg).toContain("deploy process");
    expect(msg).toContain("Welcome back");
  });

  test("mentions new connectors for 7+ day absence", () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 86_400_000).toISOString();
    const msg = buildWelcomeBack(tenDaysAgo, null, 3);
    expect(msg).toContain("10 days");
    expect(msg).toContain("3 new connectors");
  });

  test("returns null for null lastSeen", () => {
    expect(buildWelcomeBack(null, null, 0)).toBeNull();
  });
});

describe("checkMilestones", () => {
  test("fires first query milestone", () => {
    const state = {
      queryCount: 1,
      stage: "TOURIST" as const,
      discoveredCaps: [],
      streakDays: 0,
      lastStreakDate: null,
      resolvedCount: 0,
      unresolvedCount: 0,
    };
    const msg = checkMilestones(state, new Set());
    expect(msg).toContain("First search");
  });

  test("fires 50 queries milestone", () => {
    const state = {
      queryCount: 50,
      stage: "ADOPTER" as const,
      discoveredCaps: [],
      streakDays: 0,
      lastStreakDate: null,
      resolvedCount: 0,
      unresolvedCount: 0,
    };
    const msg = checkMilestones(state, new Set(["milestoneFirstAction"]));
    expect(msg).toContain("50 searches");
  });

  test("skips already achieved milestones", () => {
    const state = {
      queryCount: 1,
      stage: "TOURIST" as const,
      discoveredCaps: [],
      streakDays: 0,
      lastStreakDate: null,
      resolvedCount: 0,
      unresolvedCount: 0,
    };
    const msg = checkMilestones(state, new Set(["milestoneFirstAction"]));
    expect(msg).toBeNull();
  });
});

describe("updateStreak", () => {
  test("same day = no change", () => {
    const today = new Date().toISOString().slice(0, 10);
    const result = updateStreak(5, today);
    expect(result.streakDays).toBe(5);
  });

  test("consecutive day = increment", () => {
    const yesterday = new Date(Date.now() - 86_400_000)
      .toISOString()
      .slice(0, 10);
    const result = updateStreak(5, yesterday);
    expect(result.streakDays).toBe(6);
  });

  test("gap = reset to 1", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const result = updateStreak(5, threeDaysAgo);
    expect(result.streakDays).toBe(1);
  });

  test("first ever = 1", () => {
    const result = updateStreak(0, null);
    expect(result.streakDays).toBe(1);
  });
});
