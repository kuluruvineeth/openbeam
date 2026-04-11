import { describe, expect, test } from "bun:test";
import { buildNotificationBody, getNotificationContent } from "../content";

describe("getNotificationContent", () => {
  test("returns content for all event types", () => {
    const events = [
      "connector.auth.expired",
      "connector.sync.failed",
      "connector.sync.stalled",
      "connector.health.degraded",
      "connector.health.restored",
      "connector.sync.completed",
      "connector.new_available",
      "document.mention",
      "document.shared_with_you",
      "search.trending",
      "search.saved_alert",
      "team.new_connector",
      "team.member_joined",
      "agent.task_completed",
      "agent.approval_required",
      "digest.ready",
    ] as const;

    for (const event of events) {
      const content = getNotificationContent(event);
      expect(content.title).toBeTruthy();
      expect(content.icon).toBeTruthy();
      expect(["critical", "warning", "info", "success"]).toContain(
        content.severity
      );
    }
  });

  test("critical events have critical severity", () => {
    expect(getNotificationContent("connector.auth.expired").severity).toBe(
      "critical"
    );
  });

  test("success events have success severity", () => {
    expect(getNotificationContent("connector.health.restored").severity).toBe(
      "success"
    );
  });
});

describe("buildNotificationBody", () => {
  test("includes connector name when provided", () => {
    const body = buildNotificationBody("connector.sync.failed", {
      connectorName: "Slack",
      message: "Rate limited",
    });
    expect(body).toContain("Slack");
    expect(body).toContain("Rate limited");
  });

  test("handles missing payload fields", () => {
    const body = buildNotificationBody("connector.sync.failed", {});
    expect(body).toContain("Sync failed");
  });

  test("includes document title for mention events", () => {
    const body = buildNotificationBody("document.mention", {
      documentTitle: "Q4 Report",
    });
    expect(body).toContain("Q4 Report");
  });

  test("includes user name for team member joined", () => {
    const body = buildNotificationBody("team.member_joined", {
      userName: "Alice",
    });
    expect(body).toContain("Alice");
  });

  test("includes document count for sync completed", () => {
    const body = buildNotificationBody("connector.sync.completed", {
      connectorName: "Notion",
      documentCount: 42,
    });
    expect(body).toContain("Notion");
    expect(body).toContain("42");
  });
});
