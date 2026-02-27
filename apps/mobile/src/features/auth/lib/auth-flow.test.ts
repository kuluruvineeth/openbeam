import { describe, expect, it } from "vitest";

type AuthState =
  | "loading"
  | "unauthenticated"
  | "needsUnlock"
  | "needsOnboarding"
  | "needsTeam"
  | "authenticated";

function resolveAuthScreen(state: {
  isLoading: boolean;
  isAuthenticated: boolean;
  needsUnlock: boolean;
  onboardingComplete: boolean;
  hasTeam: boolean;
}): AuthState {
  if (state.isLoading) {
    return "loading";
  }
  if (!state.isAuthenticated) {
    return "unauthenticated";
  }
  if (state.needsUnlock) {
    return "needsUnlock";
  }
  if (!state.onboardingComplete) {
    return "needsOnboarding";
  }
  if (!state.hasTeam) {
    return "needsTeam";
  }
  return "authenticated";
}

describe("auth flow state resolution", () => {
  it("shows loading when initializing", () => {
    expect(
      resolveAuthScreen({
        isLoading: true,
        isAuthenticated: false,
        needsUnlock: false,
        onboardingComplete: false,
        hasTeam: false,
      })
    ).toBe("loading");
  });

  it("shows sign-in when unauthenticated", () => {
    expect(
      resolveAuthScreen({
        isLoading: false,
        isAuthenticated: false,
        needsUnlock: false,
        onboardingComplete: false,
        hasTeam: false,
      })
    ).toBe("unauthenticated");
  });

  it("shows biometric lock when needs unlock", () => {
    expect(
      resolveAuthScreen({
        isLoading: false,
        isAuthenticated: true,
        needsUnlock: true,
        onboardingComplete: true,
        hasTeam: true,
      })
    ).toBe("needsUnlock");
  });

  it("shows onboarding when not completed", () => {
    expect(
      resolveAuthScreen({
        isLoading: false,
        isAuthenticated: true,
        needsUnlock: false,
        onboardingComplete: false,
        hasTeam: false,
      })
    ).toBe("needsOnboarding");
  });

  it("shows team select when no team selected", () => {
    expect(
      resolveAuthScreen({
        isLoading: false,
        isAuthenticated: true,
        needsUnlock: false,
        onboardingComplete: true,
        hasTeam: false,
      })
    ).toBe("needsTeam");
  });

  it("shows authenticated when all conditions met", () => {
    expect(
      resolveAuthScreen({
        isLoading: false,
        isAuthenticated: true,
        needsUnlock: false,
        onboardingComplete: true,
        hasTeam: true,
      })
    ).toBe("authenticated");
  });

  it("biometric lock takes priority over onboarding", () => {
    expect(
      resolveAuthScreen({
        isLoading: false,
        isAuthenticated: true,
        needsUnlock: true,
        onboardingComplete: false,
        hasTeam: false,
      })
    ).toBe("needsUnlock");
  });
});
