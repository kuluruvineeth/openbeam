import { ActionNotFoundError, ActionValidationError } from "../../errors";

export function str(p: Record<string, unknown>, key: string): string {
  const value = p[key];
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  throw new ActionValidationError(`${key} is required`, key);
}

export function optStr(
  p: Record<string, unknown>,
  key: string
): string | undefined {
  const value = p[key];
  if (typeof value !== "string") {
    return;
  }
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

export function strArr(p: Record<string, unknown>, key: string): string[] {
  const value = p[key];
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  throw new ActionValidationError(`${key} is required`, key);
}

export function optStrArr(
  p: Record<string, unknown>,
  key: string
): string[] | undefined {
  const value = p[key];
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  return;
}

export function num(p: Record<string, unknown>, key: string): number {
  const value = p[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  throw new ActionValidationError(`${key} is required`, key);
}

export function optNum(
  p: Record<string, unknown>,
  key: string
): number | undefined {
  const value = p[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return;
}

export function bool(p: Record<string, unknown>, key: string): boolean {
  const value = p[key];
  if (typeof value === "boolean") {
    return value;
  }
  throw new ActionValidationError(`${key} is required`, key);
}

export function optBool(
  p: Record<string, unknown>,
  key: string
): boolean | undefined {
  const value = p[key];
  return typeof value === "boolean" ? value : undefined;
}

export function obj(
  p: Record<string, unknown>,
  key: string
): Record<string, unknown> {
  const value = p[key];
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new ActionValidationError(`${key} is required`, key);
}

export function optObj(
  p: Record<string, unknown>,
  key: string
): Record<string, unknown> | undefined {
  const value = p[key];
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return;
}

export function unsupportedAction(
  connectorType: string,
  actionId: string
): never {
  throw new ActionNotFoundError(connectorType, actionId);
}
