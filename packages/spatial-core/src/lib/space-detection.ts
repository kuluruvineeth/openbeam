import type { WallNode } from "../schema";

export type Space = {
  id: string;
  levelId: string;
  polygon: [number, number][];
  wallIds: string[];
  isExterior: boolean;
};

interface SceneStoreState {
  nodes: Record<
    string,
    WallNode | { type: string; id: string; parentId?: string }
  >;
  updateNode: (id: string, data: Record<string, unknown>) => void;
}

interface EditorStoreState {
  setSpaces: (spaces: Record<string, Space>) => void;
}

interface StoreSubscribable<T> {
  subscribe: (callback: (state: T) => void) => () => void;
  getState: () => T;
}

export function initSpaceDetectionSync(
  sceneStore: StoreSubscribable<SceneStoreState>,
  editorStore: StoreSubscribable<EditorStoreState>
): () => void {
  const prevWallsByLevel = new Map<string, Set<string>>();
  let isProcessing = false;

  const unsubscribe = sceneStore.subscribe(
    (subscribedState: SceneStoreState) => {
      if (isProcessing) {
        return;
      }

      const nodes = subscribedState.nodes;
      const currentWallsByLevel = new Map<string, Set<string>>();

      for (const node of Object.values(nodes)) {
        if (node.type === "wall" && node.parentId) {
          const levelId = node.parentId;
          if (!currentWallsByLevel.has(levelId)) {
            currentWallsByLevel.set(levelId, new Set());
          }
          currentWallsByLevel.get(levelId)?.add(node.id);
        }
      }

      const levelsToUpdate = new Set<string>();

      for (const [levelId, wallIds] of currentWallsByLevel.entries()) {
        const prevWallIds = prevWallsByLevel.get(levelId);

        if (!prevWallIds) {
          if (wallIds.size > 1) {
            levelsToUpdate.add(levelId);
          }
          continue;
        }

        for (const wallId of wallIds) {
          if (!prevWallIds.has(wallId)) {
            const wall = nodes[wallId as keyof typeof nodes] as WallNode;
            const otherWalls = Array.from(wallIds)
              .filter((id) => id !== wallId)
              .map((id) => nodes[id as keyof typeof nodes] as WallNode)
              .filter(Boolean);

            if (wallTouchesOthers(wall, otherWalls)) {
              levelsToUpdate.add(levelId);
              break;
            }
          }
        }
      }

      for (const [levelId, prevWallIds] of prevWallsByLevel.entries()) {
        const currentWallIds = currentWallsByLevel.get(levelId);

        if (!currentWallIds) {
          if (prevWallIds.size > 0) {
            levelsToUpdate.add(levelId);
          }
          continue;
        }

        for (const wallId of prevWallIds) {
          if (!currentWallIds.has(wallId)) {
            levelsToUpdate.add(levelId);
            break;
          }
        }
      }

      if (levelsToUpdate.size > 0) {
        isProcessing = true;
        try {
          runSpaceDetection(
            Array.from(levelsToUpdate),
            sceneStore,
            editorStore,
            nodes
          );
        } finally {
          isProcessing = false;
        }
      }

      prevWallsByLevel.clear();
      for (const [levelId, wallIds] of currentWallsByLevel.entries()) {
        prevWallsByLevel.set(levelId, wallIds);
      }
    }
  );

  return unsubscribe;
}

function runSpaceDetection(
  levelIds: string[],
  sceneStore: StoreSubscribable<SceneStoreState>,
  editorStore: StoreSubscribable<EditorStoreState>,
  nodes: SceneStoreState["nodes"]
): void {
  const { updateNode } = sceneStore.getState();
  const { setSpaces } = editorStore.getState();

  const allSpaces: Record<string, Space> = {};

  for (const levelId of levelIds) {
    const walls = Object.values(nodes).filter(
      (node): node is WallNode =>
        node.type === "wall" && node.parentId === levelId
    );

    if (walls.length === 0) {
      continue;
    }

    const { wallUpdates, spaces } = detectSpacesForLevel(levelId, walls);

    for (const update of wallUpdates) {
      const wall = nodes[update.wallId as keyof typeof nodes] as WallNode;
      if (
        wall.frontSide !== update.frontSide ||
        wall.backSide !== update.backSide
      ) {
        updateNode(update.wallId, {
          frontSide: update.frontSide,
          backSide: update.backSide,
        });
      }
    }

    for (const space of spaces) {
      allSpaces[space.id] = space;
    }
  }

  setSpaces(allSpaces);
}

type Grid = {
  cells: Map<string, "empty" | "wall" | "exterior" | "interior">;
  resolution: number;
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
  width: number;
  height: number;
};

type WallSideUpdate = {
  wallId: string;
  frontSide: "interior" | "exterior" | "unknown";
  backSide: "interior" | "exterior" | "unknown";
};

export function detectSpacesForLevel(
  levelId: string,
  walls: WallNode[],
  gridResolution = 0.5
): {
  wallUpdates: WallSideUpdate[];
  spaces: Space[];
} {
  if (walls.length === 0) {
    return { wallUpdates: [], spaces: [] };
  }

  const grid = buildGrid(walls, gridResolution);

  floodFillFromEdges(grid);

  const interiorSpaces = findInteriorSpaces(grid, levelId);

  const wallUpdates = assignWallSides(walls, grid);

  return {
    wallUpdates,
    spaces: interiorSpaces,
  };
}

function buildGrid(walls: WallNode[], resolution: number): Grid {
  let minX = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (const wall of walls) {
    minX = Math.min(minX, wall.start[0], wall.end[0]);
    minZ = Math.min(minZ, wall.start[1], wall.end[1]);
    maxX = Math.max(maxX, wall.start[0], wall.end[0]);
    maxZ = Math.max(maxZ, wall.start[1], wall.end[1]);
  }

  const padding = 2;
  minX -= padding;
  minZ -= padding;
  maxX += padding;
  maxZ += padding;

  const width = Math.ceil((maxX - minX) / resolution);
  const height = Math.ceil((maxZ - minZ) / resolution);

  const grid: Grid = {
    cells: new Map(),
    resolution,
    minX,
    minZ,
    maxX,
    maxZ,
    width,
    height,
  };

  for (const wall of walls) {
    markWallCells(grid, wall);
  }

  return grid;
}

function markWallCells(grid: Grid, wall: WallNode): void {
  const thickness = wall.thickness ?? 0.2;
  const [x1, z1] = wall.start;
  const [x2, z2] = wall.end;

  const dx = x2 - x1;
  const dz = z2 - z1;
  const len = Math.sqrt(dx * dx + dz * dz);
  if (len < 0.001) {
    return;
  }

  const dirX = dx / len;
  const dirZ = dz / len;
  const perpX = -dirZ;
  const perpZ = dirX;

  const steps = Math.max(Math.ceil(len / (grid.resolution * 0.5)), 2);
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const x = x1 + dx * t;
    const z = z1 + dz * t;

    const thicknessSteps = Math.max(
      Math.ceil(thickness / (grid.resolution * 0.5)),
      2
    );
    for (let j = 0; j <= thicknessSteps; j += 1) {
      const offset = (j / thicknessSteps - 0.5) * thickness;
      const wx = x + perpX * offset;
      const wz = z + perpZ * offset;

      const key = getCellKey(grid, wx, wz);
      if (key) {
        grid.cells.set(key, "wall");
      }
    }
  }
}

function floodFillFromEdges(grid: Grid): void {
  const queue: string[] = [];

  for (let x = 0; x < grid.width; x += 1) {
    for (let z = 0; z < grid.height; z += 1) {
      if (x === 0 || x === grid.width - 1 || z === 0 || z === grid.height - 1) {
        const key = getCellKeyFromIndex(x, z, grid.width);
        const cell = grid.cells.get(key);
        if (cell !== "wall") {
          grid.cells.set(key, "exterior");
          queue.push(key);
        }
      }
    }
  }

  while (queue.length > 0) {
    const key = queue.shift();
    if (!key) {
      continue;
    }
    const [x, z] = parseCellKey(key);

    const neighbors: [number, number][] = [
      [x + 1, z],
      [x - 1, z],
      [x, z + 1],
      [x, z - 1],
    ];

    for (const [nx, nz] of neighbors) {
      if (nx < 0 || nx >= grid.width || nz < 0 || nz >= grid.height) {
        continue;
      }

      const nKey = getCellKeyFromIndex(nx, nz, grid.width);
      const cell = grid.cells.get(nKey);

      if (cell !== "wall" && cell !== "exterior") {
        grid.cells.set(nKey, "exterior");
        queue.push(nKey);
      }
    }
  }
}

function findInteriorSpaces(grid: Grid, levelId: string): Space[] {
  const spaces: Space[] = [];
  const visited = new Set<string>();

  for (let x = 0; x < grid.width; x += 1) {
    for (let z = 0; z < grid.height; z += 1) {
      const key = getCellKeyFromIndex(x, z, grid.width);
      if (visited.has(key)) {
        continue;
      }

      const cell = grid.cells.get(key);
      if (cell === "wall" || cell === "exterior") {
        visited.add(key);
        continue;
      }

      const spaceCells = new Set<string>();
      const queue = [key];
      visited.add(key);
      spaceCells.add(key);
      grid.cells.set(key, "interior");

      while (queue.length > 0) {
        const curKey = queue.shift();
        if (!curKey) {
          continue;
        }
        const [cx, cz] = parseCellKey(curKey);

        const neighbors: [number, number][] = [
          [cx + 1, cz],
          [cx - 1, cz],
          [cx, cz + 1],
          [cx, cz - 1],
        ];

        for (const [nx, nz] of neighbors) {
          if (nx < 0 || nx >= grid.width || nz < 0 || nz >= grid.height) {
            continue;
          }

          const nKey = getCellKeyFromIndex(nx, nz, grid.width);
          if (visited.has(nKey)) {
            continue;
          }

          const nCell = grid.cells.get(nKey);
          if (nCell === "wall" || nCell === "exterior") {
            visited.add(nKey);
            continue;
          }

          visited.add(nKey);
          spaceCells.add(nKey);
          grid.cells.set(nKey, "interior");
          queue.push(nKey);
        }
      }

      const polygon = extractPolygonFromCells(spaceCells, grid);
      spaces.push({
        id: `space-${spaces.length}`,
        levelId,
        polygon,
        wallIds: [],
        isExterior: false,
      });
    }
  }

  return spaces;
}

function extractPolygonFromCells(
  cells: Set<string>,
  grid: Grid
): [number, number][] {
  let minX = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (const key of cells) {
    const [x, z] = parseCellKey(key);
    const worldX = grid.minX + x * grid.resolution;
    const worldZ = grid.minZ + z * grid.resolution;

    minX = Math.min(minX, worldX);
    minZ = Math.min(minZ, worldZ);
    maxX = Math.max(maxX, worldX);
    maxZ = Math.max(maxZ, worldZ);
  }

  return [
    [minX, minZ],
    [maxX, minZ],
    [maxX, maxZ],
    [minX, maxZ],
  ];
}

function assignWallSides(walls: WallNode[], grid: Grid): WallSideUpdate[] {
  const updates: WallSideUpdate[] = [];

  for (const wall of walls) {
    const thickness = wall.thickness ?? 0.2;
    const [x1, z1] = wall.start;
    const [x2, z2] = wall.end;

    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len < 0.001) {
      continue;
    }

    const perpX = -dz / len;
    const perpZ = dx / len;

    const midX = (x1 + x2) / 2;
    const midZ = (z1 + z2) / 2;
    const offset = thickness / 2 + grid.resolution;

    const frontX = midX + perpX * offset;
    const frontZ = midZ + perpZ * offset;
    const backX = midX - perpX * offset;
    const backZ = midZ - perpZ * offset;

    const frontKey = getCellKey(grid, frontX, frontZ);
    const backKey = getCellKey(grid, backX, backZ);

    const frontCell = frontKey ? grid.cells.get(frontKey) : undefined;
    const backCell = backKey ? grid.cells.get(backKey) : undefined;

    const frontSide = classifySide(frontCell);
    const backSide = classifySide(backCell);

    updates.push({
      wallId: wall.id,
      frontSide,
      backSide,
    });
  }

  return updates;
}

function classifySide(
  cell: string | undefined
): "interior" | "exterior" | "unknown" {
  if (cell === "exterior") {
    return "exterior";
  }
  if (cell === "interior") {
    return "interior";
  }
  return "unknown";
}

function getCellKey(grid: Grid, x: number, z: number): string | null {
  const cellX = Math.floor((x - grid.minX) / grid.resolution);
  const cellZ = Math.floor((z - grid.minZ) / grid.resolution);

  if (cellX < 0 || cellX >= grid.width || cellZ < 0 || cellZ >= grid.height) {
    return null;
  }

  return `${cellX},${cellZ}`;
}

function getCellKeyFromIndex(x: number, z: number, _width: number): string {
  return `${x},${z}`;
}

function parseCellKey(key: string): [number, number] {
  const parts = key.split(",");
  return [
    Number.parseInt(parts[0] ?? "0", 10),
    Number.parseInt(parts[1] ?? "0", 10),
  ];
}

export function wallTouchesOthers(
  wall: WallNode,
  otherWalls: WallNode[]
): boolean {
  const threshold = 0.1;

  for (const other of otherWalls) {
    if (other.id === wall.id) {
      continue;
    }

    if (
      distanceToSegment(wall.start, other.start, other.end) < threshold ||
      distanceToSegment(wall.end, other.start, other.end) < threshold ||
      distanceToSegment(other.start, wall.start, wall.end) < threshold ||
      distanceToSegment(other.end, wall.start, wall.end) < threshold
    ) {
      return true;
    }
  }

  return false;
}

function distanceToSegment(
  point: [number, number],
  segStart: [number, number],
  segEnd: [number, number]
): number {
  const [px, pz] = point;
  const [x1, z1] = segStart;
  const [x2, z2] = segEnd;

  const dx = x2 - x1;
  const dz = z2 - z1;
  const lenSq = dx * dx + dz * dz;

  if (lenSq < 0.0001) {
    const dpx = px - x1;
    const dpz = pz - z1;
    return Math.sqrt(dpx * dpx + dpz * dpz);
  }

  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (pz - z1) * dz) / lenSq));
  const projX = x1 + t * dx;
  const projZ = z1 + t * dz;

  const distX = px - projX;
  const distZ = pz - projZ;

  return Math.sqrt(distX * distX + distZ * distZ);
}
