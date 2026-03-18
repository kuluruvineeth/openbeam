import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";
import { computeBoundsTree } from "three-mesh-bvh";
import { sceneRegistry } from "../../hooks/scene-registry/scene-registry";
import { spatialGridManager } from "../../hooks/spatial-grid/spatial-grid-manager";
import { resolveLevelId } from "../../hooks/spatial-grid/spatial-grid-sync";
import type { AnyNode, AnyNodeId, WallNode } from "../../schema";
import useScene from "../../store/use-scene";
import {
  calculateLevelMiters,
  getAdjacentWallIds,
  type Point2D,
  pointToKey,
  type WallMiterData,
} from "./wall-mitering";

const csgEvaluator = new Evaluator();

export const WallSystem = () => {
  const dirtyNodes = useScene((state) => state.dirtyNodes);
  const clearDirty = useScene((state) => state.clearDirty);

  useFrame(() => {
    if (dirtyNodes.size === 0) {
      return;
    }

    const nodes = useScene.getState().nodes;

    const dirtyWallsByLevel = new Map<string, Set<string>>();

    for (const id of dirtyNodes) {
      const node = nodes[id];
      if (!node || node.type !== "wall") {
        continue;
      }

      const levelId = node.parentId;
      if (!levelId) {
        continue;
      }

      if (!dirtyWallsByLevel.has(levelId)) {
        dirtyWallsByLevel.set(levelId, new Set());
      }
      dirtyWallsByLevel.get(levelId)?.add(id);
    }

    for (const [levelId, dirtyWallIds] of dirtyWallsByLevel) {
      const levelWalls = getLevelWalls(levelId);
      const miterData = calculateLevelMiters(levelWalls);

      for (const wallId of dirtyWallIds) {
        const mesh = sceneRegistry.nodes.get(wallId) as THREE.Mesh;
        if (mesh) {
          updateWallGeometry(wallId, miterData);
          clearDirty(wallId as AnyNodeId);
        }
      }

      const adjacentWallIds = getAdjacentWallIds(levelWalls, dirtyWallIds);
      for (const wallId of adjacentWallIds) {
        if (!dirtyWallIds.has(wallId)) {
          const mesh = sceneRegistry.nodes.get(wallId) as THREE.Mesh;
          if (mesh) {
            updateWallGeometry(wallId, miterData);
          }
        }
      }
    }
  }, 4);

  return null;
};

function getLevelWalls(levelId: string): WallNode[] {
  const { nodes } = useScene.getState();
  const level = nodes[levelId as AnyNodeId];

  if (!level || level.type !== "level") {
    return [];
  }

  const walls: WallNode[] = [];
  for (const childId of level.children) {
    const child = nodes[childId];
    if (child?.type === "wall") {
      walls.push(child as WallNode);
    }
  }

  return walls;
}

function updateWallGeometry(wallId: string, miterData: WallMiterData) {
  const nodes = useScene.getState().nodes;
  const node = nodes[wallId as WallNode["id"]];
  if (!node || node.type !== "wall") {
    return;
  }

  const mesh = sceneRegistry.nodes.get(wallId) as THREE.Mesh;
  if (!mesh) {
    return;
  }

  const levelId = resolveLevelId(node, nodes);
  const slabElevation = spatialGridManager.getSlabElevationForWall(
    levelId,
    node.start,
    node.end
  );

  const childrenIds = node.children || [];
  const childrenNodes = childrenIds
    .map((childId) => nodes[childId])
    .filter((n): n is AnyNode => n !== undefined);

  const newGeo = generateExtrudedWall(
    node,
    childrenNodes,
    miterData,
    slabElevation
  );

  mesh.geometry.dispose();
  mesh.geometry = newGeo;
  const collisionMesh = mesh.getObjectByName("collision-mesh") as THREE.Mesh;
  if (collisionMesh) {
    const collisionGeo = generateExtrudedWall(
      node,
      [],
      miterData,
      slabElevation
    );
    collisionMesh.geometry.dispose();
    collisionMesh.geometry = collisionGeo;
  }

  mesh.position.set(node.start[0], slabElevation, node.start[1]);
  const angle = Math.atan2(
    node.end[1] - node.start[1],
    node.end[0] - node.start[0]
  );
  mesh.rotation.y = -angle;
}

export function generateExtrudedWall(
  wallNode: WallNode,
  childrenNodes: AnyNode[],
  miterData: WallMiterData,
  slabElevation = 0
) {
  const { junctionData } = miterData;

  const wallStart: Point2D = { x: wallNode.start[0], y: wallNode.start[1] };
  const wallEnd: Point2D = { x: wallNode.end[0], y: wallNode.end[1] };
  const wallHeight = wallNode.height ?? 2.5;
  const height = slabElevation > 0 ? wallHeight : wallHeight - slabElevation;

  const thickness = wallNode.thickness ?? 0.1;
  const halfT = thickness / 2;

  const v = { x: wallEnd.x - wallStart.x, y: wallEnd.y - wallStart.y };
  const L = Math.sqrt(v.x * v.x + v.y * v.y);
  if (L < 1e-9) {
    return new THREE.BufferGeometry();
  }
  const nUnit = { x: -v.y / L, y: v.x / L };

  const keyStart = pointToKey(wallStart);
  const keyEnd = pointToKey(wallEnd);

  const startJunction = junctionData.get(keyStart)?.get(wallNode.id);
  const endJunction = junctionData.get(keyEnd)?.get(wallNode.id);

  const p_start_L: Point2D = startJunction?.left || {
    x: wallStart.x + nUnit.x * halfT,
    y: wallStart.y + nUnit.y * halfT,
  };
  const p_start_R: Point2D = startJunction?.right || {
    x: wallStart.x - nUnit.x * halfT,
    y: wallStart.y - nUnit.y * halfT,
  };

  const p_end_L: Point2D = endJunction?.right || {
    x: wallEnd.x + nUnit.x * halfT,
    y: wallEnd.y + nUnit.y * halfT,
  };
  const p_end_R: Point2D = endJunction?.left || {
    x: wallEnd.x - nUnit.x * halfT,
    y: wallEnd.y - nUnit.y * halfT,
  };

  const polyPoints: Point2D[] = [p_start_R, p_end_R];
  if (endJunction) {
    polyPoints.push(wallEnd);
  }
  polyPoints.push(p_end_L, p_start_L);
  if (startJunction) {
    polyPoints.push(wallStart);
  }

  const wallAngle = Math.atan2(v.y, v.x);
  const cosA = Math.cos(-wallAngle);
  const sinA = Math.sin(-wallAngle);

  const worldToLocal = (worldPt: Point2D): { x: number; z: number } => {
    const dx = worldPt.x - wallStart.x;
    const dy = worldPt.y - wallStart.y;
    return {
      x: dx * cosA - dy * sinA,
      z: dx * sinA + dy * cosA,
    };
  };

  const localPoints = polyPoints.map(worldToLocal);

  const footprint = new THREE.Shape();
  const lp0 = localPoints[0];
  if (!lp0) {
    return new THREE.BufferGeometry();
  }
  footprint.moveTo(lp0.x, -lp0.z);
  for (let i = 1; i < localPoints.length; i += 1) {
    const lp = localPoints[i];
    if (!lp) {
      continue;
    }
    footprint.lineTo(lp.x, -lp.z);
  }
  footprint.closePath();

  const geometry = new THREE.ExtrudeGeometry(footprint, {
    depth: height,
    bevelEnabled: false,
  });

  geometry.rotateX(-Math.PI / 2);
  geometry.computeVertexNormals();

  const cutoutBrushes = collectCutoutBrushes(
    wallNode,
    childrenNodes,
    thickness
  );
  if (cutoutBrushes.length === 0) {
    return geometry;
  }

  geometry.computeBoundsTree = computeBoundsTree;
  geometry.computeBoundsTree({ maxLeafSize: 10 });

  const wallBrush = new Brush(geometry);
  wallBrush.updateMatrixWorld();

  let resultBrush = wallBrush;
  for (const cutoutBrush of cutoutBrushes) {
    cutoutBrush.updateMatrixWorld();
    const newResult = csgEvaluator.evaluate(
      resultBrush,
      cutoutBrush,
      SUBTRACTION
    );
    if (resultBrush !== wallBrush) {
      resultBrush.geometry.dispose();
    }
    resultBrush = newResult;
  }

  wallBrush.geometry.dispose();
  for (const brush of cutoutBrushes) {
    brush.geometry.dispose();
  }

  const resultGeometry = resultBrush.geometry;
  resultGeometry.computeVertexNormals();

  return resultGeometry;
}

function collectCutoutBrushes(
  wallNode: WallNode,
  childrenNodes: AnyNode[],
  wallThickness: number
): Brush[] {
  const brushes: Brush[] = [];
  const wallMesh = sceneRegistry.nodes.get(wallNode.id) as THREE.Mesh;
  if (!wallMesh) {
    return brushes;
  }

  wallMesh.updateMatrixWorld();
  const wallMatrixInverse = wallMesh.matrixWorld.clone().invert();

  for (const child of childrenNodes) {
    if (
      child.type !== "item" &&
      child.type !== "window" &&
      child.type !== "door"
    ) {
      continue;
    }

    const childMesh = sceneRegistry.nodes.get(child.id);
    if (!childMesh) {
      continue;
    }

    const cutoutMesh = childMesh.getObjectByName("cutout") as THREE.Mesh;
    if (!cutoutMesh) {
      continue;
    }

    cutoutMesh.updateMatrixWorld();
    const positions = cutoutMesh.geometry?.attributes?.position;
    if (!positions) {
      continue;
    }

    const v3 = new THREE.Vector3();
    let minX = Number.POSITIVE_INFINITY,
      maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY,
      maxY = Number.NEGATIVE_INFINITY;

    for (let i = 0; i < positions.count; i += 1) {
      v3.fromBufferAttribute(positions, i);
      v3.applyMatrix4(cutoutMesh.matrixWorld);
      v3.applyMatrix4(wallMatrixInverse);

      minX = Math.min(minX, v3.x);
      maxX = Math.max(maxX, v3.x);
      minY = Math.min(minY, v3.y);
      maxY = Math.max(maxY, v3.y);
    }

    if (!Number.isFinite(minX)) {
      continue;
    }

    const width = maxX - minX;
    const height = maxY - minY;
    const depth = wallThickness * 2;

    const boxGeo = new THREE.BoxGeometry(width, height, depth);
    boxGeo.translate(minX + width / 2, minY + height / 2, 0);

    boxGeo.computeBoundsTree = computeBoundsTree;
    boxGeo.computeBoundsTree({ maxLeafSize: 10 });

    const brush = new Brush(boxGeo);
    brushes.push(brush);
  }

  return brushes;
}
