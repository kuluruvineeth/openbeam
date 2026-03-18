import {
  type CeilingNode,
  type LevelNode,
  sceneRegistry,
  useScene,
  type WallNode,
} from "@openbeam/spatial-core";

export const DEFAULT_LEVEL_HEIGHT = 2.5;

const heightCache = new Map<string, number>();
let lastNodesRef: object | null = null;

export function getLevelHeight(
  levelId: string,
  nodes: ReturnType<typeof useScene.getState>["nodes"]
): number {
  if (nodes !== lastNodesRef) {
    heightCache.clear();
    lastNodesRef = nodes;
  }

  if (heightCache.has(levelId)) {
    return heightCache.get(levelId) ?? DEFAULT_LEVEL_HEIGHT;
  }

  const level = nodes[levelId as LevelNode["id"]] as LevelNode | undefined;
  if (!level) {
    return DEFAULT_LEVEL_HEIGHT;
  }

  let maxTop = 0;

  for (const childId of level.children) {
    const child = nodes[childId as keyof typeof nodes];
    if (!child) {
      continue;
    }
    if (child.type === "ceiling") {
      const ch = (child as CeilingNode).height ?? DEFAULT_LEVEL_HEIGHT;
      if (ch > maxTop) {
        maxTop = ch;
      }
    } else if (child.type === "wall") {
      let meshY = sceneRegistry.nodes.get(childId as string)?.position.y ?? 0;
      if (meshY < 0) {
        meshY = 0;
      }
      const top = meshY + ((child as WallNode).height ?? DEFAULT_LEVEL_HEIGHT);
      if (top > maxTop) {
        maxTop = top;
      }
    }
  }

  const height = maxTop > 0 ? maxTop : DEFAULT_LEVEL_HEIGHT;
  heightCache.set(levelId, height);
  return height;
}

export function snapLevelsToTruePositions(): () => void {
  const nodes = useScene.getState().nodes;

  type LevelEntry = {
    obj: NonNullable<ReturnType<typeof sceneRegistry.nodes.get>>;
    levelId: string;
    index: number;
  };

  const entries: LevelEntry[] = [];
  for (const levelId of sceneRegistry.byType.level) {
    const obj = sceneRegistry.nodes.get(levelId);
    const level = nodes[levelId as LevelNode["id"]];
    if (obj && level) {
      entries.push({
        levelId,
        index: (level as unknown as { level?: number }).level ?? 0,
        obj,
      });
    }
  }
  entries.sort((a, b) => a.index - b.index);

  const snapshot = new Map(
    entries.map(({ levelId, obj }) => [
      levelId,
      { y: obj.position.y, visible: obj.visible },
    ])
  );

  let cumulativeY = 0;
  for (const { levelId, obj } of entries) {
    obj.position.y = cumulativeY;
    obj.visible = true;
    cumulativeY += getLevelHeight(levelId, nodes);
  }

  return () => {
    for (const { levelId, obj } of entries) {
      const saved = snapshot.get(levelId);
      if (saved !== undefined) {
        obj.position.y = saved.y;
        obj.visible = saved.visible;
      }
    }
  };
}
