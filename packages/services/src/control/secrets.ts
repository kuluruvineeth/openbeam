import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import {
  createControlTeamSecret,
  createControlTeamSecretVersion,
  type Database,
  findControlTeamSecretByName,
  listControlTeamSecrets,
  revokeControlTeamSecretVersion,
} from "@openbeam/db";
import type { CreateControlSecretInput } from "@openbeam/types/control/validators/secrets";
import { ControlServiceError } from "./errors";

const AES_ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

function getEncryptionKey(): Buffer {
  const raw = process.env.CONTROL_SECRET_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("CONTROL_SECRET_ENCRYPTION_KEY is required");
  }
  return Buffer.from(raw, "hex");
}

function encrypt(plaintext: string): {
  encrypted: string;
  iv: string;
  tag: string;
} {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(AES_ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  return {
    encrypted: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
}

function decrypt(material: {
  encrypted: string;
  iv: string;
  tag: string;
}): string {
  const key = getEncryptionKey();
  const iv = Buffer.from(material.iv, "base64");
  const tag = Buffer.from(material.tag, "base64");
  const encrypted = Buffer.from(material.encrypted, "base64");

  const decipher = createDecipheriv(AES_ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8"
  );
}

function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function createControlSecretForTeam(
  db: Database,
  teamId: string,
  input: CreateControlSecretInput,
  actor?: { userId?: string; agentId?: string }
) {
  const existing = await findControlTeamSecretByName(db, teamId, input.name);
  if (existing) {
    throw ControlServiceError.conflict(
      `Secret with name "${input.name}" already exists`
    );
  }

  const valueSha256 = hashValue(input.value);
  const material = encrypt(input.value);

  const secret = await createControlTeamSecret(db, {
    teamId,
    name: input.name,
    provider: input.provider as never,
    description: input.description ?? undefined,
    externalRef: input.externalRef ?? undefined,
    createdByUserId: actor?.userId,
    createdByAgentId: actor?.agentId,
  });

  await createControlTeamSecretVersion(db, {
    secretId: secret.id,
    version: 1,
    material,
    valueSha256,
    createdByUserId: actor?.userId,
    createdByAgentId: actor?.agentId,
  });

  return secret;
}

export async function listControlSecretsForTeam(db: Database, teamId: string) {
  return await listControlTeamSecrets(db, teamId);
}

export async function rotateControlSecretForTeam(
  db: Database,
  params: {
    teamId: string;
    secretId: string;
    value: string;
    actor?: { userId?: string; agentId?: string };
  }
) {
  const secrets = await listControlTeamSecrets(db, params.teamId);
  const secret = secrets.find((s) => s.id === params.secretId);
  if (!secret) {
    throw ControlServiceError.notFound("Secret");
  }

  const newVersion = secret.latestVersion + 1;
  const valueSha256 = hashValue(params.value);
  const material = encrypt(params.value);

  await revokeControlTeamSecretVersion(
    db,
    params.secretId,
    secret.latestVersion
  );

  await createControlTeamSecretVersion(db, {
    secretId: params.secretId,
    version: newVersion,
    material,
    valueSha256,
    createdByUserId: params.actor?.userId,
    createdByAgentId: params.actor?.agentId,
  });
}

export async function resolveSecretValue(
  db: Database,
  teamId: string,
  secretId: string,
  _version?: number
): Promise<string> {
  const secrets = await listControlTeamSecrets(db, teamId);
  const target = secrets.find((s) => s.id === secretId);
  if (!target) {
    throw ControlServiceError.notFound("Secret");
  }

  const fullSecret = await findControlTeamSecretByName(db, teamId, target.name);
  if (!fullSecret?.versions?.[0]) {
    throw ControlServiceError.notFound("Secret version");
  }

  const material = fullSecret.versions[0].material as {
    encrypted: string;
    iv: string;
    tag: string;
  };
  return decrypt(material);
}

export async function resolveEnvBindings(
  db: Database,
  teamId: string,
  env: Record<string, unknown>
): Promise<Record<string, string>> {
  const resolved: Record<string, string> = {};

  for (const [key, binding] of Object.entries(env)) {
    if (typeof binding === "string") {
      resolved[key] = binding;
      continue;
    }

    if (binding && typeof binding === "object") {
      const obj = binding as Record<string, unknown>;
      if (obj.type === "plain" && typeof obj.value === "string") {
        resolved[key] = obj.value;
        continue;
      }
      if (obj.type === "secret_ref" && typeof obj.secretId === "string") {
        resolved[key] = await resolveSecretValue(
          db,
          teamId,
          obj.secretId,
          typeof obj.version === "number" ? obj.version : undefined
        );
        continue;
      }
    }

    resolved[key] = String(binding);
  }

  return resolved;
}
