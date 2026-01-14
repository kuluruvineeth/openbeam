import type { SecretRef } from "./types";

export class SecretResolutionError extends Error {
  readonly secretName: string;

  constructor(secretName: string, message: string) {
    super(message);
    this.name = "SecretResolutionError";
    this.secretName = secretName;
  }
}

export function resolveSecret(ref: SecretRef): string {
  const envKey = ref.secretName.toUpperCase();
  const value = process.env[envKey];

  if (!value) {
    throw new SecretResolutionError(
      ref.secretName,
      `Environment variable ${envKey} not found`
    );
  }

  return value;
}

export function createSecretRef(secretName: string): SecretRef {
  return { secretName };
}

export function isSecretRef(value: unknown): value is SecretRef {
  return (
    typeof value === "object" &&
    value !== null &&
    "secretName" in value &&
    typeof (value as SecretRef).secretName === "string"
  );
}
