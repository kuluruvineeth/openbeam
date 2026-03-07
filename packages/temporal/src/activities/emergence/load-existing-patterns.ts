import db, { getEmergingPatterns } from "@openbeam/db";
import type {
  EmergencePattern,
  LoadExistingPatternsInput,
  LoadExistingPatternsOutput,
} from "./types";

export async function loadExistingPatterns(
  input: LoadExistingPatternsInput
): Promise<LoadExistingPatternsOutput> {
  const { minFrequency = 1, minSuccessRate = 0, status = "observed" } = input;

  const dbPatterns = await getEmergingPatterns(db, {
    limit: 1000,
    minFrequency,
    minSuccessRate,
    status: status === "observed" ? "OBSERVED" : "VALIDATED",
  });

  const patterns: EmergencePattern[] = dbPatterns.map((p) => ({
    signature: p.signature,
    toolSequence: p.toolSequence,
    frequency: p.frequency,
    successRate: p.successRate,
    avgLatencyMs: p.avgLatencyMs,
    firstSeen: p.firstSeen.getTime(),
    lastSeen: p.lastSeen.getTime(),
    status: p.status.toLowerCase() as "observed" | "validated",
    examples: [],
  }));

  return { patterns };
}
