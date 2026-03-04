import { afterEach, describe, expect, test, vi } from "vitest";

import {
  applyProviderEnv,
  buildChildProcessEnv,
  type ProviderRuntimeSettings,
  resolveProviderCommandPrefix,
} from "./provider-launch-config";

describe("resolveProviderCommandPrefix", () => {
  test("uses resolved default command in default mode", () => {
    const resolveDefault = vi.fn(() => "/usr/local/bin/claude");

    const resolved = resolveProviderCommandPrefix(undefined, resolveDefault);

    expect(resolveDefault).toHaveBeenCalledTimes(1);
    expect(resolved).toEqual({ command: "/usr/local/bin/claude", args: [] });
  });

  test("appends args in append mode", () => {
    const resolveDefault = vi.fn(() => "/usr/local/bin/claude");

    const resolved = resolveProviderCommandPrefix(
      {
        mode: "append",
        args: ["--chrome"],
      },
      resolveDefault
    );

    expect(resolveDefault).toHaveBeenCalledTimes(1);
    expect(resolved).toEqual({
      command: "/usr/local/bin/claude",
      args: ["--chrome"],
    });
  });

  test("replaces command in replace mode without resolving default", () => {
    const resolveDefault = vi.fn(() => "/usr/local/bin/claude");

    const resolved = resolveProviderCommandPrefix(
      {
        mode: "replace",
        argv: ["docker", "run", "--rm", "my-wrapper"],
      },
      resolveDefault
    );

    expect(resolveDefault).not.toHaveBeenCalled();
    expect(resolved).toEqual({
      command: "docker",
      args: ["run", "--rm", "my-wrapper"],
    });
  });
});

describe("applyProviderEnv", () => {
  test("merges provider env overrides", () => {
    const base = {
      PATH: "/usr/bin",
      HOME: "/tmp",
    };
    const runtime: ProviderRuntimeSettings = {
      env: {
        HOME: "/custom/home",
        FOO: "bar",
      },
    };

    const env = applyProviderEnv(base, runtime);

    expect(env).toEqual({
      PATH: "/usr/bin",
      HOME: "/custom/home",
      FOO: "bar",
    });
  });
});

describe("buildChildProcessEnv", () => {
  const savedEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  test("codex strips OPENAI and ANTHROPIC env vars", () => {
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.OPENAI_BASE_URL = "https://api.openai.com/v1";
    process.env.OPENAI_ORGANIZATION = "org-test";
    process.env.OPENAI_ORG_ID = "org-test";
    process.env.OPENAI_PROJECT = "proj-test";
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    process.env.ANTHROPIC_BASE_URL = "https://api.anthropic.com";
    process.env.PATH = "/usr/bin";

    const env = buildChildProcessEnv("codex");

    expect(env.OPENAI_API_KEY).toBeUndefined();
    expect(env.OPENAI_BASE_URL).toBeUndefined();
    expect(env.OPENAI_ORGANIZATION).toBeUndefined();
    expect(env.OPENAI_ORG_ID).toBeUndefined();
    expect(env.OPENAI_PROJECT).toBeUndefined();
    expect(env.ANTHROPIC_API_KEY).toBeUndefined();
    expect(env.ANTHROPIC_BASE_URL).toBeUndefined();
    expect(env.PATH).toBe("/usr/bin");
  });

  test("claude strips OPENAI env vars", () => {
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    process.env.PATH = "/usr/bin";

    const env = buildChildProcessEnv("claude");

    expect(env.OPENAI_API_KEY).toBeUndefined();
    expect(env.ANTHROPIC_API_KEY).toBe("sk-ant-test");
    expect(env.PATH).toBe("/usr/bin");
  });

  test("opencode passes all env vars through", () => {
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";

    const env = buildChildProcessEnv("opencode");

    expect(env.OPENAI_API_KEY).toBe("sk-test");
    expect(env.ANTHROPIC_API_KEY).toBe("sk-ant-test");
  });

  test("runtime settings override after blocklist", () => {
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.PATH = "/usr/bin";

    const env = buildChildProcessEnv("codex", {
      env: { CUSTOM_VAR: "custom-value" },
    });

    expect(env.OPENAI_API_KEY).toBeUndefined();
    expect(env.PATH).toBe("/usr/bin");
    expect(env.CUSTOM_VAR).toBe("custom-value");
  });
});
