import {
  type AnyNode,
  type AnyNodeId,
  getScaledDimensions,
  type ItemNode,
  type SlabNode,
  type WallNode,
} from "../../schema";
import useScene from "../../store/use-scene";
import {
  itemOverlapsPolygon,
  spatialGridManager,
  wallOverlapsPolygon,
} from "./spatial-grid-manager";

export function resolveLevelId(
  node: AnyNode,
  nodes: Record<string, AnyNode>
): string {
  if (node.type === "level") {
    return node.id;
  }

  let current: AnyNode | undefined = node;

  while (current) {
    if (current.type === "level") {
      return current.id;
    }
    if (current.parentId) {
      current = nodes[current.parentId];
    } else {
      current = undefined;
    }
  }

  return "default";
}

export function initSpatialGridSync() {
  const store = useScene;
  const state = store.getState();
  for (const node of Object.values(state.nodes)) {
    const levelId = resolveLevelId(node, state.nodes);
    spatialGridManager.handleNodeCreated(node, levelId);
  }

  const markDirty = (id: AnyNodeId) => store.getState().markDirty(id);

  store.subscribe((currentState, prevState) => {
    for (const [id, node] of Object.entries(currentState.nodes)) {
      if (!prevState.nodes[id as AnyNode["id"]]) {
        const levelId = resolveLevelId(node, currentState.nodes);
        spatialGridManager.handleNodeCreated(node, levelId);

        if (node.type === "slab") {
          markNodesOverlappingSlab(
            node as SlabNode,
            currentState.nodes,
            markDirty
          );
        }
      }
    }

    for (const [id, node] of Object.entries(prevState.nodes)) {
      if (!currentState.nodes[id as AnyNode["id"]]) {
        const levelId = resolveLevelId(node, prevState.nodes);
        spatialGridManager.handleNodeDeleted(id, node.type, levelId);

        if (node.type === "slab") {
          markNodesOverlappingSlab(
            node as SlabNode,
            currentState.nodes,
            markDirty
          );
        }
      }
    }

    for (const [id, node] of Object.entries(currentState.nodes)) {
      const prev = prevState.nodes[id as AnyNode["id"]];
      if (!prev) {
        continue;
      }

      if (node.type === "item" && prev.type === "item") {
        if (
          !(
            arraysEqual(node.position, prev.position) &&
            arraysEqual(node.rotation, prev.rotation) &&
            arraysEqual(node.scale, prev.scale)
          ) ||
          node.parentId !== prev.parentId ||
          node.side !== prev.side
        ) {
          const levelId = resolveLevelId(node, currentState.nodes);
          spatialGridManager.handleNodeUpdated(node, levelId);
          if (!arraysEqual(node.scale, prev.scale)) {
            markDirty(node.id);
          }
        }
      } else if (
        node.type === "slab" &&
        prev.type === "slab" &&
        (node.polygon !== prev.polygon ||
          node.elevation !== prev.elevation ||
          node.holes !== prev.holes)
      ) {
        const levelId = resolveLevelId(node, currentState.nodes);
        spatialGridManager.handleNodeUpdated(node, levelId);

        markNodesOverlappingSlab(
          prev as SlabNode,
          currentState.nodes,
          markDirty
        );
        markNodesOverlappingSlab(
          node as SlabNode,
          currentState.nodes,
          markDirty
        );
      }
    }
  });
}

function arraysEqual(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function markNodesOverlappingSlab(
  slab: SlabNode,
  nodes: Record<string, AnyNode>,
  markDirty: (id: AnyNodeId) => void
) {
  if (slab.polygon.length < 3) {
    return;
  }
  const slabLevelId = resolveLevelId(slab, nodes);

  for (const node of Object.values(nodes)) {
    if (node.type === "item") {
      const item = node as ItemNode;
      if (item.asset.attachTo) {
        continue;
      }
      if (resolveLevelId(node, nodes) !== slabLevelId) {
        continue;
      }
      if (
        itemOverlapsPolygon({
          position: item.position,
          dimensions: getScaledDimensions(item),
          rotation: item.rotation,
          polygon: slab.polygon,
          inset: 0.01,
        })
      ) {
        markDirty(node.id);
      }
    } else if (node.type === "wall") {
      const wall = node as WallNode;
      if (resolveLevelId(node, nodes) !== slabLevelId) {
        continue;
      }
      if (wallOverlapsPolygon(wall.start, wall.end, slab.polygon)) {
        markDirty(node.id);
      }
    }
  }
}
