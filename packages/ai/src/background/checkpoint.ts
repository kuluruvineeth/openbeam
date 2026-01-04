export interface ConversationMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface CheckpointState {
  agentId: string;
  version: number;
  stepIndex: number;
  conversationHistory: ConversationMessage[];
  toolResults: Map<string, unknown>;
  currentObjective: string;
  completedObjectives: string[];
  workingMemory: Record<string, unknown>;
  artifacts: Array<{
    type: string;
    path: string;
    content?: string;
  }>;
  createdAt: Date;
}

export interface CheckpointData {
  version: number;
  state: {
    stepIndex: number;
    conversationHistory: Array<{
      role: string;
      content: string;
    }>;
    toolResults: Record<string, unknown>;
    currentObjective: string;
    completedObjectives: string[];
    workingMemory: Record<string, unknown>;
    artifacts: Array<{
      type: string;
      path: string;
      content?: string;
    }>;
  };
  memorySnapshot?: Record<string, unknown>;
  contextWindow?: Array<{ role: string; content: string }>;
  description?: string;
}

export interface CheckpointRepository {
  save(agentId: string, checkpoint: CheckpointData): Promise<void>;
  load(agentId: string, version?: number): Promise<CheckpointData | null>;
  list(
    agentId: string
  ): Promise<Array<{ version: number; createdAt: Date; description?: string }>>;
  delete(agentId: string, version: number): Promise<void>;
  deleteAll(agentId: string): Promise<void>;
}

interface Database {
  backgroundAgentCheckpoint: {
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
    findFirst: (args: {
      where: Record<string, unknown>;
      orderBy?: Record<string, unknown>;
    }) => Promise<{
      version: number;
      state: unknown;
      memorySnapshot: unknown;
      contextWindow: unknown;
    } | null>;
    findMany: (args: {
      where: Record<string, unknown>;
      orderBy?: Record<string, unknown>;
      select?: Record<string, boolean>;
    }) => Promise<
      Array<{ version: number; createdAt: Date; description?: string | null }>
    >;
    delete: (args: { where: Record<string, unknown> }) => Promise<unknown>;
    deleteMany: (args: { where: Record<string, unknown> }) => Promise<unknown>;
  };
}

export class DatabaseCheckpointRepository implements CheckpointRepository {
  private readonly db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async save(agentId: string, checkpoint: CheckpointData): Promise<void> {
    await this.db.backgroundAgentCheckpoint.create({
      data: {
        agentId,
        version: checkpoint.version,
        state: checkpoint.state,
        memorySnapshot: checkpoint.memorySnapshot ?? null,
        contextWindow: checkpoint.contextWindow ?? null,
        stepIndex: checkpoint.state.stepIndex,
        description: checkpoint.description ?? null,
      },
    });
  }

  async load(
    agentId: string,
    version?: number
  ): Promise<CheckpointData | null> {
    const checkpoint = version
      ? await this.db.backgroundAgentCheckpoint.findFirst({
          where: { agentId, version },
        })
      : await this.db.backgroundAgentCheckpoint.findFirst({
          where: { agentId },
          orderBy: { version: "desc" },
        });

    if (!checkpoint) {
      return null;
    }

    return {
      version: checkpoint.version,
      state: checkpoint.state as CheckpointData["state"],
      memorySnapshot: checkpoint.memorySnapshot as
        | Record<string, unknown>
        | undefined,
      contextWindow: checkpoint.contextWindow as
        | Array<{ role: string; content: string }>
        | undefined,
    };
  }

  async list(
    agentId: string
  ): Promise<
    Array<{ version: number; createdAt: Date; description?: string }>
  > {
    const checkpoints = await this.db.backgroundAgentCheckpoint.findMany({
      where: { agentId },
      orderBy: { version: "desc" },
      select: { version: true, createdAt: true, description: true },
    });

    return checkpoints.map((c) => ({
      version: c.version,
      createdAt: c.createdAt,
      description: c.description ?? undefined,
    }));
  }

  async delete(agentId: string, version: number): Promise<void> {
    await this.db.backgroundAgentCheckpoint.delete({
      where: { agentId_version: { agentId, version } },
    });
  }

  async deleteAll(agentId: string): Promise<void> {
    await this.db.backgroundAgentCheckpoint.deleteMany({
      where: { agentId },
    });
  }
}

export class CheckpointService {
  private readonly repository: CheckpointRepository;
  private currentVersion = 0;
  private readonly checkpointInterval: number;
  private readonly maxCheckpoints: number;

  constructor(
    repository: CheckpointRepository,
    options?: {
      checkpointInterval?: number;
      maxCheckpoints?: number;
    }
  ) {
    this.repository = repository;
    this.checkpointInterval = options?.checkpointInterval ?? 5;
    this.maxCheckpoints = options?.maxCheckpoints ?? 10;
  }

  async createCheckpoint(
    agentId: string,
    state: Omit<CheckpointData["state"], "stepIndex"> & { stepIndex: number },
    options?: {
      description?: string;
      memorySnapshot?: Record<string, unknown>;
      contextWindow?: Array<{ role: string; content: string }>;
    }
  ): Promise<number> {
    this.currentVersion += 1;

    await this.repository.save(agentId, {
      version: this.currentVersion,
      state,
      memorySnapshot: options?.memorySnapshot,
      contextWindow: options?.contextWindow,
      description: options?.description,
    });

    await this.pruneOldCheckpoints(agentId);

    return this.currentVersion;
  }

  shouldCheckpoint(stepIndex: number): boolean {
    return stepIndex % this.checkpointInterval === 0;
  }

  async restoreFromCheckpoint(
    agentId: string,
    version?: number
  ): Promise<CheckpointData | null> {
    const checkpoint = await this.repository.load(agentId, version);

    if (checkpoint) {
      this.currentVersion = checkpoint.version;
    }

    return checkpoint;
  }

  listCheckpoints(
    agentId: string
  ): Promise<
    Array<{ version: number; createdAt: Date; description?: string }>
  > {
    return this.repository.list(agentId);
  }

  async rollback(
    agentId: string,
    toVersion: number
  ): Promise<CheckpointData | null> {
    const checkpoints = await this.repository.list(agentId);
    const targetExists = checkpoints.some((c) => c.version === toVersion);

    if (!targetExists) {
      throw new Error(`Checkpoint version ${toVersion} not found`);
    }

    for (const checkpoint of checkpoints) {
      if (checkpoint.version > toVersion) {
        await this.repository.delete(agentId, checkpoint.version);
      }
    }

    return this.restoreFromCheckpoint(agentId, toVersion);
  }

  async cleanup(agentId: string): Promise<void> {
    await this.repository.deleteAll(agentId);
    this.currentVersion = 0;
  }

  private async pruneOldCheckpoints(agentId: string): Promise<void> {
    const checkpoints = await this.repository.list(agentId);

    if (checkpoints.length > this.maxCheckpoints) {
      const toDelete = checkpoints.slice(this.maxCheckpoints);
      for (const checkpoint of toDelete) {
        await this.repository.delete(agentId, checkpoint.version);
      }
    }
  }
}

export function createCheckpointService(
  db: Database,
  options?: {
    checkpointInterval?: number;
    maxCheckpoints?: number;
  }
): CheckpointService {
  const repository = new DatabaseCheckpointRepository(db);
  return new CheckpointService(repository, options);
}
