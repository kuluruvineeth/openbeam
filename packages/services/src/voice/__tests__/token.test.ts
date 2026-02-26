import { describe, expect, it } from "bun:test";
import { generateRoomName } from "../token";

describe("generateRoomName", () => {
  it("includes teamId and userId", () => {
    const name = generateRoomName("team-1", "user-1", "dictation");
    expect(name).toContain("team-1");
    expect(name).toContain("user-1");
  });

  it("includes roomType", () => {
    const name = generateRoomName("team-1", "user-1", "dictation");
    expect(name).toContain("dictation");
  });

  it("includes timestamp for uniqueness", () => {
    const name = generateRoomName("team-1", "user-1", "dictation");
    const parts = name.split("-");
    const timestamp = parts.at(-1);
    expect(Number(timestamp)).toBeGreaterThan(0);
  });

  it("generates different names for different room types", () => {
    const dictation = generateRoomName("team-1", "user-1", "dictation");
    const action = generateRoomName("team-1", "user-1", "action");
    expect(dictation).not.toBe(action);
  });
});
