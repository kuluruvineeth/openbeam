import type { VoiceStreamClient } from "../types";

export type DictationStreamSenderParams = {
  client: VoiceStreamClient | null;
  format: string;
  createDictationId?: () => string;
};

type DictationFinishResult = { dictationId: string; text: string };

let idCounter = 0;
function defaultCreateId(): string {
  idCounter += 1;
  return `dict-${Date.now()}-${idCounter}`;
}

export class DictationStreamSender {
  private client: VoiceStreamClient | null;
  private readonly format: string;
  private readonly createDictationId: () => string;

  private dictationId: string | null = null;
  private sendSeq = 0;
  private segments: string[] = [];
  private streamReady = false;

  private startGeneration = 0;
  private startPromise: Promise<void> | null = null;

  constructor(params: DictationStreamSenderParams) {
    this.client = params.client;
    this.format = params.format;
    this.createDictationId = params.createDictationId ?? defaultCreateId;
  }

  setClient(client: VoiceStreamClient | null): void {
    this.client = client;
  }

  getDictationId(): string | null {
    return this.dictationId;
  }

  getSegmentCount(): number {
    return this.segments.length;
  }

  getFinalSeq(): number {
    return this.segments.length - 1;
  }

  hasSegments(): boolean {
    return this.segments.length > 0;
  }

  clearAll(): void {
    this.dictationId = null;
    this.sendSeq = 0;
    this.segments = [];
    this.streamReady = false;
    this.startPromise = null;
    this.startGeneration += 1;
  }

  resetStreamForReplay(): void {
    this.dictationId = null;
    this.sendSeq = 0;
    this.streamReady = false;
    this.startPromise = null;
    this.startGeneration += 1;
  }

  enqueueSegment(base64Pcm: string): void {
    this.segments.push(base64Pcm);

    const client = this.client;
    if (!client?.isConnected) {
      return;
    }

    if (!this.dictationId) {
      if (!this.startPromise) {
        // biome-ignore lint/complexity/noVoid: fire-and-forget async call
        void this.restartStream("enqueue").catch(() => {
          /* intentional no-op */
        });
      }
      return;
    }

    this.flush();
  }

  flush(): number {
    const client = this.client;
    const dictationId = this.dictationId;
    if (!(client?.isConnected && dictationId && this.streamReady)) {
      return 0;
    }

    let sent = 0;
    while (this.sendSeq < this.segments.length) {
      const seq = this.sendSeq;
      // biome-ignore lint/style/noNonNullAssertion: ref guaranteed to be set
      const audio = this.segments[seq]!;
      client.sendDictationStreamChunk(dictationId, seq, audio, this.format);
      this.sendSeq = seq + 1;
      sent += 1;
    }
    return sent;
  }

  async restartStream(reason: string): Promise<void> {
    const client = this.client;
    if (!client?.isConnected) {
      return;
    }

    this.startGeneration += 1;
    const generation = this.startGeneration;

    const dictationId = this.createDictationId();
    this.dictationId = dictationId;
    this.sendSeq = 0;
    this.streamReady = false;

    const start = (async () => {
      await client.startDictationStream(dictationId, this.format);
      if (this.startGeneration !== generation) {
        return;
      }
      if (this.dictationId !== dictationId) {
        return;
      }
      this.streamReady = true;
      this.flush();
    })()
      .catch((error) => {
        if (
          this.startGeneration === generation &&
          this.dictationId === dictationId
        ) {
          this.dictationId = null;
          this.streamReady = false;
        }
        throw error;
      })
      .finally(() => {
        if (this.startPromise === start) {
          this.startPromise = null;
        }
      });

    this.startPromise = start;
    await start;
    // biome-ignore lint/complexity/noVoid: fire-and-forget async call
    void reason;
  }

  async finish(finalSeq: number): Promise<DictationFinishResult> {
    const client = this.client;
    if (!client) {
      throw new Error("Voice client unavailable");
    }
    if (!client.isConnected) {
      throw new Error("Voice client is disconnected");
    }

    if (!this.dictationId) {
      await this.restartStream("finalize");
    }
    if (this.startPromise) {
      await this.startPromise;
    }

    const dictationId = this.dictationId;
    if (!(dictationId && this.streamReady)) {
      throw new Error("Failed to start dictation stream");
    }

    this.flush();
    return client.finishDictationStream(dictationId, finalSeq);
  }

  cancel(): void {
    const client = this.client;
    const dictationId = this.dictationId;
    if (client?.isConnected && dictationId) {
      client.cancelDictationStream(dictationId);
    }
    this.resetStreamForReplay();
  }
}
