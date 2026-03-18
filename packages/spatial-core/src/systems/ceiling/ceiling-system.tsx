import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { sceneRegistry } from "../../hooks/scene-registry/scene-registry";
import type { AnyNodeId, CeilingNode } from "../../schema";
import useScene from "../../store/use-scene";

export const CeilingSystem = () => {
  const dirtyNodes = useScene((state) => state.dirtyNodes);
  const clearDirty = useScene((state) => state.clearDirty);

  useFrame(() => {
    if (dirtyNodes.size === 0) {
      return;
    }

    const nodes = useScene.getState().nodes;
    for (const id of dirtyNodes) {
      const node = nodes[id];
      if (!node || node.type !== "ceiling") {
        continue;
      }

      const mesh = sceneRegistry.nodes.get(id) as THREE.Mesh;
      if (mesh) {
        updateCeilingGeometry(node as CeilingNode, mesh);
        clearDirty(id as AnyNodeId);
      }
    }
  });

  return null;
};

function updateCeilingGeometry(node: CeilingNode, mesh: THREE.Mesh) {
  const newGeo = generateCeilingGeometry(node);

  mesh.geometry.dispose();
  mesh.geometry = newGeo;

  const gridMesh = mesh.getObjectByName("ceiling-grid") as THREE.Mesh;
  if (gridMesh) {
    gridMesh.geometry.dispose();
    gridMesh.geometry = newGeo;
  }

  mesh.position.y = (node.height ?? 2.5) - 0.01;
}

export function generateCeilingGeometry(
  ceilingNode: CeilingNode
): THREE.BufferGeometry {
  const polygon = ceilingNode.polygon;

  if (polygon.length < 3) {
    return new THREE.BufferGeometry();
  }

  const shape = new THREE.Shape();
  const firstPt = polygon[0];
  if (!firstPt) {
    return new THREE.BufferGeometry();
  }

  shape.moveTo(firstPt[0], -firstPt[1]);

  for (let i = 1; i < polygon.length; i += 1) {
    const pt = polygon[i];
    if (!pt) {
      continue;
    }
    shape.lineTo(pt[0], -pt[1]);
  }
  shape.closePath();

  const holes = ceilingNode.holes || [];
  for (const holePolygon of holes) {
    if (holePolygon.length < 3) {
      continue;
    }

    const holePath = new THREE.Path();
    const holeFirstPt = holePolygon[0];
    if (!holeFirstPt) {
      continue;
    }
    holePath.moveTo(holeFirstPt[0], -holeFirstPt[1]);

    for (let i = 1; i < holePolygon.length; i += 1) {
      const pt = holePolygon[i];
      if (!pt) {
        continue;
      }
      holePath.lineTo(pt[0], -pt[1]);
    }
    holePath.closePath();

    shape.holes.push(holePath);
  }

  const geometry = new THREE.ShapeGeometry(shape);

  geometry.rotateX(-Math.PI / 2);
  geometry.computeVertexNormals();

  return geometry;
}
