type MessageHandler = (message: unknown) => void;

export class SQLitePubSub {
  private readonly listeners = new Map<string, Set<MessageHandler>>();

  publish(channel: string, message: unknown): number {
    const handlers = this.listeners.get(channel);
    if (!handlers) {
      return 0;
    }
    for (const handler of handlers) {
      handler(message);
    }
    return handlers.size;
  }

  subscribe(channel: string, handler: MessageHandler): void {
    let handlers = this.listeners.get(channel);
    if (!handlers) {
      handlers = new Set();
      this.listeners.set(channel, handlers);
    }
    handlers.add(handler);
  }

  unsubscribe(channel: string, handler?: MessageHandler): void {
    if (!handler) {
      this.listeners.delete(channel);
      return;
    }
    const handlers = this.listeners.get(channel);
    if (!handlers) {
      return;
    }
    handlers.delete(handler);
    if (handlers.size === 0) {
      this.listeners.delete(channel);
    }
  }

  channels(): string[] {
    return [...this.listeners.keys()];
  }
}
