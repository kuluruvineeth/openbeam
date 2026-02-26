import { resolve } from "node:path";

function isTruthyEnv(value: string | undefined): boolean {
  const normalized = (value ?? "").trim().toLowerCase();
  return (
    normalized === "1" ||
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "on"
  );
}

export function isOpenPlaneDictationDebugEnabled(): boolean {
  return isTruthyEnv(process.env.OPENPLANE_DICTATION_DEBUG);
}

export function resolveRecordingsDebugDir(
  explicitEnvVarName: string
): string | null {
  const explicit = process.env[explicitEnvVarName];
  if (explicit?.trim()) {
    return resolve(explicit.trim());
  }

  if (!isOpenPlaneDictationDebugEnabled()) {
    return null;
  }

  return resolve(process.cwd(), ".debug/recordings");
}
