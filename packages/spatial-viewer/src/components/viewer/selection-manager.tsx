"use client";

import {
  type AnyNode,
  type BuildingNode,
  emitter,
  type ItemNode,
  type LevelNode,
  type NodeEvent,
  pointInPolygon,
  sceneRegistry,
  useScene,
  type WallNode,
  type ZoneNode,
} from "@openbeam/spatial-core";
import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Vector3 } from "three";
import useViewer from "../../store/use-viewer";

const tempWorldPos = new Vector3();

const EDGE_TOLERANCE = 0.5;

type SelectableNodeType =
  | "building"
  | "level"
  | "zone"
  | "wall"
  | "window"
  | "door"
  | "item"
  | "slab"
  | "ceiling"
  | "roof";

const expandPolygon = (
  polygon: [number, number][],
  tolerance: number
): [number, number][] => {
  if (polygon.length < 3) {
    return polygon;
  }

  let cx = 0;
  let cz = 0;
  for (const [x, z] of polygon) {
    cx += x;
    cz += z;
  }
  cx /= polygon.length;
  cz /= polygon.length;

  return polygon.map(([x, z]) => {
    const dx = x - cx;
    const dz = z - cz;
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len === 0) {
      return [x, z] as [number, number];
    }
    const scale = (len + tolerance) / len;
    return [cx + dx * scale, cz + dz * scale] as [number, number];
  });
};

const pointInPolygonWithTolerance = (
  x: number,
  z: number,
  polygon: [number, number][]
): boolean => {
  if (pointInPolygon(x, z, polygon)) {
    return true;
  }
  const expanded = expandPolygon(polygon, EDGE_TOLERANCE);
  return pointInPolygon(x, z, expanded);
};

interface SelectionStrategy {
  types: SelectableNodeType[];
  handleClick: (node: AnyNode, nativeEvent?: MouseEvent) => void;
  handleDeselect: () => void;
  isValid: (node: AnyNode) => boolean;
}

const isNodeOnLevel = (node: AnyNode, levelId: string): boolean => {
  const nodes = useScene.getState().nodes;

  if (node.parentId === levelId) {
    return true;
  }

  if (
    (node.type === "item" || node.type === "window" || node.type === "door") &&
    node.parentId
  ) {
    const parentNode = nodes[node.parentId as keyof typeof nodes];
    if (parentNode?.type === "wall" && parentNode.parentId === levelId) {
      return true;
    }
    if (
      (parentNode?.type === "ceiling" ||
        parentNode?.type === "slab" ||
        parentNode?.type === "roof") &&
      parentNode.parentId === levelId
    ) {
      return true;
    }
  }

  return false;
};

const isNodeInZone = (
  node: AnyNode,
  levelId: string,
  zoneId: string
): boolean => {
  const nodes = useScene.getState().nodes;
  const zone = nodes[zoneId as keyof typeof nodes] as ZoneNode | undefined;
  if (!zone?.polygon?.length) {
    return false;
  }

  if (!isNodeOnLevel(node, levelId)) {
    return false;
  }

  const object3D = sceneRegistry.nodes.get(node.id);
  if (object3D) {
    object3D.getWorldPosition(tempWorldPos);
    return pointInPolygonWithTolerance(
      tempWorldPos.x,
      tempWorldPos.z,
      zone.polygon
    );
  }

  if (node.type === "item") {
    const item = node as ItemNode;
    return pointInPolygonWithTolerance(
      item.position[0],
      item.position[2],
      zone.polygon
    );
  }

  if (node.type === "wall") {
    const wall = node as WallNode;
    const startIn = pointInPolygonWithTolerance(
      wall.start[0],
      wall.start[1],
      zone.polygon
    );
    const endIn = pointInPolygonWithTolerance(
      wall.end[0],
      wall.end[1],
      zone.polygon
    );
    return startIn || endIn;
  }

  if (node.type === "slab" || node.type === "ceiling") {
    const poly = (node as { polygon: [number, number][] }).polygon;
    if (!poly?.length) {
      return false;
    }
    for (const [px, pz] of poly) {
      if (pointInPolygonWithTolerance(px, pz, zone.polygon)) {
        return true;
      }
    }
    for (const [zx, zz] of zone.polygon) {
      if (pointInPolygon(zx, zz, poly)) {
        return true;
      }
    }
    return false;
  }

  if (node.type === "roof") {
    return true;
  }

  return false;
};

const getStrategy = (): SelectionStrategy | null => {
  const { buildingId, levelId, zoneId } = useViewer.getState().selection;

  const computeNextIds = (
    node: AnyNode,
    selectedIds: string[],
    event?:
      | MouseEvent
      | {
          metaKey?: boolean;
          ctrlKey?: boolean;
          nativeEvent?: { metaKey?: boolean; ctrlKey?: boolean };
        }
  ): string[] => {
    const isMeta =
      event?.metaKey ||
      (event as { nativeEvent?: { metaKey?: boolean } })?.nativeEvent?.metaKey;
    const isCtrl =
      event?.ctrlKey ||
      (event as { nativeEvent?: { ctrlKey?: boolean } })?.nativeEvent?.ctrlKey;

    if (isMeta || isCtrl) {
      if (selectedIds.includes(node.id)) {
        return selectedIds.filter((id) => id !== node.id);
      }
      return [...selectedIds, node.id];
    }

    return [node.id];
  };

  if (!buildingId) {
    return {
      types: ["building"],
      handleClick: (node) => {
        useViewer
          .getState()
          .setSelection({ buildingId: (node as BuildingNode).id });
      },
      handleDeselect: Function.prototype as () => void,
      isValid: (node) => node.type === "building",
    };
  }

  if (!levelId) {
    return {
      types: ["level"],
      handleClick: (node) => {
        useViewer.getState().setSelection({ levelId: (node as LevelNode).id });
      },
      handleDeselect: () => {
        useViewer.getState().setSelection({ buildingId: null });
      },
      isValid: (node) => node.type === "level",
    };
  }

  if (!zoneId) {
    return {
      types: ["zone"],
      handleClick: (node) => {
        useViewer.getState().setSelection({ zoneId: (node as ZoneNode).id });
      },
      handleDeselect: () => {
        useViewer.getState().setSelection({ levelId: null });
      },
      isValid: (node) => node.type === "zone" && node.parentId === levelId,
    };
  }

  return {
    types: ["wall", "item", "slab", "ceiling", "roof", "window", "door"],
    handleClick: (node, nativeEvent) => {
      const { selectedIds } = useViewer.getState().selection;
      useViewer.getState().setSelection({
        selectedIds: computeNextIds(node, selectedIds, nativeEvent),
      });
    },
    handleDeselect: () => {
      const { selectedIds } = useViewer.getState().selection;
      if (selectedIds.length > 0) {
        useViewer.getState().setSelection({ selectedIds: [] });
      } else {
        useViewer.getState().setSelection({ zoneId: null });
      }
    },
    isValid: (node) => {
      const validTypes = [
        "wall",
        "item",
        "slab",
        "ceiling",
        "roof",
        "window",
        "door",
      ];
      if (!validTypes.includes(node.type)) {
        return false;
      }
      return isNodeInZone(node, levelId, zoneId);
    },
  };
};

export const SelectionManager = () => {
  useViewer((s) => s.selection);
  const clickHandledRef = useRef(false);

  useEffect(() => {
    const onEnter = (event: NodeEvent) => {
      const strategy = getStrategy();
      if (!strategy) {
        return;
      }
      if (strategy.isValid(event.node)) {
        event.stopPropagation();
        useViewer.setState({ hoveredId: event.node.id });
      }
    };

    const onLeave = (event: NodeEvent) => {
      const strategy = getStrategy();
      if (!strategy) {
        return;
      }
      if (strategy.isValid(event.node)) {
        event.stopPropagation();
        useViewer.setState({ hoveredId: null });
      }
    };

    const onClick = (event: NodeEvent) => {
      const strategy = getStrategy();
      if (!strategy) {
        return;
      }
      if (!strategy.isValid(event.node)) {
        return;
      }

      event.stopPropagation();
      clickHandledRef.current = true;
      strategy.handleClick(
        event.node,
        event.nativeEvent as unknown as MouseEvent
      );
      useViewer.setState({ hoveredId: null });
    };

    const allTypes: SelectableNodeType[] = [
      "building",
      "level",
      "zone",
      "wall",
      "item",
      "slab",
      "ceiling",
      "roof",
      "window",
      "door",
    ];
    for (const type of allTypes) {
      emitter.on(`${type}:enter`, onEnter);
      emitter.on(`${type}:leave`, onLeave);
      emitter.on(`${type}:click`, onClick);
    }

    return () => {
      for (const type of allTypes) {
        emitter.off(`${type}:enter`, onEnter);
        emitter.off(`${type}:leave`, onLeave);
        emitter.off(`${type}:click`, onClick);
      }
    };
  }, []);

  return (
    <>
      <PointerMissedHandler clickHandledRef={clickHandledRef} />
      <OutlinerSync />
    </>
  );
};

const PointerMissedHandler = ({
  clickHandledRef,
}: {
  clickHandledRef: React.MutableRefObject<boolean>;
}) => {
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (useViewer.getState().cameraDragging) {
        return;
      }
      if (event.button !== 0) {
        return;
      }

      requestAnimationFrame(() => {
        if (clickHandledRef.current) {
          clickHandledRef.current = false;
          return;
        }

        const strategy = getStrategy();
        if (strategy) {
          strategy.handleDeselect();
          useViewer.setState({ hoveredId: null });
        }
      });
    };

    const canvas = gl.domElement;
    canvas.addEventListener("click", handleClick);

    return () => {
      canvas.removeEventListener("click", handleClick);
    };
  }, [gl, clickHandledRef]);

  return null;
};

const OutlinerSync = () => {
  const selection = useViewer((s) => s.selection);
  const hoveredId = useViewer((s) => s.hoveredId);
  const outliner = useViewer((s) => s.outliner);

  useEffect(() => {
    outliner.selectedObjects.length = 0;
    for (const id of selection.selectedIds) {
      const obj = sceneRegistry.nodes.get(id);
      if (obj) {
        outliner.selectedObjects.push(obj);
      }
    }

    outliner.hoveredObjects.length = 0;
    if (hoveredId) {
      const obj = sceneRegistry.nodes.get(hoveredId);
      if (obj) {
        outliner.hoveredObjects.push(obj);
      }
    }
  }, [selection, hoveredId, outliner]);

  return null;
};
