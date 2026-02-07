import db, { updateEmergencePatternStatus } from "@openplane/db";
import type { SavePatternsInput, SavePatternsOutput } from "./types";

export async function savePatterns(
  input: SavePatternsInput
): Promise<SavePatternsOutput> {
  const { patterns } = input;

  let savedCount = 0;
  let validatedCount = 0;

  for (const pattern of patterns) {
    if (pattern.status === "validated") {
      await updateEmergencePatternStatus(db, {
        signature: pattern.signature,
        status: "VALIDATED",
      });
      validatedCount += 1;
    }
    savedCount += 1;
  }

  return {
    savedCount,
    validatedCount,
  };
}
