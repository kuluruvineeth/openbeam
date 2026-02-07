import type {
  FindFormalizationCandidatesInput,
  FindFormalizationCandidatesOutput,
} from "./types";

export function findFormalizationCandidates(
  input: FindFormalizationCandidatesInput
): FindFormalizationCandidatesOutput {
  const { patterns, minFrequency, minSuccessRate } = input;

  const candidates = patterns.filter(
    (p) =>
      p.frequency >= minFrequency &&
      p.successRate >= minSuccessRate &&
      p.status === "observed"
  );

  for (const candidate of candidates) {
    candidate.status = "validated";
  }

  return { candidates };
}
