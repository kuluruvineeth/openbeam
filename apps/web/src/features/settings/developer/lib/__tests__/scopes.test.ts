import { describe, expect, it } from "bun:test";
import {
  ADMIN_SCOPE,
  EXPIRATION_OPTIONS,
  SCOPE_RESOURCES,
  scopePresetToScopes,
  scopesToDisplayName,
  scopesToPreset,
} from "../scopes";

describe("scopePresetToScopes", () => {
  it("all_access includes every resource read, write, extras, and admin", () => {
    const scopes = scopePresetToScopes("all_access");

    expect(scopes).toContain(ADMIN_SCOPE);
    for (const resource of SCOPE_RESOURCES) {
      expect(scopes).toContain(resource.readScope);
      if (resource.writeScope) {
        expect(scopes).toContain(resource.writeScope);
      }
      if (resource.extraScopes) {
        for (const extra of resource.extraScopes) {
          expect(scopes).toContain(extra.scope);
        }
      }
    }
  });

  it("read_only includes every resource read scope and nothing else", () => {
    const scopes = scopePresetToScopes("read_only");

    expect(scopes.length).toBe(SCOPE_RESOURCES.length);
    for (const resource of SCOPE_RESOURCES) {
      expect(scopes).toContain(resource.readScope);
    }
    expect(scopes).not.toContain(ADMIN_SCOPE);
    for (const resource of SCOPE_RESOURCES) {
      if (resource.writeScope) {
        expect(scopes).not.toContain(resource.writeScope);
      }
    }
  });

  it("restricted returns an empty scope set", () => {
    expect(scopePresetToScopes("restricted")).toEqual([]);
  });
});

describe("scopesToPreset", () => {
  it("round-trips all_access", () => {
    const scopes = scopePresetToScopes("all_access");
    expect(scopesToPreset(scopes)).toBe("all_access");
  });

  it("round-trips read_only", () => {
    const scopes = scopePresetToScopes("read_only");
    expect(scopesToPreset(scopes)).toBe("read_only");
  });

  it("maps empty scope list to restricted", () => {
    expect(scopesToPreset([])).toBe("restricted");
  });

  it("maps a mixed custom scope list to restricted", () => {
    expect(scopesToPreset(["search:read", "teams:write"])).toBe("restricted");
  });
});

describe("scopesToDisplayName", () => {
  it("labels all_access", () => {
    expect(scopesToDisplayName(scopePresetToScopes("all_access"))).toBe(
      "All Access"
    );
  });

  it("labels read_only", () => {
    expect(scopesToDisplayName(scopePresetToScopes("read_only"))).toBe(
      "Read Only"
    );
  });

  it("labels a single custom scope with singular noun", () => {
    expect(scopesToDisplayName(["search:read"])).toBe("Custom (1 scope)");
  });

  it("labels multiple custom scopes with plural noun", () => {
    expect(scopesToDisplayName(["search:read", "teams:read"])).toBe(
      "Custom (2 scopes)"
    );
  });

  it("labels empty scope set as zero custom scopes", () => {
    expect(scopesToDisplayName([])).toBe("Custom (0 scopes)");
  });
});

describe("SCOPE_RESOURCES", () => {
  it("defines 12 resources with unique ids", () => {
    expect(SCOPE_RESOURCES.length).toBe(12);
    const ids = SCOPE_RESOURCES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every resource has a description", () => {
    for (const resource of SCOPE_RESOURCES) {
      expect(resource.description.length).toBeGreaterThan(0);
    }
  });

  it("every resource readScope matches <id>:read", () => {
    for (const resource of SCOPE_RESOURCES) {
      expect(resource.readScope).toBe(`${resource.id}:read`);
    }
  });
});

describe("EXPIRATION_OPTIONS", () => {
  it("includes a no-expiration option", () => {
    const noExpiration = EXPIRATION_OPTIONS.find((opt) => opt.days === null);
    expect(noExpiration).toBeDefined();
  });

  it("durations are strictly increasing", () => {
    const timed = EXPIRATION_OPTIONS.filter(
      (opt): opt is { label: string; days: number } => opt.days !== null
    );
    for (let i = 1; i < timed.length; i += 1) {
      const previous = timed[i - 1];
      const current = timed[i];
      if (previous && current) {
        expect(current.days).toBeGreaterThan(previous.days);
      }
    }
  });
});
