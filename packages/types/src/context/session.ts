import { z } from "zod";

export const SessionStatusSchema = z.enum(["active", "committed", "archived"]);

export type SessionStatus = z.infer<typeof SessionStatusSchema>;

export const ContextSessionSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  userId: z.string(),
  agentId: z.string().nullable(),
  totalTokens: z.number().int().nonnegative().default(0),
  archiveCount: z.number().int().nonnegative().default(0),
  status: SessionStatusSchema.default("active"),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type ContextSession = z.infer<typeof ContextSessionSchema>;

export const ContextSessionMessageSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  role: z.enum(["user", "assistant", "tool", "system"]),
  content: z.string(),
  parts: z.unknown().nullable(),
  tokenCount: z.number().int().nonnegative().default(0),
  createdAt: z.coerce.date(),
});

export type ContextSessionMessage = z.infer<typeof ContextSessionMessageSchema>;
