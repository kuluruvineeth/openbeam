export interface ConnectionCandidate {
  id: string;
  url: string;
  latencyMs: number | null;
}

export interface ConnectionProbeState {
  candidates: ConnectionCandidate[];
  probing: boolean;
}

interface SelectBestConnectionInput {
  candidates: ConnectionCandidate[];
  currentId: string | null;
}

export function selectBestConnection(
  input: SelectBestConnectionInput
): ConnectionCandidate | null {
  const { candidates, currentId } = input;
  if (candidates.length === 0) {
    return null;
  }

  const reachable = candidates.filter((c) => c.latencyMs !== null);
  if (reachable.length === 0) {
    return null;
  }

  const current = currentId ? reachable.find((c) => c.id === currentId) : null;

  const sorted = [...reachable].sort(
    (a, b) =>
      (a.latencyMs ?? Number.POSITIVE_INFINITY) -
      (b.latencyMs ?? Number.POSITIVE_INFINITY)
  );
  const best = sorted[0];
  if (!best) {
    return null;
  }

  if (current && current.latencyMs !== null && best.latencyMs !== null) {
    const HYSTERESIS_MS = 50;
    if (current.latencyMs - best.latencyMs < HYSTERESIS_MS) {
      return current;
    }
  }

  return best;
}
