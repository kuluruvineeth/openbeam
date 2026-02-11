import { z } from "zod";

export const SessionStatusSchema = z.enum(["active", "archived"]);

export type SessionStatus = z.infer<typeof SessionStatusSchema>;

export const CanvasSessionSchema = z.object({
  id: z.string(),
  agentCanvasId: z.string(),
  teamId: z.string(),
  userId: z.string(),
  title: z.string().optional(),
  status: SessionStatusSchema,
  lastEventSequence: z.number().int().nonnegative(),
  lastActivityAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type CanvasSession = z.infer<typeof CanvasSessionSchema>;

export const GetOrCreateSessionInputSchema = z.object({
  canvasId: z.string().min(1),
  sessionId: z.string().min(1).optional(),
});

export type GetOrCreateSessionInput = z.infer<
  typeof GetOrCreateSessionInputSchema
>;

export const ListSessionsInputSchema = z.object({
  canvasId: z.string().min(1),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export type ListSessionsInput = z.infer<typeof ListSessionsInputSchema>;

export const GetSessionEventsInputSchema = z.object({
  sessionId: z.string().min(1),
  limit: z.number().min(1).max(500).default(100),
  cursorSequence: z.number().int().nonnegative().optional(),
});

export type GetSessionEventsInput = z.infer<typeof GetSessionEventsInputSchema>;

export const AttachmentSchema = z.object({
  type: z.enum(["image", "document"]),
  url: z.string().url(),
  name: z.string().min(1),
});

export type Attachment = z.infer<typeof AttachmentSchema>;

export const BuildCanvasInputSchema = z.object({
  prompt: z.string().min(1).max(10_000),
  canvasId: z.string().optional(),
  sessionId: z.string().min(1),
  model: z.string().optional(),
  turnId: z.string().uuid().optional(),
  attachments: z.array(AttachmentSchema).max(10).optional(),
});

export type BuildCanvasInput = z.infer<typeof BuildCanvasInputSchema>;

export const CreateSessionInputSchema = z.object({
  canvasId: z.string().min(1),
  title: z.string().max(200).optional(),
});

export type CreateSessionInput = z.infer<typeof CreateSessionInputSchema>;

export const ArchiveSessionInputSchema = z.object({
  sessionId: z.string().min(1),
});

export type ArchiveSessionInput = z.infer<typeof ArchiveSessionInputSchema>;

export const OnSessionEventInputSchema = z.object({
  sessionId: z.string().min(1),
  lastSequence: z.number().int().nonnegative().optional(),
});

export type OnSessionEventInput = z.infer<typeof OnSessionEventInputSchema>;
