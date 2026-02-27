import { afterEach, describe, expect, it } from "bun:test";
import {
  clearSandboxOwnershipStore,
  deleteSandboxOwnerTeamId,
  getSandboxOwnerTeamId,
  setSandboxOwnerTeamId,
} from "../ownership";

describe("sandbox ownership store", () => {
  afterEach(() => {
    clearSandboxOwnershipStore();
  });

  it("stores and retrieves ownership by provider and sandbox id", async () => {
    await setSandboxOwnerTeamId("local", "sbx-1", "team-a");

    expect(await getSandboxOwnerTeamId("local", "sbx-1")).toBe("team-a");
    expect(await getSandboxOwnerTeamId("daytona", "sbx-1")).toBeUndefined();
  });

  it("deletes ownership entries", async () => {
    await setSandboxOwnerTeamId("local", "sbx-1", "team-a");
    await deleteSandboxOwnerTeamId("local", "sbx-1");

    expect(await getSandboxOwnerTeamId("local", "sbx-1")).toBeUndefined();
  });

  it("ignores empty team ownership writes", async () => {
    await setSandboxOwnerTeamId("local", "sbx-1", undefined);
    expect(await getSandboxOwnerTeamId("local", "sbx-1")).toBeUndefined();
  });
});
