"use client";

import { useQueryState } from "nuqs";
import { ConnectorsGrid } from "@/components/connectors/connectors-grid";
import { ConnectorsTable } from "@/components/connectors/connectors-table";

export function ConnectorsContent() {
  const [tab] = useQueryState("tab", {
    defaultValue: "connected",
  });

  if (tab === "available") {
    return <ConnectorsGrid />;
  }

  // Default to "connected"
  return <ConnectorsTable />;
}
