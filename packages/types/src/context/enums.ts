import { z } from "zod";

export const ContextTypeSchema = z.enum([
  "resource",
  "memory",
  "skill",
  "tool",
]);

export type ContextType = z.infer<typeof ContextTypeSchema>;

export const OwnerTypeSchema = z.enum(["user", "agent", "team"]);

export type OwnerType = z.infer<typeof OwnerTypeSchema>;

export const ContextScopeSchema = z.enum([
  "session",
  "user",
  "agent",
  "resources",
  "tools",
]);

export type ContextScope = z.infer<typeof ContextScopeSchema>;
