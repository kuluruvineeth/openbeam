import { randomBytes } from "node:crypto";
import argon2, { type Options as Argon2Options } from "argon2";
import prisma from "../index";

const BASE62_ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const API_KEY_PREFIX = process.env.API_KEY_PREFIX ?? "op_live_";
const IDENTIFIER_LENGTH = 8;
const SECRET_LENGTH = 48;
const ARGON2_OPTIONS: Argon2Options = {
  type: argon2.argon2id,
  memoryCost: 64 * 1024,
  timeCost: 3,
  parallelism: 1,
};

function randomBase62(length: number): string {
  let output = "";

  while (output.length < length) {
    const bytes = randomBytes(length);

    for (const byte of bytes) {
      if (output.length >= length) {
        break;
      }
      output += BASE62_ALPHABET[byte % BASE62_ALPHABET.length];
    }
  }

  return output;
}

export async function generateApiKey(): Promise<{
  key: string;
  hash: string;
  prefix: string;
}> {
  const identifier = randomBase62(IDENTIFIER_LENGTH);
  const secret = randomBase62(SECRET_LENGTH);

  const lookupPrefix = `${API_KEY_PREFIX}${identifier}`;
  const key = `${lookupPrefix}${secret}`;
  const hash = await argon2.hash(key, ARGON2_OPTIONS);

  return { key, hash, prefix: lookupPrefix };
}

export interface CreateApiKeyInput {
  teamId: string;
  name: string;
  scopes?: string[];
  expiresAt?: Date;
}

export async function createApiKey(input: CreateApiKeyInput): Promise<{
  id: string;
  key: string;
  prefix: string;
  createdAt: Date;
}> {
  const { key, hash, prefix } = await generateApiKey();

  const apiKey = await prisma.apiKey.create({
    data: {
      teamId: input.teamId,
      name: input.name,
      keyHash: hash,
      prefix,
      scopes:
        input.scopes && input.scopes.length > 0
          ? input.scopes
          : [
              "connectors:read",
              "connectors:write",
              "connectors:sync",
              "search:read",
            ],
      expiresAt: input.expiresAt,
    },
  });

  return {
    id: apiKey.id,
    key, // Return plaintext key (only time it's available)
    prefix: apiKey.prefix,
    createdAt: apiKey.createdAt,
  };
}

export interface ListApiKeysInput {
  teamId: string;
}

export function listApiKeys(input: ListApiKeysInput) {
  return prisma.apiKey.findMany({
    where: {
      teamId: input.teamId,
    },
    select: {
      id: true,
      name: true,
      prefix: true,
      scopes: true,
      lastUsedAt: true,
      expiresAt: true,
      revoked: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export interface RevokeApiKeyInput {
  id: string;
  teamId: string;
}

export function revokeApiKey(input: RevokeApiKeyInput) {
  return prisma.apiKey.update({
    where: {
      id: input.id,
      teamId: input.teamId,
    },
    data: {
      revoked: true,
    },
  });
}
