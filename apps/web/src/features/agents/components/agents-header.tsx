"use client";

import { AgentsActions } from "./agents-actions";
import { AgentsSearchFilter } from "./agents-search-filter";

export function AgentsHeader() {
  return (
    <div className="flex justify-between py-6">
      <AgentsSearchFilter />
      <AgentsActions />
    </div>
  );
}
