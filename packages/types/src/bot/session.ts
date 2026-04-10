import { z } from "zod";

export const SessionTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  ts: z.number(),
});
export type SessionTurn = z.infer<typeof SessionTurnSchema>;

export const SessionDataSchema = z.object({
  buffer: z.array(SessionTurnSchema),
  summary: z.string().nullable(),
});
export type SessionData = z.infer<typeof SessionDataSchema>;
