import { describe, expect, it } from "bun:test";
import {
  getAllConnectorsWithEvents,
  getConnectorEventsUI,
  getConnectorEventUI,
  getConnectorIcon,
  getEventCategoryIcon,
  getEventsByConnectorGrouped,
} from "../../event-types";

describe("event-types utilities", () => {
  describe("getConnectorIcon", () => {
    it("returns icon for known connector types", () => {
      expect(getConnectorIcon("slack")).toBeDefined();
      expect(getConnectorIcon("linear")).toBeDefined();
      expect(getConnectorIcon("notion")).toBeDefined();
      expect(getConnectorIcon("gmail")).toBeDefined();
      expect(getConnectorIcon("google-drive")).toBeDefined();
    });

    it("returns fallback icon for unknown connector type", () => {
      const icon = getConnectorIcon("unknown-connector" as never);
      expect(icon).toBeDefined();
    });
  });

  describe("getEventCategoryIcon", () => {
    it("returns icon for known categories", () => {
      expect(getEventCategoryIcon("messages")).toBeDefined();
      expect(getEventCategoryIcon("channels")).toBeDefined();
      expect(getEventCategoryIcon("issues")).toBeDefined();
      expect(getEventCategoryIcon("pages")).toBeDefined();
      expect(getEventCategoryIcon("emails")).toBeDefined();
    });

    it("returns fallback icon for unknown category", () => {
      const icon = getEventCategoryIcon("unknown-category" as never);
      expect(icon).toBeDefined();
    });
  });

  describe("getConnectorEventsUI", () => {
    it("returns events with UI config for Slack", () => {
      const events = getConnectorEventsUI("slack");
      expect(events.length).toBeGreaterThan(0);
      expect(events[0]).toHaveProperty("connectorType", "slack");
      expect(events[0]).toHaveProperty("connectorIcon");
      expect(events[0]).toHaveProperty("categoryIcon");
      expect(events[0]).toHaveProperty("id");
      expect(events[0]).toHaveProperty("name");
    });

    it("returns events with UI config for Linear", () => {
      const events = getConnectorEventsUI("linear");
      expect(events.length).toBeGreaterThan(0);
      expect(events[0]).toHaveProperty("connectorType", "linear");
    });

    it("returns events with UI config for Notion", () => {
      const events = getConnectorEventsUI("notion");
      expect(events.length).toBeGreaterThan(0);
      expect(events[0]).toHaveProperty("connectorType", "notion");
    });

    it("returns events with UI config for Gmail", () => {
      const events = getConnectorEventsUI("gmail");
      expect(events.length).toBeGreaterThan(0);
      expect(events[0]).toHaveProperty("connectorType", "gmail");
    });

    it("returns events with UI config for Google Drive", () => {
      const events = getConnectorEventsUI("google-drive");
      expect(events.length).toBeGreaterThan(0);
      expect(events[0]).toHaveProperty("connectorType", "google-drive");
    });
  });

  describe("getConnectorEventUI", () => {
    it("returns event with UI config for valid event", () => {
      const event = getConnectorEventUI("slack", "message.created");
      expect(event).toBeDefined();
      expect(event?.id).toBe("message.created");
      expect(event?.connectorType).toBe("slack");
      expect(event?.connectorIcon).toBeDefined();
      expect(event?.categoryIcon).toBeDefined();
    });

    it("returns undefined for invalid event", () => {
      const event = getConnectorEventUI("slack", "invalid.event");
      expect(event).toBeUndefined();
    });

    it("returns Linear events correctly", () => {
      const event = getConnectorEventUI("linear", "issue.created");
      expect(event).toBeDefined();
      expect(event?.connectorType).toBe("linear");
    });

    it("returns Notion events correctly", () => {
      const event = getConnectorEventUI("notion", "page.created");
      expect(event).toBeDefined();
      expect(event?.connectorType).toBe("notion");
    });
  });

  describe("getEventsByConnectorGrouped", () => {
    it("groups Slack events by category", () => {
      const groups = getEventsByConnectorGrouped("slack");
      expect(groups.length).toBeGreaterThan(0);

      const firstGroup = groups[0];
      expect(firstGroup).toBeDefined();
      if (!firstGroup) {
        throw new Error("Expected firstGroup to be defined");
      }
      expect(firstGroup).toHaveProperty("category");
      expect(firstGroup).toHaveProperty("icon");
      expect(firstGroup).toHaveProperty("events");
      expect(Array.isArray(firstGroup.events)).toBe(true);
    });

    it("groups Linear events by category", () => {
      const groups = getEventsByConnectorGrouped("linear");
      expect(groups.length).toBeGreaterThan(0);

      const issueGroup = groups.find((g) => g.category === "issues");
      expect(issueGroup).toBeDefined();
      expect(issueGroup?.events.length).toBeGreaterThan(0);
    });

    it("groups Notion events by category", () => {
      const groups = getEventsByConnectorGrouped("notion");
      expect(groups.length).toBeGreaterThan(0);

      const pagesGroup = groups.find((g) => g.category === "pages");
      expect(pagesGroup).toBeDefined();
    });
  });

  describe("getAllConnectorsWithEvents", () => {
    it("returns all connectors with event info", () => {
      const connectors = getAllConnectorsWithEvents();
      expect(connectors.length).toBeGreaterThan(0);

      const slack = connectors.find((c) => c.type === "slack");
      expect(slack).toBeDefined();
      expect(slack?.eventCount).toBeGreaterThan(0);
      expect(slack?.icon).toBeDefined();
    });

    it("includes all known connector types", () => {
      const connectors = getAllConnectorsWithEvents();
      const types = connectors.map((c) => c.type);

      expect(types).toContain("slack");
      expect(types).toContain("linear");
      expect(types).toContain("notion");
      expect(types).toContain("gmail");
      expect(types).toContain("google-drive");
    });

    it("each connector has events array", () => {
      const connectors = getAllConnectorsWithEvents();

      for (const connector of connectors) {
        expect(Array.isArray(connector.events)).toBe(true);
        expect(connector.eventCount).toBe(connector.events.length);
      }
    });
  });
});

describe("EventBuilder flow validation", () => {
  describe("connector → event flow", () => {
    it("Slack connector has valid events", () => {
      const events = getConnectorEventsUI("slack");
      expect(events.length).toBeGreaterThan(0);

      for (const event of events) {
        expect(event.id).toBeTruthy();
        expect(event.name).toBeTruthy();
        expect(event.category).toBeTruthy();
        expect(event.connectorType).toBe("slack");
      }
    });

    it("Linear connector has valid events", () => {
      const events = getConnectorEventsUI("linear");
      expect(events.length).toBeGreaterThan(0);

      for (const event of events) {
        expect(event.id).toBeTruthy();
        expect(event.name).toBeTruthy();
        expect(event.category).toBeTruthy();
        expect(event.connectorType).toBe("linear");
      }
    });

    it("Notion connector has valid events", () => {
      const events = getConnectorEventsUI("notion");
      expect(events.length).toBeGreaterThan(0);

      for (const event of events) {
        expect(event.id).toBeTruthy();
        expect(event.name).toBeTruthy();
        expect(event.category).toBeTruthy();
        expect(event.connectorType).toBe("notion");
      }
    });

    it("Gmail connector has valid events", () => {
      const events = getConnectorEventsUI("gmail");
      expect(events.length).toBeGreaterThan(0);

      for (const event of events) {
        expect(event.id).toBeTruthy();
        expect(event.name).toBeTruthy();
        expect(event.connectorType).toBe("gmail");
      }
    });

    it("Google Drive connector has valid events", () => {
      const events = getConnectorEventsUI("google-drive");
      expect(events.length).toBeGreaterThan(0);

      for (const event of events) {
        expect(event.id).toBeTruthy();
        expect(event.name).toBeTruthy();
        expect(event.connectorType).toBe("google-drive");
      }
    });
  });

  describe("event categories are consistent", () => {
    it("all events have valid categories", () => {
      const allConnectors = getAllConnectorsWithEvents();

      for (const connector of allConnectors) {
        const events = getConnectorEventsUI(connector.type);

        for (const event of events) {
          expect(event.category).toBeTruthy();
          expect(typeof event.category).toBe("string");
        }
      }
    });

    it("grouped events match ungrouped events", () => {
      const connectorTypes = [
        "slack",
        "linear",
        "notion",
        "gmail",
        "google-drive",
      ] as const;

      for (const type of connectorTypes) {
        const ungrouped = getConnectorEventsUI(type);
        const grouped = getEventsByConnectorGrouped(type);

        const groupedCount = grouped.reduce(
          (sum, g) => sum + g.events.length,
          0
        );
        expect(groupedCount).toBe(ungrouped.length);
      }
    });
  });
});
