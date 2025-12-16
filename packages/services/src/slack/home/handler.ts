import type { SlackClient } from "../client";
import type { AppHomeOpenedEvent } from "../events/types";
import {
  buildHomeTabView,
  buildSettingsModal,
  prepareHomeTabContent,
} from "./builder";
import {
  type HomeTabState,
  HomeTabStateSchema,
  type RecentSearch,
  type SavedItem,
} from "./types";

interface ViewsPublishResponse {
  ok: boolean;
  view?: { id: string };
  error?: string;
}

interface ViewsOpenResponse {
  ok: boolean;
  view?: { id: string };
  error?: string;
}

interface StateStore {
  get(key: string): Promise<HomeTabState | null>;
  set(key: string, value: HomeTabState): Promise<void>;
}

export interface HomeTabHandlerDeps {
  stateStore: StateStore;
}

function getStateKey(userId: string, teamId: string): string {
  return `home_state:${teamId}:${userId}`;
}

async function getOrCreateState(
  deps: HomeTabHandlerDeps,
  userId: string,
  teamId: string,
  connectorId: string
): Promise<HomeTabState> {
  const key = getStateKey(userId, teamId);
  const existing = await deps.stateStore.get(key);

  if (existing) {
    return existing;
  }

  const newState: HomeTabState = HomeTabStateSchema.parse({
    userId,
    teamId,
    connectorId,
    recentSearches: [],
    savedItems: [],
    preferences: {
      showRecentSearches: true,
      showSavedItems: true,
      showQuickActions: true,
      defaultSearchScope: "all",
    },
  });

  await deps.stateStore.set(key, newState);
  return newState;
}

export async function handleAppHomeOpened(
  client: SlackClient,
  event: AppHomeOpenedEvent,
  connectorId: string,
  deps: HomeTabHandlerDeps
): Promise<boolean> {
  if (event.tab !== "home") {
    return true;
  }

  const teamId = client.teamId ?? "";
  const state = await getOrCreateState(deps, event.user, teamId, connectorId);

  const updatedState: HomeTabState = {
    ...state,
    lastVisited: Date.now(),
  };
  await deps.stateStore.set(getStateKey(event.user, teamId), updatedState);

  const content = prepareHomeTabContent(updatedState, event.user);
  const view = buildHomeTabView(updatedState, content);

  const result = await client.call<ViewsPublishResponse>("views.publish", {
    user_id: event.user,
    view,
  });

  return result.ok;
}

export interface HomeSearchParams {
  userId: string;
  teamId: string;
  query: string;
}

export async function handleHomeSearch(
  params: HomeSearchParams,
  deps: HomeTabHandlerDeps
): Promise<HomeTabState> {
  const { userId, teamId, query } = params;
  const key = getStateKey(userId, teamId);
  let state = await deps.stateStore.get(key);

  if (!state) {
    state = HomeTabStateSchema.parse({
      userId,
      teamId,
      connectorId: "",
      recentSearches: [],
      savedItems: [],
      preferences: {
        showRecentSearches: true,
        showSavedItems: true,
        showQuickActions: true,
        defaultSearchScope: "all",
      },
    });
  }

  const newSearch: RecentSearch = {
    query,
    timestamp: Date.now(),
  };

  const existingIndex = state.recentSearches.findIndex(
    (s) => s.query.toLowerCase() === query.toLowerCase()
  );

  let updatedSearches: RecentSearch[];
  if (existingIndex >= 0) {
    updatedSearches = [
      newSearch,
      ...state.recentSearches.slice(0, existingIndex),
      ...state.recentSearches.slice(existingIndex + 1),
    ];
  } else {
    updatedSearches = [newSearch, ...state.recentSearches];
  }

  const updatedState: HomeTabState = {
    ...state,
    recentSearches: updatedSearches.slice(0, 10),
  };

  await deps.stateStore.set(key, updatedState);
  return updatedState;
}

export async function handleClearRecentSearches(
  client: SlackClient,
  userId: string,
  teamId: string,
  deps: HomeTabHandlerDeps
): Promise<boolean> {
  const key = getStateKey(userId, teamId);
  const state = await deps.stateStore.get(key);

  if (!state) {
    return false;
  }

  const updatedState: HomeTabState = {
    ...state,
    recentSearches: [],
  };

  await deps.stateStore.set(key, updatedState);
  return refreshHomeTab(client, userId, updatedState);
}

export interface SaveItemParams {
  userId: string;
  teamId: string;
  item: SavedItem;
}

export async function handleSaveItem(
  params: SaveItemParams,
  deps: HomeTabHandlerDeps
): Promise<boolean> {
  const { userId, teamId, item } = params;
  const key = getStateKey(userId, teamId);
  let state = await deps.stateStore.get(key);

  if (!state) {
    state = HomeTabStateSchema.parse({
      userId,
      teamId,
      connectorId: "",
      recentSearches: [],
      savedItems: [],
      preferences: {
        showRecentSearches: true,
        showSavedItems: true,
        showQuickActions: true,
        defaultSearchScope: "all",
      },
    });
  }

  const existingIndex = state.savedItems.findIndex((s) => s.id === item.id);
  if (existingIndex >= 0) {
    return false;
  }

  const updatedState: HomeTabState = {
    ...state,
    savedItems: [item, ...state.savedItems].slice(0, 50),
  };

  await deps.stateStore.set(key, updatedState);
  return true;
}

export function savedItemExists(
  state: HomeTabState | null,
  itemId: string
): boolean {
  if (!state) {
    return false;
  }
  return state.savedItems.some((s) => s.id === itemId);
}

export interface RemoveSavedItemParams {
  client: SlackClient;
  userId: string;
  teamId: string;
  itemId: string;
}

export async function handleRemoveSavedItem(
  params: RemoveSavedItemParams,
  deps: HomeTabHandlerDeps
): Promise<boolean> {
  const { client, userId, teamId, itemId } = params;
  const key = getStateKey(userId, teamId);
  const state = await deps.stateStore.get(key);

  if (!state) {
    return false;
  }

  const updatedState: HomeTabState = {
    ...state,
    savedItems: state.savedItems.filter((item) => item.id !== itemId),
  };

  await deps.stateStore.set(key, updatedState);
  return refreshHomeTab(client, userId, updatedState);
}

export interface OpenSettingsParams {
  client: SlackClient;
  userId: string;
  teamId: string;
  triggerId: string;
}

export async function handleOpenSettings(
  params: OpenSettingsParams,
  deps: HomeTabHandlerDeps
): Promise<boolean> {
  const { client, userId, teamId, triggerId } = params;
  const key = getStateKey(userId, teamId);
  let state = await deps.stateStore.get(key);

  if (!state) {
    state = HomeTabStateSchema.parse({
      userId,
      teamId,
      connectorId: "",
      recentSearches: [],
      savedItems: [],
      preferences: {
        showRecentSearches: true,
        showSavedItems: true,
        showQuickActions: true,
        defaultSearchScope: "all",
      },
    });
    await deps.stateStore.set(key, state);
  }

  const modal = buildSettingsModal(state);

  const result = await client.call<ViewsOpenResponse>("views.open", {
    trigger_id: triggerId,
    view: modal,
  });

  return result.ok;
}

export interface SaveSettingsParams {
  client: SlackClient;
  userId: string;
  teamId: string;
  settings: Partial<HomeTabState["preferences"]>;
}

export async function handleSaveSettings(
  params: SaveSettingsParams,
  deps: HomeTabHandlerDeps
): Promise<boolean> {
  const { client, userId, teamId, settings } = params;
  const key = getStateKey(userId, teamId);
  const state = await deps.stateStore.get(key);

  if (!state) {
    return false;
  }

  const updatedState: HomeTabState = {
    ...state,
    preferences: {
      ...state.preferences,
      ...settings,
    },
  };

  await deps.stateStore.set(key, updatedState);
  return refreshHomeTab(client, userId, updatedState);
}

export async function refreshHomeTab(
  client: SlackClient,
  userId: string,
  state: HomeTabState
): Promise<boolean> {
  const content = prepareHomeTabContent(state, userId);
  const view = buildHomeTabView(state, content);

  const result = await client.call<ViewsPublishResponse>("views.publish", {
    user_id: userId,
    view,
  });

  return result.ok;
}

export function extractSettingsFromSubmission(
  values: Record<string, Record<string, unknown>>
): Partial<HomeTabState["preferences"]> {
  const showRecent = values.show_recent?.show_recent_checkbox as
    | { selected_options?: Array<{ value: string }> }
    | undefined;
  const showSaved = values.show_saved?.show_saved_checkbox as
    | { selected_options?: Array<{ value: string }> }
    | undefined;
  const defaultScope = values.default_scope?.default_scope_select as
    | { selected_option?: { value: string } }
    | undefined;

  return {
    showRecentSearches: (showRecent?.selected_options?.length ?? 0) > 0,
    showSavedItems: (showSaved?.selected_options?.length ?? 0) > 0,
    defaultSearchScope:
      (defaultScope?.selected_option?.value as "all" | "slack" | "files") ??
      "all",
  };
}
