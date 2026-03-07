"use client";

import type { ConnectorType } from "@openbeam/types/services/connectors/events";
import type { ComponentType, ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";
import type { ConnectorInfo, LogoProps, ResourceInfo } from "./event-builder";

interface CanvasContextValue {
  connectorLogos?: Partial<Record<ConnectorType, ComponentType<LogoProps>>>;
  connectors?: ConnectorInfo[];
  onFetchResources?: (
    connectorId: string,
    resourceType: string
  ) => Promise<ResourceInfo[]>;
}

const CanvasContext = createContext<CanvasContextValue>({});

export interface CanvasProviderProps extends CanvasContextValue {
  children: ReactNode;
}

export function CanvasProvider({
  children,
  connectorLogos,
  connectors,
  onFetchResources,
}: CanvasProviderProps) {
  const value = useMemo(
    () => ({ connectorLogos, connectors, onFetchResources }),
    [connectorLogos, connectors, onFetchResources]
  );

  return (
    <CanvasContext.Provider value={value}>{children}</CanvasContext.Provider>
  );
}

export function useCanvasContext() {
  return useContext(CanvasContext);
}
