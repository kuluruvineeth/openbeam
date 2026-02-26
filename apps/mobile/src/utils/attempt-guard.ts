export class AttemptCancelledError extends Error {
  constructor(message = "Attempt cancelled") {
    super(message);
    this.name = "AttemptCancelledError";
  }
}

/**
 * Tiny helper for async lifecycles:
 * - Call `next()` to start a new attempt and invalidate previous ones
 * - Call `cancel()` to invalidate any in-flight attempt
 * - Call `assertCurrent(id)` after awaits to enforce a single active attempt
 */
export class AttemptGuard {
  private attemptId = 0;

  // biome-ignore lint/style/useConsistentMemberAccessibility: class member accessibility
  public next(): number {
    this.attemptId += 1;
    return this.attemptId;
  }

  // biome-ignore lint/style/useConsistentMemberAccessibility: class member accessibility
  public cancel(): void {
    this.attemptId += 1;
  }

  // biome-ignore lint/style/useConsistentMemberAccessibility: class member accessibility
  public isCurrent(id: number): boolean {
    return id === this.attemptId;
  }

  // biome-ignore lint/style/useConsistentMemberAccessibility: class member accessibility
  public assertCurrent(id: number): void {
    if (!this.isCurrent(id)) {
      throw new AttemptCancelledError();
    }
  }
}
