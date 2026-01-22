import { describe, expect, it, mock } from "bun:test";
import {
  buildShortcutMap,
  isEditableElement,
  matchesModifiers,
  normalizeKey,
  processShortcut,
  type ShortcutConfig,
} from "../use-global-shortcuts";

function noop() {
  return;
}

describe("useGlobalShortcuts utilities", () => {
  describe("normalizeKey", () => {
    it("converts uppercase keys to lowercase", () => {
      expect(normalizeKey("K")).toBe("k");
    });

    it("keeps lowercase keys unchanged", () => {
      expect(normalizeKey("k")).toBe("k");
    });

    it("handles special keys", () => {
      expect(normalizeKey("Escape")).toBe("escape");
      expect(normalizeKey("Enter")).toBe("enter");
    });
  });

  describe("isEditableElement", () => {
    function createMockElement(tagName: string, contentEditable = false) {
      return {
        tagName,
        getAttribute: (attr: string) =>
          attr === "contenteditable" && contentEditable ? "true" : null,
      } as unknown as Element;
    }

    it("returns false for null element", () => {
      expect(isEditableElement(null)).toBe(false);
    });

    it("returns true for INPUT elements", () => {
      expect(isEditableElement(createMockElement("INPUT"))).toBe(true);
    });

    it("returns true for TEXTAREA elements", () => {
      expect(isEditableElement(createMockElement("TEXTAREA"))).toBe(true);
    });

    it("returns true for SELECT elements", () => {
      expect(isEditableElement(createMockElement("SELECT"))).toBe(true);
    });

    it("returns true for contenteditable elements", () => {
      expect(isEditableElement(createMockElement("DIV", true))).toBe(true);
    });

    it("returns false for regular elements", () => {
      expect(isEditableElement(createMockElement("DIV"))).toBe(false);
    });
  });

  describe("matchesModifiers", () => {
    it("matches when single required modifier is pressed", () => {
      const event = {
        metaKey: true,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
      } as KeyboardEvent;
      expect(matchesModifiers(event, ["meta"])).toBe(true);
    });

    it("fails when required modifier is not pressed", () => {
      const event = {
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
      } as KeyboardEvent;
      expect(matchesModifiers(event, ["meta"])).toBe(false);
    });

    it("fails when extra modifiers are pressed", () => {
      const event = {
        metaKey: true,
        ctrlKey: true,
        altKey: false,
        shiftKey: false,
      } as KeyboardEvent;
      expect(matchesModifiers(event, ["meta"])).toBe(false);
    });

    it("matches multiple modifiers", () => {
      const event = {
        metaKey: true,
        ctrlKey: false,
        altKey: false,
        shiftKey: true,
      } as KeyboardEvent;
      expect(matchesModifiers(event, ["meta", "shift"])).toBe(true);
    });

    it("matches empty modifier list when no keys pressed", () => {
      const event = {
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
      } as KeyboardEvent;
      expect(matchesModifiers(event, [])).toBe(true);
    });

    it("fails empty modifier list when keys are pressed", () => {
      const event = {
        metaKey: true,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
      } as KeyboardEvent;
      expect(matchesModifiers(event, [])).toBe(false);
    });
  });

  describe("buildShortcutMap", () => {
    it("groups shortcuts by normalized key", () => {
      const shortcuts: ShortcutConfig[] = [
        { key: "k", callback: noop },
        { key: "K", callback: noop },
      ];

      const map = buildShortcutMap(shortcuts);
      expect(map.get("k")?.length).toBe(2);
    });

    it("excludes disabled shortcuts", () => {
      const shortcuts: ShortcutConfig[] = [
        { key: "k", callback: noop, enabled: false },
        { key: "k", callback: noop, enabled: true },
        { key: "k", callback: noop },
      ];

      const map = buildShortcutMap(shortcuts);
      expect(map.get("k")?.length).toBe(2);
    });

    it("includes shortcuts with enabled undefined", () => {
      const shortcuts: ShortcutConfig[] = [{ key: "k", callback: noop }];

      const map = buildShortcutMap(shortcuts);
      expect(map.get("k")?.length).toBe(1);
    });

    it("handles empty array", () => {
      const map = buildShortcutMap([]);
      expect(map.size).toBe(0);
    });

    it("handles multiple different keys", () => {
      const shortcuts: ShortcutConfig[] = [
        { key: "k", callback: noop },
        { key: "j", callback: noop },
        { key: "l", callback: noop },
      ];

      const map = buildShortcutMap(shortcuts);
      expect(map.size).toBe(3);
    });
  });

  describe("processShortcut", () => {
    function createMockEvent(overrides: Partial<KeyboardEvent> = {}) {
      return {
        metaKey: false,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        preventDefault: mock(noop),
        ...overrides,
      } as unknown as KeyboardEvent;
    }

    const originalDocument = globalThis.document;

    function setupMockDocument(activeElement: Element | null = null) {
      globalThis.document = {
        activeElement,
      } as unknown as Document;
    }

    function restoreDocument() {
      if (originalDocument) {
        globalThis.document = originalDocument;
      }
    }

    it("returns true and calls callback when modifiers match", () => {
      setupMockDocument(null);
      try {
        const callback = mock(noop);
        const event = createMockEvent({ metaKey: true });
        const shortcut: ShortcutConfig = {
          key: "k",
          callback,
          modifiers: ["meta"],
        };

        const result = processShortcut(event, shortcut);

        expect(result).toBe(true);
        expect(callback).toHaveBeenCalled();
      } finally {
        restoreDocument();
      }
    });

    it("returns false when modifiers do not match", () => {
      setupMockDocument(null);
      try {
        const callback = mock(noop);
        const event = createMockEvent();
        const shortcut: ShortcutConfig = {
          key: "k",
          callback,
          modifiers: ["meta"],
        };

        const result = processShortcut(event, shortcut);

        expect(result).toBe(false);
        expect(callback).not.toHaveBeenCalled();
      } finally {
        restoreDocument();
      }
    });

    it("calls preventDefault by default", () => {
      setupMockDocument(null);
      try {
        const preventDefault = mock(noop);
        const event = createMockEvent({ preventDefault });
        const shortcut: ShortcutConfig = { key: "k", callback: noop };

        processShortcut(event, shortcut);

        expect(preventDefault).toHaveBeenCalled();
      } finally {
        restoreDocument();
      }
    });

    it("skips preventDefault when explicitly disabled", () => {
      setupMockDocument(null);
      try {
        const preventDefault = mock(noop);
        const event = createMockEvent({ preventDefault });
        const shortcut: ShortcutConfig = {
          key: "k",
          callback: noop,
          preventDefault: false,
        };

        processShortcut(event, shortcut);

        expect(preventDefault).not.toHaveBeenCalled();
      } finally {
        restoreDocument();
      }
    });

    it("handles shortcut without modifiers", () => {
      setupMockDocument(null);
      try {
        const callback = mock(noop);
        const event = createMockEvent();
        const shortcut: ShortcutConfig = { key: "k", callback };

        const result = processShortcut(event, shortcut);

        expect(result).toBe(true);
        expect(callback).toHaveBeenCalled();
      } finally {
        restoreDocument();
      }
    });

    it("skips callback when focus is in editable element", () => {
      const editableElement = {
        tagName: "INPUT",
        getAttribute: () => null,
      } as unknown as Element;
      setupMockDocument(editableElement);
      try {
        const callback = mock(noop);
        const event = createMockEvent();
        const shortcut: ShortcutConfig = { key: "k", callback };

        const result = processShortcut(event, shortcut);

        expect(result).toBe(false);
        expect(callback).not.toHaveBeenCalled();
      } finally {
        restoreDocument();
      }
    });

    it("executes callback in input when ignoreInputs is false", () => {
      const editableElement = {
        tagName: "INPUT",
        getAttribute: () => null,
      } as unknown as Element;
      setupMockDocument(editableElement);
      try {
        const callback = mock(noop);
        const event = createMockEvent();
        const shortcut: ShortcutConfig = {
          key: "k",
          callback,
          ignoreInputs: false,
        };

        const result = processShortcut(event, shortcut);

        expect(result).toBe(true);
        expect(callback).toHaveBeenCalled();
      } finally {
        restoreDocument();
      }
    });
  });
});
