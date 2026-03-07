import { describe, expect, it } from "bun:test";
import { ControlServiceError } from "@openbeam/services";
import { TRPCError } from "@trpc/server";
import { mapControlError } from "../control/middleware";

describe("mapControlError", () => {
  it("maps NOT_FOUND to tRPC NOT_FOUND", () => {
    const err = ControlServiceError.notFound("Agent");
    try {
      mapControlError(err);
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("NOT_FOUND");
      expect((e as TRPCError).message).toBe("Agent not found");
    }
  });

  it("maps CONFLICT to tRPC CONFLICT", () => {
    const err = ControlServiceError.conflict("Duplicate name");
    try {
      mapControlError(err);
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("CONFLICT");
    }
  });

  it("maps FORBIDDEN to tRPC FORBIDDEN", () => {
    const err = ControlServiceError.forbidden("Access denied");
    try {
      mapControlError(err);
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("FORBIDDEN");
    }
  });

  it("maps INVALID_STATE to tRPC BAD_REQUEST", () => {
    const err = ControlServiceError.invalidState("Agent is terminated");
    try {
      mapControlError(err);
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("BAD_REQUEST");
    }
  });

  it("maps UNPROCESSABLE to tRPC BAD_REQUEST", () => {
    const err = ControlServiceError.unprocessable("Cycle detected");
    try {
      mapControlError(err);
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("BAD_REQUEST");
    }
  });

  it("maps BUDGET_EXCEEDED to tRPC PRECONDITION_FAILED", () => {
    const err = ControlServiceError.budgetExceeded("Over monthly limit");
    try {
      mapControlError(err);
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("PRECONDITION_FAILED");
    }
  });

  it("maps MISSING_TEAM to tRPC BAD_REQUEST", () => {
    const err = new ControlServiceError("MISSING_TEAM", "team_id required");
    try {
      mapControlError(err);
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("BAD_REQUEST");
    }
  });

  it("re-throws non-ControlServiceError unchanged", () => {
    const err = new Error("random crash");
    try {
      mapControlError(err);
    } catch (e) {
      expect(e).toBe(err);
      expect(e).not.toBeInstanceOf(TRPCError);
    }
  });

  it("preserves original message in mapped error", () => {
    const err = ControlServiceError.notFound("Config revision");
    try {
      mapControlError(err);
    } catch (e) {
      expect((e as TRPCError).message).toBe("Config revision not found");
    }
  });
});

describe("controlRouter procedure registry", () => {
  it("agentsRouter has expected procedures", async () => {
    const { agentsRouter } = await import("../control/agents");
    const procedures = agentsRouter._def.procedures as Record<string, unknown>;

    const expected = [
      "list",
      "get",
      "getWithRelations",
      "create",
      "update",
      "pause",
      "resume",
      "terminate",
      "remove",
      "activate",
      "createApiKey",
      "listApiKeys",
      "revokeApiKey",
      "revokeAllApiKeys",
      "listConfigRevisions",
      "rollbackConfig",
      "chainOfCommand",
      "orgChart",
      "wake",
      "count",
    ];

    for (const name of expected) {
      expect(procedures[name]).toBeDefined();
    }
    expect(Object.keys(procedures)).toHaveLength(expected.length);
  });

  it("agentsRouter mutation/query types are correct", async () => {
    const { agentsRouter } = await import("../control/agents");
    const procedures = agentsRouter._def.procedures as Record<
      string,
      { _def?: { type?: string } }
    >;

    const queries = [
      "list",
      "get",
      "getWithRelations",
      "listApiKeys",
      "listConfigRevisions",
      "chainOfCommand",
      "orgChart",
      "count",
    ];
    const mutations = [
      "create",
      "update",
      "pause",
      "resume",
      "terminate",
      "remove",
      "activate",
      "createApiKey",
      "revokeApiKey",
      "revokeAllApiKeys",
      "rollbackConfig",
      "wake",
    ];

    for (const name of queries) {
      expect(procedures[name]?._def?.type).toBe("query");
    }
    for (const name of mutations) {
      expect(procedures[name]?._def?.type).toBe("mutation");
    }
  });
});
