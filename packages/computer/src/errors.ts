export class ProposalSubmittedError extends Error {
  readonly actionCount: number;

  constructor(actionCount: number) {
    super(`Agent submitted ${actionCount} proposed action(s) for approval`);
    this.name = "ProposalSubmittedError";
    this.actionCount = actionCount;
  }
}
