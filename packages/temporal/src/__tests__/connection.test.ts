import { afterEach, describe, expect, it, vi } from "vitest";
import { getNamespace } from "../connection";

describe("getNamespace", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns explicit namespace from TEMPORAL_NAMESPACE env var", () => {
    vi.stubEnv("TEMPORAL_NAMESPACE", "custom-namespace");
    expect(getNamespace()).toBe("custom-namespace");
  });

  it("returns production namespace for production environment", () => {
    vi.stubEnv("TEMPORAL_NAMESPACE", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(getNamespace()).toBe("openplane-prod");
  });

  it("returns staging namespace for staging environment", () => {
    vi.stubEnv("TEMPORAL_NAMESPACE", "");
    vi.stubEnv("NODE_ENV", "staging");
    expect(getNamespace()).toBe("openplane-staging");
  });

  it("returns test namespace for test environment", () => {
    vi.stubEnv("TEMPORAL_NAMESPACE", "");
    vi.stubEnv("NODE_ENV", "test");
    expect(getNamespace()).toBe("openplane-test");
  });

  it("returns development namespace by default", () => {
    vi.stubEnv("TEMPORAL_NAMESPACE", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(getNamespace()).toBe("openplane-dev");
  });

  it("returns development namespace for unknown NODE_ENV", () => {
    vi.stubEnv("TEMPORAL_NAMESPACE", "");
    vi.stubEnv("NODE_ENV", "unknown");
    expect(getNamespace()).toBe("openplane-dev");
  });

  it("prefers TEMPORAL_NAMESPACE over NODE_ENV-derived namespace", () => {
    vi.stubEnv("TEMPORAL_NAMESPACE", "explicit-override");
    vi.stubEnv("NODE_ENV", "production");
    expect(getNamespace()).toBe("explicit-override");
  });
});
