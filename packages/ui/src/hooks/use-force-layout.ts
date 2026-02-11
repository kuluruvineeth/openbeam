"use client";

import type { Edge, Node } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type Simulation,
  type SimulationNodeDatum,
} from "d3-force";
import { useCallback, useRef } from "react";

const DEFAULT_LINK_DISTANCE = 200;
const DEFAULT_CHARGE_STRENGTH = -300;
const DEFAULT_COLLISION_RADIUS = 100;
const MAX_ITERATIONS = 300;

interface ForceNode extends SimulationNodeDatum {
  id: string;
}

interface ForceLink {
  source: string;
  target: string;
}

export interface ForceLayoutOptions {
  distance?: number;
  strength?: number;
  collisionRadius?: number;
}

export interface UseForceLayoutReturn {
  startSimulation: () => void;
  stopSimulation: () => void;
  isRunning: () => boolean;
}

export function useForceLayout(
  options: ForceLayoutOptions = {}
): UseForceLayoutReturn {
  const { getNodes, getEdges, setNodes } = useReactFlow();
  const simulationRef = useRef<Simulation<ForceNode, ForceLink> | null>(null);
  const iterationRef = useRef(0);
  const nodeMapRef = useRef<Map<string, ForceNode>>(new Map());

  const stopSimulation = useCallback(() => {
    simulationRef.current?.stop();
    simulationRef.current = null;
    iterationRef.current = 0;
    nodeMapRef.current.clear();
  }, []);

  const startSimulation = useCallback(() => {
    const nodes = getNodes();
    const edges = getEdges();

    stopSimulation();

    const forceNodes: ForceNode[] = nodes.map((n) => ({
      id: n.id,
      x: n.position.x,
      y: n.position.y,
    }));

    const forceLinks: ForceLink[] = edges.map((e: Edge) => ({
      source: e.source,
      target: e.target,
    }));

    const nodeMap = new Map<string, ForceNode>(
      forceNodes.map((n) => [n.id, n])
    );
    nodeMapRef.current = nodeMap;

    const linkDistance = options.distance ?? DEFAULT_LINK_DISTANCE;
    const chargeStrength = options.strength ?? DEFAULT_CHARGE_STRENGTH;
    const collisionRadius = options.collisionRadius ?? DEFAULT_COLLISION_RADIUS;

    const simulation = forceSimulation<ForceNode>(forceNodes)
      .force(
        "link",
        forceLink<ForceNode, ForceLink>(forceLinks)
          .id((d) => d.id)
          .distance(linkDistance)
      )
      .force("charge", forceManyBody().strength(chargeStrength))
      .force("collision", forceCollide().radius(collisionRadius))
      .force("center", forceCenter(0, 0))
      .on("tick", () => {
        iterationRef.current += 1;

        if (iterationRef.current >= MAX_ITERATIONS) {
          simulation.stop();
          simulationRef.current = null;
          return;
        }

        setNodes((currentNodes: Node[]) =>
          currentNodes.map((n) => {
            const forceNode = nodeMap.get(n.id);
            if (!forceNode) {
              return n;
            }
            return {
              ...n,
              position: {
                x: forceNode.x ?? n.position.x,
                y: forceNode.y ?? n.position.y,
              },
            };
          })
        );
      });

    simulationRef.current = simulation;
  }, [getNodes, getEdges, setNodes, stopSimulation, options]);

  const isRunning = useCallback(() => simulationRef.current !== null, []);

  return { startSimulation, stopSimulation, isRunning };
}
