import type { WallNode } from "../../schema";

export interface Point2D {
  x: number;
  y: number;
}

interface LineEquation {
  a: number;
  b: number;
  c: number;
}

type WallIntersections = Map<string, { left?: Point2D; right?: Point2D }>;

type JunctionData = Map<string, WallIntersections>;

const TOLERANCE = 0.001;

function pointToKey(p: Point2D, tolerance = TOLERANCE): string {
  const snap = 1 / tolerance;
  return `${Math.round(p.x * snap)},${Math.round(p.y * snap)}`;
}

function createLineFromPointAndVector(p: Point2D, v: Point2D): LineEquation {
  const a = -v.y;
  const b = v.x;
  const c = -(a * p.x + b * p.y);
  return { a, b, c };
}

function pointOnWallSegment(
  point: Point2D,
  wall: WallNode,
  tolerance = TOLERANCE
): boolean {
  const start: Point2D = { x: wall.start[0], y: wall.start[1] };
  const end: Point2D = { x: wall.end[0], y: wall.end[1] };

  if (pointToKey(point, tolerance) === pointToKey(start, tolerance)) {
    return false;
  }
  if (pointToKey(point, tolerance) === pointToKey(end, tolerance)) {
    return false;
  }

  const v = { x: end.x - start.x, y: end.y - start.y };
  const L = Math.sqrt(v.x * v.x + v.y * v.y);
  if (L < 1e-9) {
    return false;
  }

  const w = { x: point.x - start.x, y: point.y - start.y };

  const t = (v.x * w.x + v.y * w.y) / (L * L);

  if (t < tolerance || t > 1 - tolerance) {
    return false;
  }

  const projX = start.x + t * v.x;
  const projY = start.y + t * v.y;
  const dist = Math.sqrt((point.x - projX) ** 2 + (point.y - projY) ** 2);

  return dist < tolerance;
}

interface Junction {
  meetingPoint: Point2D;
  connectedWalls: Array<{
    wall: WallNode;
    endType: "start" | "end" | "passthrough";
  }>;
}

function findJunctions(walls: WallNode[]): Map<string, Junction> {
  const junctions = new Map<string, Junction>();

  for (const wall of walls) {
    const startPt: Point2D = { x: wall.start[0], y: wall.start[1] };
    const endPt: Point2D = { x: wall.end[0], y: wall.end[1] };

    const keyStart = pointToKey(startPt);
    const keyEnd = pointToKey(endPt);

    if (!junctions.has(keyStart)) {
      junctions.set(keyStart, { meetingPoint: startPt, connectedWalls: [] });
    }
    junctions.get(keyStart)?.connectedWalls.push({ wall, endType: "start" });

    if (!junctions.has(keyEnd)) {
      junctions.set(keyEnd, { meetingPoint: endPt, connectedWalls: [] });
    }
    junctions.get(keyEnd)?.connectedWalls.push({ wall, endType: "end" });
  }

  for (const [_key, junction] of junctions.entries()) {
    for (const wall of walls) {
      if (junction.connectedWalls.some((cw) => cw.wall.id === wall.id)) {
        continue;
      }

      if (pointOnWallSegment(junction.meetingPoint, wall)) {
        junction.connectedWalls.push({ wall, endType: "passthrough" });
      }
    }
  }

  const actualJunctions = new Map<string, Junction>();
  for (const [key, junction] of junctions.entries()) {
    if (junction.connectedWalls.length >= 2) {
      actualJunctions.set(key, junction);
    }
  }

  return actualJunctions;
}

interface ProcessedWall {
  wallId: string;
  angle: number;
  edgeA: LineEquation;
  edgeB: LineEquation;
  isPassthrough: boolean;
}

function calculateJunctionIntersections(
  junction: Junction,
  getThickness: (wall: WallNode) => number
): WallIntersections {
  const { meetingPoint, connectedWalls } = junction;
  const processedWalls: ProcessedWall[] = [];

  for (const { wall, endType } of connectedWalls) {
    const halfT = getThickness(wall) / 2;

    if (endType === "passthrough") {
      const v1 = {
        x: wall.end[0] - wall.start[0],
        y: wall.end[1] - wall.start[1],
      };
      const v2 = { x: -v1.x, y: -v1.y };

      for (const v of [v1, v2]) {
        const L = Math.sqrt(v.x * v.x + v.y * v.y);
        if (L < 1e-9) {
          continue;
        }

        const nUnit = { x: -v.y / L, y: v.x / L };
        const pA = {
          x: meetingPoint.x + nUnit.x * halfT,
          y: meetingPoint.y + nUnit.y * halfT,
        };
        const pB = {
          x: meetingPoint.x - nUnit.x * halfT,
          y: meetingPoint.y - nUnit.y * halfT,
        };

        const edgeA = createLineFromPointAndVector(pA, v);
        const edgeB = createLineFromPointAndVector(pB, v);
        const angle = Math.atan2(v.y, v.x);

        processedWalls.push({
          wallId: wall.id,
          angle,
          edgeA,
          edgeB,
          isPassthrough: true,
        });
      }
    } else {
      const v =
        endType === "start"
          ? { x: wall.end[0] - wall.start[0], y: wall.end[1] - wall.start[1] }
          : { x: wall.start[0] - wall.end[0], y: wall.start[1] - wall.end[1] };

      const L = Math.sqrt(v.x * v.x + v.y * v.y);
      if (L < 1e-9) {
        continue;
      }

      const nUnit = { x: -v.y / L, y: v.x / L };
      const pA = {
        x: meetingPoint.x + nUnit.x * halfT,
        y: meetingPoint.y + nUnit.y * halfT,
      };
      const pB = {
        x: meetingPoint.x - nUnit.x * halfT,
        y: meetingPoint.y - nUnit.y * halfT,
      };

      const edgeA = createLineFromPointAndVector(pA, v);
      const edgeB = createLineFromPointAndVector(pB, v);
      const angle = Math.atan2(v.y, v.x);

      processedWalls.push({
        wallId: wall.id,
        angle,
        edgeA,
        edgeB,
        isPassthrough: false,
      });
    }
  }

  processedWalls.sort((a, b) => a.angle - b.angle);

  const wallIntersections = new Map<
    string,
    { left?: Point2D; right?: Point2D }
  >();
  const n = processedWalls.length;

  if (n < 2) {
    return wallIntersections;
  }

  for (let i = 0; i < n; i += 1) {
    const wall1 = processedWalls[i];
    const wall2 = processedWalls[(i + 1) % n];
    if (!(wall1 && wall2)) {
      continue;
    }

    const det = wall1.edgeA.a * wall2.edgeB.b - wall2.edgeB.a * wall1.edgeA.b;

    if (Math.abs(det) < 1e-9) {
      continue;
    }

    const p = {
      x: (wall1.edgeA.b * wall2.edgeB.c - wall2.edgeB.b * wall1.edgeA.c) / det,
      y: (wall2.edgeB.a * wall1.edgeA.c - wall1.edgeA.a * wall2.edgeB.c) / det,
    };

    if (!wall1.isPassthrough) {
      if (!wallIntersections.has(wall1.wallId)) {
        wallIntersections.set(wall1.wallId, {});
      }
      const entry1 = wallIntersections.get(wall1.wallId);
      if (entry1) {
        entry1.left = p;
      }
    }

    if (!wall2.isPassthrough) {
      if (!wallIntersections.has(wall2.wallId)) {
        wallIntersections.set(wall2.wallId, {});
      }
      const entry2 = wallIntersections.get(wall2.wallId);
      if (entry2) {
        entry2.right = p;
      }
    }
  }

  return wallIntersections;
}

export interface WallMiterData {
  junctionData: JunctionData;
  junctions: Map<string, Junction>;
}

export function calculateLevelMiters(walls: WallNode[]): WallMiterData {
  const getThickness = (wall: WallNode) => wall.thickness ?? 0.1;
  const junctions = findJunctions(walls);
  const junctionData: JunctionData = new Map();

  for (const [key, junction] of junctions.entries()) {
    const wallIntersections = calculateJunctionIntersections(
      junction,
      getThickness
    );
    junctionData.set(key, wallIntersections);
  }

  return { junctionData, junctions };
}

export function getAdjacentWallIds(
  allWalls: WallNode[],
  dirtyWallIds: Set<string>
): Set<string> {
  const adjacent = new Set<string>();

  for (const dirtyId of dirtyWallIds) {
    const dirtyWall = allWalls.find((w) => w.id === dirtyId);
    if (!dirtyWall) {
      continue;
    }

    const dirtyStart: Point2D = {
      x: dirtyWall.start[0],
      y: dirtyWall.start[1],
    };
    const dirtyEnd: Point2D = { x: dirtyWall.end[0], y: dirtyWall.end[1] };

    for (const wall of allWalls) {
      if (wall.id === dirtyId) {
        continue;
      }

      const wallStart: Point2D = { x: wall.start[0], y: wall.start[1] };
      const wallEnd: Point2D = { x: wall.end[0], y: wall.end[1] };

      const startKey = pointToKey(wallStart);
      const endKey = pointToKey(wallEnd);
      const dirtyStartKey = pointToKey(dirtyStart);
      const dirtyEndKey = pointToKey(dirtyEnd);

      if (
        startKey === dirtyStartKey ||
        startKey === dirtyEndKey ||
        endKey === dirtyStartKey ||
        endKey === dirtyEndKey
      ) {
        adjacent.add(wall.id);
        continue;
      }

      if (
        pointOnWallSegment(dirtyStart, wall) ||
        pointOnWallSegment(dirtyEnd, wall)
      ) {
        adjacent.add(wall.id);
        continue;
      }

      if (
        pointOnWallSegment(wallStart, dirtyWall) ||
        pointOnWallSegment(wallEnd, dirtyWall)
      ) {
        adjacent.add(wall.id);
      }
    }
  }

  return adjacent;
}

export { pointToKey };
