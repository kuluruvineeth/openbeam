import type { LongTermMemory } from "../../../memory";
import type { PersistentMemory } from "../../../memory/persistent";
import type { SessionMemoryStore } from "../../../memory/session";
import type { SessionState } from "../../../memory/session-state";
import type { SummarizerDeps } from "../../../memory/summarizer";

let persistentMemory: PersistentMemory | null = null;
let longTermMemory: LongTermMemory | null = null;
let sessionState: SessionState | null = null;
let sessionMemory: SessionMemoryStore | null = null;
let summarizer: SummarizerDeps | null = null;

export function getPersistentMemory(): PersistentMemory | null {
  return persistentMemory;
}

export function getLongTermMemory(): LongTermMemory | null {
  return longTermMemory;
}

export function getSessionState(): SessionState | null {
  return sessionState;
}

export function getSessionMemory(): SessionMemoryStore | null {
  return sessionMemory;
}

export function getSummarizerDeps(): SummarizerDeps | null {
  return summarizer;
}

export function setPersistentMemory(store: PersistentMemory): void {
  persistentMemory = store;
}

export function setLongTermMemory(store: LongTermMemory): void {
  longTermMemory = store;
}

export function setSessionStateDep(store: SessionState): void {
  sessionState = store;
}

export function setSessionMemoryDep(store: SessionMemoryStore): void {
  sessionMemory = store;
}

export function setSummarizerDepInternal(deps: SummarizerDeps): void {
  summarizer = deps;
}

export function clearMemoryToolDeps(): void {
  persistentMemory = null;
  longTermMemory = null;
  sessionState = null;
  sessionMemory = null;
  summarizer = null;
}
