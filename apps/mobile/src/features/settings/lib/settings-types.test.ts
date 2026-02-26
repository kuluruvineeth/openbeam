import { describe, expect, it } from "vitest";
import type {
  NotificationPreference,
  SettingsSection,
  ThemeMode,
} from "./settings-types";

describe("settings types", () => {
  it("ThemeMode accepts valid values", () => {
    const modes: ThemeMode[] = ["light", "dark", "auto"];
    expect(modes).toHaveLength(3);
    expect(modes).toContain("light");
    expect(modes).toContain("dark");
    expect(modes).toContain("auto");
  });

  it("NotificationPreference has all categories", () => {
    const prefs: NotificationPreference = {
      syncCompleted: true,
      syncFailed: true,
      agentUpdates: false,
      mentions: true,
    };
    expect(prefs.syncCompleted).toBe(true);
    expect(prefs.agentUpdates).toBe(false);
  });

  it("SettingsSection enumerates all sections", () => {
    const sections: SettingsSection[] = [
      "profile",
      "team",
      "notifications",
      "appearance",
      "connectedAccounts",
      "security",
      "storage",
      "about",
      "dangerZone",
    ];
    expect(sections).toHaveLength(9);
  });
});
