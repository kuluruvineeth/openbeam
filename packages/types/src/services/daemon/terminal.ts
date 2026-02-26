import { z } from "zod";

export const TerminalCellSchema = z.object({
  char: z.string(),
  fg: z.number().optional(),
  bg: z.number().optional(),
  fgMode: z.number().optional(),
  bgMode: z.number().optional(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  underline: z.boolean().optional(),
});

export type TerminalCell = z.infer<typeof TerminalCellSchema>;

export const TerminalCursorSchema = z.object({
  row: z.number(),
  col: z.number(),
});

export type TerminalCursor = z.infer<typeof TerminalCursorSchema>;

export const TerminalStateSchema = z.object({
  rows: z.number(),
  cols: z.number(),
  grid: z.array(z.array(TerminalCellSchema)),
  scrollback: z.array(z.array(TerminalCellSchema)),
  cursor: TerminalCursorSchema,
});

export type TerminalState = z.infer<typeof TerminalStateSchema>;

export const TerminalClientMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("input"), data: z.string() }),
  z.object({
    type: z.literal("resize"),
    rows: z.number().int().positive(),
    cols: z.number().int().positive(),
  }),
  z.object({
    type: z.literal("mouse"),
    row: z.number().int().nonnegative(),
    col: z.number().int().nonnegative(),
    button: z.number().int().nonnegative(),
    action: z.enum(["down", "up", "move"]),
  }),
]);

export type TerminalClientMessage = z.infer<typeof TerminalClientMessageSchema>;

export type TerminalListItem = {
  id: string;
  name: string;
  cwd: string;
};

export type TerminalRawChunk = {
  data: string;
  startOffset: number;
  endOffset: number;
  replay: boolean;
};

export type TerminalRawSubscriptionResult = {
  unsubscribe: () => void;
  replayedFrom: number;
  currentOffset: number;
  earliestAvailableOffset: number;
  reset: boolean;
};

export interface TerminalSession {
  readonly id: string;
  readonly name: string;
  readonly cwd: string;
  getState(): TerminalState;
  handleClientMessage(message: TerminalClientMessage): void;
  subscribeRawOutput(
    handler: (chunk: TerminalRawChunk) => void,
    options?: { resumeOffset?: number; rows?: number; cols?: number }
  ): TerminalRawSubscriptionResult;
  onExit(handler: () => void): () => void;
  kill(): void;
}

export interface TerminalManager {
  getTerminals(cwd: string): Promise<TerminalSession[]>;
  createTerminal(options: {
    cwd: string;
    name?: string;
    env?: Record<string, string>;
  }): Promise<TerminalSession>;
  registerCwdEnv(options: { cwd: string; env: Record<string, string> }): void;
  getTerminal(id: string): TerminalSession | undefined;
  killTerminal(id: string): void;
  listDirectories(): string[];
  killAll(): void;
  subscribeTerminalsChanged(
    listener: (event: { cwd: string; terminals: TerminalListItem[] }) => void
  ): () => void;
}
