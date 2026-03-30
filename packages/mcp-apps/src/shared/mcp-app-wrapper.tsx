"use client";

import type { App as McpApp } from "@modelcontextprotocol/ext-apps";
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { type ReactNode, useEffect, useState } from "react";

type Props = {
  name: string;
  children: (data: { toolResult: CallToolResult; app: McpApp }) => ReactNode;
  skeleton: ReactNode;
};

function applyTheme(theme: "light" | "dark" | undefined) {
  if (!theme) {
    return;
  }
  document.documentElement.setAttribute("data-theme", theme);
}

export function McpAppWrapper({ name, children, skeleton }: Props) {
  const [toolResult, setToolResult] = useState<CallToolResult | null>(null);

  const { app, isConnected, error } = useApp({
    appInfo: { name, version: "1.0.0" },
    capabilities: {},
    onAppCreated: (createdApp) => {
      createdApp.ontoolresult = (result) => {
        setToolResult(result);
      };

      createdApp.onhostcontextchanged = (ctx) => {
        applyTheme(ctx.theme);
      };

      createdApp.onteardown = async () => ({});
    },
  });

  useEffect(() => {
    if (!app) {
      return;
    }
    const hostCtx = app.getHostContext();
    applyTheme(hostCtx?.theme);
  }, [app]);

  if (error) {
    return <p className="p-4 text-red-500 text-sm">{error.message}</p>;
  }

  if (!(isConnected && toolResult && app)) {
    return <>{skeleton}</>;
  }

  return <>{children({ toolResult, app })}</>;
}
