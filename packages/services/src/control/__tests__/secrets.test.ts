import { beforeEach, describe, expect, it, mock } from "bun:test";

const TEAM_ID = "team_01";
const SECRET_ID = "sec_01";

const TEST_ENCRYPTION_KEY = "a".repeat(64);

function makeSecret(overrides: Record<string, unknown> = {}) {
  return {
    id: SECRET_ID,
    teamId: TEAM_ID,
    name: "API_KEY",
    provider: "VAULT",
    latestVersion: 1,
    description: null,
    ...overrides,
  };
}

type AnyFn = (...args: any[]) => any;
const mockCreateSecret = mock((() => Promise.resolve(makeSecret())) as AnyFn);
const mockCreateVersion = mock((() =>
  Promise.resolve({ id: "ver_01" })) as AnyFn);
const mockFindByName = mock((() => Promise.resolve(null)) as AnyFn);
const mockListSecrets = mock((() => Promise.resolve([makeSecret()])) as AnyFn);
const mockRevokeVersion = mock((() => Promise.resolve(undefined)) as AnyFn);

mock.module("@openbeam/db", () => ({
  createControlTeamSecret: mockCreateSecret,
  createControlTeamSecretVersion: mockCreateVersion,
  findControlTeamSecretByName: mockFindByName,
  listControlTeamSecrets: mockListSecrets,
  revokeControlTeamSecretVersion: mockRevokeVersion,
}));

const {
  createControlSecretForTeam,
  listControlSecretsForTeam,
  rotateControlSecretForTeam,
  resolveEnvBindings,
} = await import("../secrets");

const db = {} as never;

beforeEach(() => {
  process.env.CONTROL_SECRET_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
  for (const fn of [
    mockCreateSecret,
    mockCreateVersion,
    mockFindByName,
    mockListSecrets,
    mockRevokeVersion,
  ]) {
    fn.mockReset();
  }
  mockCreateSecret.mockImplementation(() => Promise.resolve(makeSecret()));
  mockCreateVersion.mockImplementation(() => Promise.resolve({ id: "ver_01" }));
  mockFindByName.mockImplementation(() => Promise.resolve(null));
  mockListSecrets.mockImplementation(() => Promise.resolve([makeSecret()]));
});

describe("createControlSecretForTeam", () => {
  const input = {
    name: "API_KEY",
    value: "sk-secret-value",
    provider: "VAULT" as const,
  };

  it("creates secret and initial version", async () => {
    const result = await createControlSecretForTeam(db, TEAM_ID, input);
    expect(result.id).toBe(SECRET_ID);
    expect(mockCreateSecret).toHaveBeenCalledTimes(1);
    expect(mockCreateVersion).toHaveBeenCalledTimes(1);

    const versionArg = (
      mockCreateVersion.mock.calls[0] as unknown[]
    )[1] as Record<string, unknown>;
    expect(versionArg.version).toBe(1);
    expect(versionArg.valueSha256).toBeDefined();
    expect(
      (versionArg.material as Record<string, unknown>).encrypted
    ).toBeDefined();
  });

  it("throws CONFLICT when name already exists", async () => {
    mockFindByName.mockImplementation(() => Promise.resolve(makeSecret()));
    await expect(
      createControlSecretForTeam(db, TEAM_ID, input)
    ).rejects.toThrow('Secret with name "API_KEY" already exists');
  });
});

describe("listControlSecretsForTeam", () => {
  it("delegates to db", async () => {
    const result = await listControlSecretsForTeam(db, TEAM_ID);
    expect(result).toHaveLength(1);
    expect(mockListSecrets).toHaveBeenCalledWith(db, TEAM_ID);
  });
});

describe("rotateControlSecretForTeam", () => {
  it("revokes old version and creates new one", async () => {
    mockRevokeVersion.mockImplementation(() => Promise.resolve(undefined));
    await rotateControlSecretForTeam(db, {
      teamId: TEAM_ID,
      secretId: SECRET_ID,
      value: "new-secret-value",
    });

    expect(mockRevokeVersion).toHaveBeenCalledWith(db, SECRET_ID, 1);
    expect(mockCreateVersion).toHaveBeenCalledTimes(1);
    const versionArg = (
      mockCreateVersion.mock.calls[0] as unknown[]
    )[1] as Record<string, unknown>;
    expect(versionArg.version).toBe(2);
  });

  it("throws NOT_FOUND for unknown secret", async () => {
    mockListSecrets.mockImplementation(() => Promise.resolve([]));
    await expect(
      rotateControlSecretForTeam(db, {
        teamId: TEAM_ID,
        secretId: "nonexistent",
        value: "new-value",
      })
    ).rejects.toThrow("Secret not found");
  });
});

describe("resolveEnvBindings", () => {
  it("passes through plain string values", async () => {
    const result = await resolveEnvBindings(db, TEAM_ID, {
      NODE_ENV: "production",
    });
    expect(result.NODE_ENV).toBe("production");
  });

  it("resolves plain type bindings", async () => {
    const result = await resolveEnvBindings(db, TEAM_ID, {
      API_URL: { type: "plain", value: "https://api.example.com" },
    });
    expect(result.API_URL).toBe("https://api.example.com");
  });

  it("stringifies non-object, non-string bindings", async () => {
    const result = await resolveEnvBindings(db, TEAM_ID, {
      PORT: 3000,
      DEBUG: true,
    });
    expect(result.PORT).toBe("3000");
    expect(result.DEBUG).toBe("true");
  });
});
