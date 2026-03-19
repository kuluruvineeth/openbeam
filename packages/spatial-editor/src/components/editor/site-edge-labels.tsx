"use client";

import type { SiteNode } from "@openbeam/spatial-core";
import { sceneRegistry, useScene } from "@openbeam/spatial-core";
import { Html } from "@react-three/drei";
import { createPortal, useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import type { Object3D } from "three";

export function SiteEdgeLabels() {
  const rootNodeIds = useScene((state) => state.rootNodeIds);
  const nodes = useScene((state) => state.nodes);

  const siteNode = rootNodeIds[0] ? (nodes[rootNodeIds[0]] as SiteNode) : null;
  const siteNodeId = siteNode?.id;

  const [siteObj, setSiteObj] = useState<Object3D | null>(null);
  const prevSiteNodeIdRef = useRef<string | undefined>(undefined);

  useFrame(() => {
    if (siteNodeId !== prevSiteNodeIdRef.current) {
      prevSiteNodeIdRef.current = siteNodeId;
      setSiteObj(null);
      return;
    }
    if (siteObj || !siteNodeId) {
      return;
    }
    const obj = sceneRegistry.nodes.get(siteNodeId);
    if (obj) {
      setSiteObj(obj);
    }
  });

  const edges = useMemo(() => {
    const polygon = siteNode?.polygon?.points ?? [];
    if (polygon.length < 2) {
      return [];
    }
    return polygon.map(([x1, z1], i) => {
      // biome-ignore lint/style/noNonNullAssertion: geometry access
      const [x2, z2] = polygon[(i + 1) % polygon.length]!;
      // biome-ignore lint/style/noNonNullAssertion: geometry access
      const midX = (x1! + x2) / 2;
      // biome-ignore lint/style/noNonNullAssertion: geometry access
      const midZ = (z1! + z2) / 2;
      // biome-ignore lint/style/noNonNullAssertion: geometry access
      const dist = Math.sqrt((x2 - x1!) ** 2 + (z2 - z1!) ** 2);
      return { midX, midZ, dist };
    });
  }, [siteNode?.polygon?.points]);

  if (!siteObj || edges.length === 0) {
    return null;
  }

  return createPortal(
    edges.map((edge, i) => (
      <Html
        center
        // biome-ignore lint/suspicious/noArrayIndexKey: static list
        key={`edge-${i}`}
        occlude
        position={[edge.midX, 0.5, edge.midZ]}
        style={{ pointerEvents: "none", userSelect: "none" }}
        zIndexRange={[10, 0]}
      >
        <div className="whitespace-nowrap rounded bg-black/75 px-1.5 py-0.5 font-mono text-white text-xs backdrop-blur-sm">
          {edge.dist.toFixed(2)}m
        </div>
      </Html>
    )),
    siteObj
  );
}
