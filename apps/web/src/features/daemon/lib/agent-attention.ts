interface ShouldClearAttentionInput {
  agentId: string;
  focusedAgentId: string | null;
  isConnected: boolean;
  requiresAttention: boolean;
}

export function shouldClearAgentAttentionOnView(
  input: ShouldClearAttentionInput
): boolean {
  return (
    input.isConnected &&
    input.requiresAttention &&
    input.agentId === input.focusedAgentId
  );
}
