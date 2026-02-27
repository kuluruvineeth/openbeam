import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = new Map<string, string>();
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn((key: string) => Promise.resolve(storage.get(key) ?? null)),
    setItem: vi.fn((key: string, val: string) => {
      storage.set(key, val);
      return Promise.resolve();
    }),
    removeItem: vi.fn((key: string) => {
      storage.delete(key);
      return Promise.resolve();
    }),
  },
}));

import { useNotesStore } from "./notes-store";

function getState() {
  return useNotesStore.getState();
}

describe("notes-store", () => {
  beforeEach(() => {
    useNotesStore.setState({ notes: [], activeNoteId: null });
  });

  it("starts with empty notes", () => {
    expect(getState().notes).toHaveLength(0);
    expect(getState().activeNoteId).toBeNull();
  });

  it("creates a note with defaults", () => {
    const note = getState().createNote();
    expect(note.title).toBe("Untitled");
    expect(note.content).toBe("");
    expect(note.emoji).toBeNull();
    // biome-ignore lint/performance/useTopLevelRegex: scoped regex acceptable here
    expect(note.id).toMatch(/^note_/);
    expect(getState().notes).toHaveLength(1);
    expect(getState().activeNoteId).toBe(note.id);
  });

  it("creates a note with title and content", () => {
    const note = getState().createNote("Meeting Notes", "Agenda items...");
    expect(note.title).toBe("Meeting Notes");
    expect(note.content).toBe("Agenda items...");
  });

  it("prepends new notes", () => {
    const first = getState().createNote("First");
    const second = getState().createNote("Second");
    expect(getState().notes[0].id).toBe(second.id);
    expect(getState().notes[1].id).toBe(first.id);
  });

  it("sets activeNoteId to new note", () => {
    const note = getState().createNote("Test");
    expect(getState().activeNoteId).toBe(note.id);
  });

  it("updates a note title and bumps updatedAt", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    const note = getState().createNote("Original");

    vi.setSystemTime(new Date("2025-01-01T00:01:00Z"));
    getState().updateNote(note.id, { title: "Updated" });

    // biome-ignore lint/style/noNonNullAssertion: ref guaranteed to be set
    const updated = getState().notes.find((n) => n.id === note.id)!;
    expect(updated.title).toBe("Updated");
    expect(updated.updatedAt).toBe("2025-01-01T00:01:00.000Z");
    expect(updated.createdAt).toBe("2025-01-01T00:00:00.000Z");
    vi.useRealTimers();
  });

  it("ignores update for nonexistent note", () => {
    getState().createNote("Test");
    const before = getState().notes;
    getState().updateNote("nonexistent", { title: "Nope" });
    expect(getState().notes).toBe(before);
  });

  it("deletes a note", () => {
    const note = getState().createNote("Delete me");
    getState().deleteNote(note.id);
    expect(getState().notes).toHaveLength(0);
  });

  it("clears activeNoteId when deleting active note", () => {
    const note = getState().createNote("Active");
    expect(getState().activeNoteId).toBe(note.id);
    getState().deleteNote(note.id);
    expect(getState().activeNoteId).toBeNull();
  });

  it("preserves activeNoteId when deleting non-active note", () => {
    const first = getState().createNote("First");
    const second = getState().createNote("Second");
    expect(getState().activeNoteId).toBe(second.id);
    getState().deleteNote(first.id);
    expect(getState().activeNoteId).toBe(second.id);
  });

  it("sets active note", () => {
    const note = getState().createNote("Test");
    getState().setActiveNote(null);
    expect(getState().activeNoteId).toBeNull();
    getState().setActiveNote(note.id);
    expect(getState().activeNoteId).toBe(note.id);
  });

  it("setActiveNote identity guard skips same value", () => {
    const note = getState().createNote("Test");
    const stateRef = getState();
    getState().setActiveNote(note.id);
    expect(getState()).toBe(stateRef);
  });

  it("generates unique note ids", () => {
    const ids = Array.from({ length: 10 }, () => getState().createNote().id);
    expect(new Set(ids).size).toBe(10);
  });
});
