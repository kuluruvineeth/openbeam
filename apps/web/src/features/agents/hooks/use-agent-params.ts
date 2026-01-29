"use client";

import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";

const VIEW_MODES = ["grid", "table"] as const;
type ViewMode = (typeof VIEW_MODES)[number];

const agentParamsParsers = {
  view: parseAsStringLiteral(VIEW_MODES).withDefault("grid"),
  selected: parseAsString.withDefault(""),
};

type AgentParams = {
  view: ViewMode;
  selected: string;
};

type AgentParamsActions = {
  setView: (view: ViewMode) => void;
  setSelected: (id: string | null) => void;
  toggleView: () => void;
};

export function useAgentParams(): {
  params: AgentParams;
} & AgentParamsActions {
  const [params, setParams] = useQueryStates(agentParamsParsers, {
    shallow: false,
    history: "push",
  });

  const setView = (view: ViewMode) => {
    setParams({ view });
  };

  const setSelected = (id: string | null) => {
    setParams({ selected: id ?? null });
  };

  const toggleView = () => {
    setParams({ view: params.view === "grid" ? "table" : "grid" });
  };

  return {
    params: {
      view: params.view,
      selected: params.selected,
    },
    setView,
    setSelected,
    toggleView,
  };
}

export type { ViewMode, AgentParams };
