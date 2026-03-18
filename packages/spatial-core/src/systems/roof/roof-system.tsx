import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { sceneRegistry } from "../../hooks/scene-registry/scene-registry";
import type { AnyNodeId, RoofNode } from "../../schema";
import useScene from "../../store/use-scene";

const THICKNESS_A = 0.05;
const THICKNESS_B = 0.1;
const ROOF_COVER_OVERHANG = 0.05;
const EAVE_OVERHANG = 0.4;
const RAKE_OVERHANG = 0.3;
const WALL_THICKNESS = 0.2;
const BASE_HEIGHT = 0.5;

export const RoofSystem = () => {
  const dirtyNodes = useScene((state) => state.dirtyNodes);
  const clearDirty = useScene((state) => state.clearDirty);

  useFrame(() => {
    if (dirtyNodes.size === 0) {
      return;
    }

    const nodes = useScene.getState().nodes;

    for (const id of dirtyNodes) {
      const node = nodes[id];
      if (!node || node.type !== "roof") {
        continue;
      }

      const mesh = sceneRegistry.nodes.get(id) as THREE.Mesh;
      if (mesh) {
        updateRoofGeometry(node as RoofNode, mesh);
        clearDirty(id as AnyNodeId);
      }
    }
  });

  return null;
};

function updateRoofGeometry(node: RoofNode, mesh: THREE.Mesh) {
  const newGeo = generateRoofGeometry(node);

  mesh.geometry.dispose();
  mesh.geometry = newGeo;

  mesh.position.set(node.position[0], node.position[1], node.position[2]);
  mesh.rotation.y = node.rotation;
}

function solvePitch(
  rise: number,
  run: number,
  thickA: number,
  thickB: number
): number {
  const T = thickA + thickB;
  if (run < 0.01) {
    return 0;
  }

  const R = Math.sqrt(run * run + rise * rise);
  if (R <= T) {
    return Math.atan2(rise, run) * 0.5;
  }

  const phi = Math.atan2(rise, run);
  const shift = Math.asin(T / R);

  return phi - shift;
}

function createShape(points: { x: number; y: number }[]): THREE.Shape {
  const shape = new THREE.Shape();
  if (points.length === 0) {
    return shape;
  }
  const firstPoint = points[0];
  if (!firstPoint) {
    return shape;
  }
  shape.moveTo(firstPoint.x, firstPoint.y);
  for (let i = 1; i < points.length; i += 1) {
    const point = points[i];
    if (point) {
      shape.lineTo(point.x, point.y);
    }
  }
  shape.closePath();
  return shape;
}

function getSideProfile(
  dir: 1 | -1,
  width: number,
  roofHeight: number
): {
  pointsA: { x: number; y: number }[];
  pointsB: { x: number; y: number }[];
  pointsSide: { x: number; y: number }[];
  pointsC1: { x: number; y: number }[];
  pointsC2: { x: number; y: number }[];
} {
  const halfWall = WALL_THICKNESS / 2;

  const rise = Math.max(0, roofHeight - BASE_HEIGHT);
  const run = width - halfWall;

  const angle = solvePitch(rise, run, THICKNESS_A, THICKNESS_B);
  const tanA = Math.tan(angle);
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);

  const ridgeUnderY = BASE_HEIGHT + run * tanA;
  const ridgeInterfaceY = ridgeUnderY + THICKNESS_B / cosA;
  const ridgeTopY = ridgeInterfaceY + THICKNESS_A / cosA;

  const wallOuterTopY = BASE_HEIGHT - WALL_THICKNESS * tanA;

  const overhangDx = EAVE_OVERHANG * cosA;

  const eaveTopZ = width + halfWall + overhangDx;
  const eaveTopY = ridgeTopY - eaveTopZ * tanA;

  const coverExtDx = ROOF_COVER_OVERHANG * cosA;
  const coverExtDy = ROOF_COVER_OVERHANG * sinA;

  const eaveTopExtZ = eaveTopZ + coverExtDx;
  const eaveTopExtY = eaveTopY - coverExtDy;

  const eaveInterfaceExtZ = eaveTopExtZ - THICKNESS_A * sinA;
  const eaveInterfaceExtY = eaveTopExtY - THICKNESS_A * cosA;

  const eaveInterfaceZ = eaveTopZ;

  const eaveBottomZ = eaveTopZ;
  const eaveBottomY = ridgeUnderY - eaveTopZ * tanA;

  const pointsA = [
    { x: 0, y: ridgeTopY },
    { x: dir * eaveTopExtZ, y: eaveTopExtY },
    { x: dir * eaveInterfaceExtZ, y: eaveInterfaceExtY },
    { x: 0, y: ridgeInterfaceY },
  ];

  const pointsB = [
    { x: 0, y: ridgeInterfaceY },
    { x: dir * eaveInterfaceZ, y: ridgeInterfaceY - eaveTopZ * tanA },
    { x: dir * eaveBottomZ, y: eaveBottomY },
    { x: 0, y: ridgeUnderY },
  ];

  const zInner = width - halfWall;
  const zOuter = width + halfWall;

  const pointsSide = [
    { x: dir * zInner, y: 0 },
    { x: dir * zOuter, y: 0 },
    { x: dir * zOuter, y: Math.max(0, wallOuterTopY) },
    { x: dir * zInner, y: BASE_HEIGHT },
  ];

  const pointsC1 = [
    { x: 0, y: BASE_HEIGHT },
    { x: dir * zInner, y: BASE_HEIGHT },
    { x: dir * zInner, y: BASE_HEIGHT },
    { x: 0, y: ridgeUnderY },
  ];

  const pointsC2 = [
    { x: 0, y: 0 },
    { x: dir * zInner, y: 0 },
    { x: dir * zInner, y: BASE_HEIGHT },
    { x: 0, y: BASE_HEIGHT },
  ];

  return { pointsA, pointsB, pointsSide, pointsC1, pointsC2 };
}

export function generateRoofGeometry(roofNode: RoofNode): THREE.BufferGeometry {
  const { length, height, leftWidth, rightWidth } = roofNode;

  const ridgeLength = length;

  const leftP = getSideProfile(1, leftWidth, height);
  const rightP = getSideProfile(-1, rightWidth, height);

  const shapes = {
    ALeft: createShape(leftP.pointsA),
    ARight: createShape(rightP.pointsA),
    BLeft: createShape(leftP.pointsB),
    BRight: createShape(rightP.pointsB),
    SideLeft: createShape(leftP.pointsSide),
    SideRight: createShape(rightP.pointsSide),
    C1Left: createShape(leftP.pointsC1),
    C1Right: createShape(rightP.pointsC1),
    C2Left: createShape(leftP.pointsC2),
    C2Right: createShape(rightP.pointsC2),
  };

  const lengths = {
    A:
      ridgeLength +
      2 * RAKE_OVERHANG +
      2 * ROOF_COVER_OVERHANG +
      WALL_THICKNESS,
    B: ridgeLength + 2 * RAKE_OVERHANG + WALL_THICKNESS,
    Side: ridgeLength + WALL_THICKNESS,
    Gable: WALL_THICKNESS,
  };

  const offsets = {
    A: -RAKE_OVERHANG - ROOF_COVER_OVERHANG - WALL_THICKNESS / 2,
    B: -RAKE_OVERHANG - WALL_THICKNESS / 2,
    Side: -WALL_THICKNESS / 2,
    GableFront: -WALL_THICKNESS / 2,
    GableBack: ridgeLength - WALL_THICKNESS / 2,
  };

  const createPart = (shape: THREE.Shape, depth: number, xOffset: number) => {
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: false,
    });
    geo.rotateY(Math.PI / 2);
    geo.translate(xOffset, 0, 0);
    return geo;
  };

  const geometries: THREE.BufferGeometry[] = [];

  geometries.push(createPart(shapes.ALeft, lengths.A, offsets.A));
  geometries.push(createPart(shapes.ARight, lengths.A, offsets.A));

  geometries.push(createPart(shapes.BLeft, lengths.B, offsets.B));
  geometries.push(createPart(shapes.BRight, lengths.B, offsets.B));

  geometries.push(createPart(shapes.SideLeft, lengths.Side, offsets.Side));
  geometries.push(createPart(shapes.SideRight, lengths.Side, offsets.Side));

  geometries.push(createPart(shapes.C1Left, lengths.Gable, offsets.GableFront));
  geometries.push(
    createPart(shapes.C1Right, lengths.Gable, offsets.GableFront)
  );
  geometries.push(createPart(shapes.C2Left, lengths.Gable, offsets.GableFront));
  geometries.push(
    createPart(shapes.C2Right, lengths.Gable, offsets.GableFront)
  );

  geometries.push(createPart(shapes.C1Left, lengths.Gable, offsets.GableBack));
  geometries.push(createPart(shapes.C1Right, lengths.Gable, offsets.GableBack));
  geometries.push(createPart(shapes.C2Left, lengths.Gable, offsets.GableBack));
  geometries.push(createPart(shapes.C2Right, lengths.Gable, offsets.GableBack));

  const mergedGeometry = new THREE.BufferGeometry();
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];

  for (const geo of geometries) {
    const posAttr = geo.getAttribute("position");
    const normAttr = geo.getAttribute("normal");
    const uvAttr = geo.getAttribute("uv");

    if (posAttr) {
      for (let i = 0; i < posAttr.count; i += 1) {
        positions.push(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
      }
    }
    if (normAttr) {
      for (let i = 0; i < normAttr.count; i += 1) {
        normals.push(normAttr.getX(i), normAttr.getY(i), normAttr.getZ(i));
      }
    }
    if (uvAttr) {
      for (let i = 0; i < uvAttr.count; i += 1) {
        uvs.push(uvAttr.getX(i), uvAttr.getY(i));
      }
    }

    geo.dispose();
  }

  mergedGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );
  mergedGeometry.setAttribute(
    "normal",
    new THREE.Float32BufferAttribute(normals, 3)
  );
  if (uvs.length > 0) {
    mergedGeometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  }

  mergedGeometry.computeVertexNormals();

  mergedGeometry.translate(-ridgeLength / 2, 0, 0);

  return mergedGeometry;
}
