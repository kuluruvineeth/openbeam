import type {
  AnyNode,
  CeilingNode,
  ItemNode,
  SlabNode,
  WallNode,
} from "../../schema";
import { getScaledDimensions } from "../../schema";
import { SpatialGrid } from "./spatial-grid";
import { WallSpatialGrid } from "./wall-spatial-grid";

export function pointInPolygon(
  px: number,
  pz: number,
  polygon: [number, number][]
): boolean {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i, i += 1) {
    const pi = polygon[i];
    const pj = polygon[j];
    if (!(pi && pj)) {
      continue;
    }
    const [xi, zi] = pi;
    const [xj, zj] = pj;

    if (zi > pz !== zj > pz && px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function getItemFootprint(
  position: [number, number, number],
  dimensions: [number, number, number],
  rotation: [number, number, number],
  inset = 0
): [number, number][] {
  const [x, , z] = position;
  const [w, , d] = dimensions;
  const yRot = rotation[1];
  const halfW = Math.max(0, w / 2 - inset);
  const halfD = Math.max(0, d / 2 - inset);
  const cos = Math.cos(yRot);
  const sin = Math.sin(yRot);

  return [
    [x + (-halfW * cos + halfD * sin), z + (-halfW * sin - halfD * cos)],
    [x + (halfW * cos + halfD * sin), z + (halfW * sin - halfD * cos)],
    [x + (halfW * cos - halfD * sin), z + (halfW * sin + halfD * cos)],
    [x + (-halfW * cos - halfD * sin), z + (-halfW * sin + halfD * cos)],
  ];
}

interface Segment {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
}

function segmentsIntersect(a: Segment, b: Segment): boolean {
  const cross = (
    o: { x: number; z: number },
    p: { x: number; z: number },
    q: { x: number; z: number }
  ) => (p.x - o.x) * (q.z - o.z) - (p.z - o.z) * (q.x - o.x);

  const bo = { x: b.x1, z: b.z1 };
  const be = { x: b.x2, z: b.z2 };
  const ao = { x: a.x1, z: a.z1 };
  const ae = { x: a.x2, z: a.z2 };

  const d1 = cross(bo, be, ao);
  const d2 = cross(bo, be, ae);
  const d3 = cross(ao, ae, bo);
  const d4 = cross(ao, ae, be);

  if (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  ) {
    return true;
  }

  const onSeg = (
    p: { x: number; z: number },
    q: { x: number; z: number },
    r: { x: number; z: number }
  ) =>
    Math.min(p.x, q.x) <= r.x &&
    r.x <= Math.max(p.x, q.x) &&
    Math.min(p.z, q.z) <= r.z &&
    r.z <= Math.max(p.z, q.z);

  if (d1 === 0 && onSeg(bo, be, ao)) {
    return true;
  }
  if (d2 === 0 && onSeg(bo, be, ae)) {
    return true;
  }
  if (d3 === 0 && onSeg(ao, ae, bo)) {
    return true;
  }
  if (d4 === 0 && onSeg(ao, ae, be)) {
    return true;
  }

  return false;
}

function segmentIntersectsPolygon(
  seg: Segment,
  polygon: [number, number][]
): boolean {
  const n = polygon.length;
  for (let i = 0; i < n; i += 1) {
    const j = (i + 1) % n;
    const pi = polygon[i];
    const pj = polygon[j];
    if (!(pi && pj)) {
      continue;
    }
    if (
      segmentsIntersect(seg, {
        x1: pi[0],
        z1: pi[1],
        x2: pj[0],
        z2: pj[1],
      })
    ) {
      return true;
    }
  }
  return false;
}

interface ItemOverlapOptions {
  position: [number, number, number];
  dimensions: [number, number, number];
  rotation: [number, number, number];
  polygon: [number, number][];
  inset?: number;
}

export function itemOverlapsPolygon(options: ItemOverlapOptions): boolean {
  const { position, dimensions, rotation, polygon, inset = 0 } = options;
  const corners = getItemFootprint(position, dimensions, rotation, inset);

  for (const [cx, cz] of corners) {
    if (pointInPolygon(cx, cz, polygon)) {
      return true;
    }
  }

  for (const [px, pz] of polygon) {
    if (pointInPolygon(px, pz, corners)) {
      return true;
    }
  }

  for (let i = 0; i < 4; i += 1) {
    const j = (i + 1) % 4;
    const ci = corners[i];
    const cj = corners[j];
    if (!(ci && cj)) {
      continue;
    }
    if (
      segmentIntersectsPolygon(
        {
          x1: ci[0],
          z1: ci[1],
          x2: cj[0],
          z2: cj[1],
        },
        polygon
      )
    ) {
      return true;
    }
  }

  return false;
}

function segmentsCollinearAndOverlap(a: Segment, b: Segment): boolean {
  const EPSILON = 1e-6;

  const cross1 = (a.x2 - a.x1) * (b.z1 - a.z1) - (a.z2 - a.z1) * (b.x1 - a.x1);
  const cross2 = (a.x2 - a.x1) * (b.z2 - a.z1) - (a.z2 - a.z1) * (b.x2 - a.x1);

  if (Math.abs(cross1) > EPSILON || Math.abs(cross2) > EPSILON) {
    return false;
  }

  const onSegment = (
    p: { x: number; z: number },
    q: { x: number; z: number },
    r: { x: number; z: number }
  ) =>
    Math.min(p.x, q.x) - EPSILON <= r.x &&
    r.x <= Math.max(p.x, q.x) + EPSILON &&
    Math.min(p.z, q.z) - EPSILON <= r.z &&
    r.z <= Math.max(p.z, q.z) + EPSILON;

  const bStart = { x: b.x1, z: b.z1 };
  const bEnd = { x: b.x2, z: b.z2 };
  const a1OnB = onSegment(bStart, bEnd, { x: a.x1, z: a.z1 });
  const a2OnB = onSegment(bStart, bEnd, { x: a.x2, z: a.z2 });

  return a1OnB && a2OnB;
}

export function wallOverlapsPolygon(
  start: [number, number],
  end: [number, number],
  polygon: [number, number][]
): boolean {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const len = Math.sqrt(dx * dx + dz * dz);

  if (len > 1e-10) {
    const step = Math.min(1e-6, len * 0.01);
    const nx = (dx / len) * step;
    const nz = (dz / len) * step;
    if (pointInPolygon(start[0] + nx, start[1] + nz, polygon)) {
      return true;
    }
    if (pointInPolygon(end[0] - nx, end[1] - nz, polygon)) {
      return true;
    }

    const PERP_STEP = 1e-4;
    const pnx = (-nz / step) * PERP_STEP;
    const pnz = (nx / step) * PERP_STEP;
    for (const t of [0.25, 0.5, 0.75]) {
      const bx = start[0] + dx * t;
      const bz = start[1] + dz * t;
      if (pointInPolygon(bx + pnx, bz + pnz, polygon)) {
        return true;
      }
      if (pointInPolygon(bx - pnx, bz - pnz, polygon)) {
        return true;
      }
    }
  }

  const midX = (start[0] + end[0]) / 2;
  const midZ = (start[1] + end[1]) / 2;
  if (pointInPolygon(midX, midZ, polygon)) {
    return true;
  }

  const n = polygon.length;
  for (let i = 0; i < n; i += 1) {
    const j = (i + 1) % n;
    const pi = polygon[i];
    const pj = polygon[j];
    if (!(pi && pj)) {
      continue;
    }

    if (
      segmentsCollinearAndOverlap(
        { x1: start[0], z1: start[1], x2: end[0], z2: end[1] },
        { x1: pi[0], z1: pi[1], x2: pj[0], z2: pj[1] }
      )
    ) {
      return true;
    }
  }

  return false;
}

export class SpatialGridManager {
  private readonly floorGrids = new Map<string, SpatialGrid>();
  private readonly wallGrids = new Map<string, WallSpatialGrid>();
  private readonly walls = new Map<string, WallNode>();
  private readonly slabsByLevel = new Map<string, Map<string, SlabNode>>();
  private readonly ceilingGrids = new Map<string, SpatialGrid>();
  private readonly ceilings = new Map<string, CeilingNode>();
  private readonly itemCeilingMap = new Map<string, string>();

  private readonly cellSize: number;

  constructor(cellSize = 0.5) {
    this.cellSize = cellSize;
  }

  private getFloorGrid(levelId: string): SpatialGrid {
    const existing = this.floorGrids.get(levelId);
    if (existing) {
      return existing;
    }
    const grid = new SpatialGrid({ cellSize: this.cellSize });
    this.floorGrids.set(levelId, grid);
    return grid;
  }

  private getWallGrid(levelId: string): WallSpatialGrid {
    const existing = this.wallGrids.get(levelId);
    if (existing) {
      return existing;
    }
    const grid = new WallSpatialGrid();
    this.wallGrids.set(levelId, grid);
    return grid;
  }

  private getWallLength(wallId: string): number {
    const wall = this.walls.get(wallId);
    if (!wall) {
      return 0;
    }
    const dx = wall.end[0] - wall.start[0];
    const dy = wall.end[1] - wall.start[1];
    return Math.sqrt(dx * dx + dy * dy);
  }

  private getWallHeight(wallId: string): number {
    const wall = this.walls.get(wallId);
    return wall?.height ?? 2.5;
  }

  private getCeilingGrid(ceilingId: string): SpatialGrid {
    const existing = this.ceilingGrids.get(ceilingId);
    if (existing) {
      return existing;
    }
    const grid = new SpatialGrid({ cellSize: this.cellSize });
    this.ceilingGrids.set(ceilingId, grid);
    return grid;
  }

  private getSlabMap(levelId: string): Map<string, SlabNode> {
    const existing = this.slabsByLevel.get(levelId);
    if (existing) {
      return existing;
    }
    const map = new Map<string, SlabNode>();
    this.slabsByLevel.set(levelId, map);
    return map;
  }

  handleNodeCreated(node: AnyNode, levelId: string) {
    if (node.type === "slab") {
      this.getSlabMap(levelId).set(node.id, node as SlabNode);
    } else if (node.type === "ceiling") {
      this.ceilings.set(node.id, node as CeilingNode);
    } else if (node.type === "wall") {
      const wall = node as WallNode;
      this.walls.set(wall.id, wall);
    } else if (node.type === "item") {
      const item = node as ItemNode;
      if (
        item.asset.attachTo === "wall" ||
        item.asset.attachTo === "wall-side"
      ) {
        const wallId = item.parentId;
        if (wallId && this.walls.has(wallId)) {
          const wallLength = this.getWallLength(wallId);
          if (wallLength > 0) {
            const [width, height] = getScaledDimensions(item);
            const halfW = width / wallLength / 2;
            const t = item.position[0] / wallLength;
            this.getWallGrid(levelId).insert({
              itemId: item.id,
              wallId,
              tStart: t - halfW,
              tEnd: t + halfW,
              yStart: item.position[1],
              yEnd: item.position[1] + height,
              attachType: item.asset.attachTo as "wall" | "wall-side",
              side: item.side,
            });
          }
        }
      } else if (item.asset.attachTo === "ceiling") {
        const ceilingId = item.parentId;
        if (ceilingId && this.ceilings.has(ceilingId)) {
          this.getCeilingGrid(ceilingId).insert(
            item.id,
            item.position,
            getScaledDimensions(item),
            item.rotation
          );
          this.itemCeilingMap.set(item.id, ceilingId);
        }
      } else if (!item.asset.attachTo) {
        this.getFloorGrid(levelId).insert(
          item.id,
          item.position,
          getScaledDimensions(item),
          item.rotation
        );
      }
    }
  }

  handleNodeUpdated(node: AnyNode, levelId: string) {
    if (node.type === "slab") {
      this.getSlabMap(levelId).set(node.id, node as SlabNode);
    } else if (node.type === "ceiling") {
      this.ceilings.set(node.id, node as CeilingNode);
    } else if (node.type === "wall") {
      const wall = node as WallNode;
      this.walls.set(wall.id, wall);
    } else if (node.type === "item") {
      const item = node as ItemNode;
      if (
        item.asset.attachTo === "wall" ||
        item.asset.attachTo === "wall-side"
      ) {
        this.getWallGrid(levelId).removeByItemId(item.id);
        const wallId = item.parentId;
        if (wallId && this.walls.has(wallId)) {
          const wallLength = this.getWallLength(wallId);
          if (wallLength > 0) {
            const [width, height] = getScaledDimensions(item);
            const halfW = width / wallLength / 2;
            const t = item.position[0] / wallLength;
            this.getWallGrid(levelId).insert({
              itemId: item.id,
              wallId,
              tStart: t - halfW,
              tEnd: t + halfW,
              yStart: item.position[1],
              yEnd: item.position[1] + height,
              attachType: item.asset.attachTo as "wall" | "wall-side",
              side: item.side,
            });
          }
        }
      } else if (item.asset.attachTo === "ceiling") {
        const oldCeilingId = this.itemCeilingMap.get(item.id);
        if (oldCeilingId) {
          this.getCeilingGrid(oldCeilingId).remove(item.id);
          this.itemCeilingMap.delete(item.id);
        }
        const ceilingId = item.parentId;
        if (ceilingId && this.ceilings.has(ceilingId)) {
          this.getCeilingGrid(ceilingId).insert(
            item.id,
            item.position,
            getScaledDimensions(item),
            item.rotation
          );
          this.itemCeilingMap.set(item.id, ceilingId);
        }
      } else if (!item.asset.attachTo) {
        this.getFloorGrid(levelId).update(
          item.id,
          item.position,
          getScaledDimensions(item),
          item.rotation
        );
      }
    }
  }

  handleNodeDeleted(nodeId: string, nodeType: string, levelId: string) {
    if (nodeType === "slab") {
      this.getSlabMap(levelId).delete(nodeId);
    } else if (nodeType === "ceiling") {
      this.ceilings.delete(nodeId);
      this.ceilingGrids.delete(nodeId);
    } else if (nodeType === "wall") {
      this.walls.delete(nodeId);
      const removedItemIds = this.getWallGrid(levelId).removeWall(nodeId);
      return removedItemIds;
    } else if (nodeType === "item") {
      this.getFloorGrid(levelId).remove(nodeId);
      this.getWallGrid(levelId).removeByItemId(nodeId);
      const oldCeilingId = this.itemCeilingMap.get(nodeId);
      if (oldCeilingId) {
        this.getCeilingGrid(oldCeilingId).remove(nodeId);
        this.itemCeilingMap.delete(nodeId);
      }
    }
    return [];
  }

  canPlaceOnFloor(options: {
    levelId: string;
    position: [number, number, number];
    dimensions: [number, number, number];
    rotation: [number, number, number];
    ignoreIds?: string[];
  }) {
    const grid = this.getFloorGrid(options.levelId);
    return grid.canPlace(
      options.position,
      options.dimensions,
      options.rotation,
      options.ignoreIds
    );
  }

  canPlaceOnWall(options: {
    levelId: string;
    wallId: string;
    localX: number;
    localY: number;
    dimensions: [number, number, number];
    attachType?: "wall" | "wall-side";
    side?: "front" | "back";
    ignoreIds?: string[];
  }) {
    const {
      levelId,
      wallId,
      localX,
      localY,
      dimensions,
      attachType = "wall",
      side,
      ignoreIds,
    } = options;
    const wallLength = this.getWallLength(wallId);
    if (wallLength === 0) {
      return { valid: false, conflictIds: [] };
    }
    const wallHeight = this.getWallHeight(wallId);
    const tCenter = localX / wallLength;
    const [itemWidth, itemHeight] = dimensions;
    return this.getWallGrid(levelId).canPlaceOnWall({
      wallId,
      wallLength,
      wallHeight,
      tCenter,
      itemWidth,
      yBottom: localY,
      itemHeight,
      attachType,
      side,
      ignoreIds,
    });
  }

  getWallForItem(levelId: string, itemId: string): string | undefined {
    return this.getWallGrid(levelId).getWallForItem(itemId);
  }

  getSlabElevationAt(levelId: string, x: number, z: number): number {
    const slabMap = this.slabsByLevel.get(levelId);
    if (!slabMap) {
      return 0;
    }

    let maxElevation = 0;
    for (const slab of slabMap.values()) {
      if (slab.polygon.length >= 3 && pointInPolygon(x, z, slab.polygon)) {
        let inHole = false;
        const holes = slab.holes || [];
        for (const hole of holes) {
          if (hole.length >= 3 && pointInPolygon(x, z, hole)) {
            inHole = true;
            break;
          }
        }

        if (!inHole) {
          const elevation = slab.elevation ?? 0.05;
          if (elevation > maxElevation) {
            maxElevation = elevation;
          }
        }
      }
    }
    return maxElevation;
  }

  getSlabElevationForItem(
    levelId: string,
    position: [number, number, number],
    dimensions: [number, number, number],
    rotation: [number, number, number]
  ): number {
    const slabMap = this.slabsByLevel.get(levelId);
    if (!slabMap) {
      return 0;
    }

    let maxElevation = Number.NEGATIVE_INFINITY;
    for (const slab of slabMap.values()) {
      if (
        slab.polygon.length >= 3 &&
        itemOverlapsPolygon({
          position,
          dimensions,
          rotation,
          polygon: slab.polygon,
          inset: 0.01,
        })
      ) {
        let inHole = false;
        const [cx, , cz] = position;
        const holes = slab.holes || [];
        for (const hole of holes) {
          if (hole.length >= 3 && pointInPolygon(cx, cz, hole)) {
            inHole = true;
            break;
          }
        }

        if (!inHole) {
          const elevation = slab.elevation ?? 0.05;
          if (elevation > maxElevation) {
            maxElevation = elevation;
          }
        }
      }
    }
    return maxElevation === Number.NEGATIVE_INFINITY ? 0 : maxElevation;
  }

  getSlabElevationForWall(
    levelId: string,
    start: [number, number],
    end: [number, number]
  ): number {
    const slabMap = this.slabsByLevel.get(levelId);
    if (!slabMap) {
      return 0;
    }

    let maxElevation = Number.NEGATIVE_INFINITY;
    for (const slab of slabMap.values()) {
      if (slab.polygon.length < 3) {
        continue;
      }
      if (!wallOverlapsPolygon(start, end, slab.polygon)) {
        continue;
      }

      const holes = slab.holes || [];
      if (holes.length === 0) {
        const elevation = slab.elevation ?? 0.05;
        if (elevation > maxElevation) {
          maxElevation = elevation;
        }
        continue;
      }

      const dx = end[0] - start[0];
      const dz = end[1] - start[1];
      let hasValidPoint = false;
      for (const t of [0, 0.25, 0.5, 0.75, 1]) {
        const px = start[0] + dx * t;
        const pz = start[1] + dz * t;
        let inHole = false;
        for (const hole of holes) {
          if (hole.length >= 3 && pointInPolygon(px, pz, hole)) {
            inHole = true;
            break;
          }
        }
        if (!inHole) {
          hasValidPoint = true;
          break;
        }
      }

      if (hasValidPoint) {
        const elevation = slab.elevation ?? 0.05;
        if (elevation > maxElevation) {
          maxElevation = elevation;
        }
      }
    }
    return maxElevation === Number.NEGATIVE_INFINITY ? 0 : maxElevation;
  }

  canPlaceOnCeiling(options: {
    ceilingId: string;
    position: [number, number, number];
    dimensions: [number, number, number];
    rotation: [number, number, number];
    ignoreIds?: string[];
  }): { valid: boolean; conflictIds: string[] } {
    const { ceilingId, position, dimensions, rotation, ignoreIds } = options;
    const ceiling = this.ceilings.get(ceilingId);
    if (!ceiling || ceiling.polygon.length < 3) {
      return { valid: false, conflictIds: [] };
    }

    const corners = getItemFootprint(position, dimensions, rotation);
    for (const [cx, cz] of corners) {
      if (!pointInPolygon(cx, cz, ceiling.polygon)) {
        return { valid: false, conflictIds: [] };
      }
    }

    const [centerX, , centerZ] = position;
    const holes = ceiling.holes || [];
    for (const hole of holes) {
      if (hole.length >= 3 && pointInPolygon(centerX, centerZ, hole)) {
        return { valid: false, conflictIds: [] };
      }
    }

    return this.getCeilingGrid(ceilingId).canPlace(
      position,
      dimensions,
      rotation,
      ignoreIds
    );
  }

  clearLevel(levelId: string) {
    this.floorGrids.delete(levelId);
    this.wallGrids.delete(levelId);
    this.slabsByLevel.delete(levelId);
  }

  clear() {
    this.floorGrids.clear();
    this.wallGrids.clear();
    this.walls.clear();
    this.slabsByLevel.clear();
    this.ceilingGrids.clear();
    this.ceilings.clear();
    this.itemCeilingMap.clear();
  }
}

export const spatialGridManager = new SpatialGridManager();
