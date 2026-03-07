import { ControlServiceError } from "@openbeam/services";
import { TRPCError } from "@trpc/server";

const TRPC_CODE_MAP: Record<string, TRPCError["code"]> = {
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  FORBIDDEN: "FORBIDDEN",
  INVALID_STATE: "BAD_REQUEST",
  MISSING_TEAM: "BAD_REQUEST",
  NO_TEAM_USER: "BAD_REQUEST",
  UNPROCESSABLE: "BAD_REQUEST",
  BUDGET_EXCEEDED: "PRECONDITION_FAILED",
};

export function mapControlError(err: unknown): never {
  if (err instanceof ControlServiceError) {
    throw new TRPCError({
      code: TRPC_CODE_MAP[err.code] ?? "INTERNAL_SERVER_ERROR",
      message: err.message,
    });
  }
  throw err;
}
