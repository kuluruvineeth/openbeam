"use client";

import type { App as McpApp } from "@modelcontextprotocol/ext-apps";
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { ErrorBoundary } from "./error-boundary";
import { ErrorState } from "./error-state";

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

function reloadWindow() {
  window.location.reload();
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

  const handleRetry = useCallback(reloadWindow, []);

  if (error) {
    return <ErrorState message={error.message} onRetry={handleRetry} />;
  }

  if (!(isConnected && toolResult && app)) {
    return <>{skeleton}</>;
  }

  return (
    <ErrorBoundary
      fallback={
        <ErrorState
          message="An unexpected error occurred"
          onRetry={handleRetry}
        />
      }
      onRetry={handleRetry}
    >
      {children({ toolResult, app })}
    </ErrorBoundary>
  );
}
