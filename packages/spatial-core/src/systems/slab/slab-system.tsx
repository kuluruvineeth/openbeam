import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { sceneRegistry } from "../../hooks/scene-registry/scene-registry";
import type { AnyNodeId, SlabNode } from "../../schema";
import useScene from "../../store/use-scene";

export const SlabSystem = () => {
  const dirtyNodes = useScene((state) => state.dirtyNodes);
  const clearDirty = useScene((state) => state.clearDirty);

  useFrame(() => {
    if (dirtyNodes.size === 0) {
      return;
    }

    const nodes = useScene.getState().nodes;

    for (const id of dirtyNodes) {
      const node = nodes[id];
      if (!node || node.type !== "slab") {
        continue;
      }

      const mesh = sceneRegistry.nodes.get(id) as THREE.Mesh;
      if (mesh) {
        updateSlabGeometry(node as SlabNode, mesh);
        clearDirty(id as AnyNodeId);
      }
    }
  }, 1);

  return null;
};

function updateSlabGeometry(node: SlabNode, mesh: THREE.Mesh) {
  const newGeo = generateSlabGeometry(node);

  mesh.geometry.dispose();
  mesh.geometry = newGeo;
}

const SLAB_OUTSET = 0.05;

function outsetPolygon(
  polygon: [number, number][],
  amount: number
): [number, number][] {
  const n = polygon.length;
  if (n < 3) {
    return polygon;
  }

  let area2 = 0;
  for (let i = 0; i < n; i += 1) {
    const j = (i + 1) % n;
    const pi = polygon[i];
    const pj = polygon[j];
    if (!(pi && pj)) {
      continue;
    }
    area2 += pi[0] * pj[1] - pj[0] * pi[1];
  }
  const s = area2 >= 0 ? 1 : -1;

  const offEdges: [number, number, number, number][] = [];
  for (let i = 0; i < n; i += 1) {
    const j = (i + 1) % n;
    const pi = polygon[i];
    const pj = polygon[j];
    if (!(pi && pj)) {
      continue;
    }
    const dx = pj[0] - pi[0];
    const dz = pj[1] - pi[1];
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len < 1e-9) {
      offEdges.push([pi[0], pi[1], dx, dz]);
      continue;
    }
    const nx = ((s * dz) / len) * amount;
    const nz = ((s * -dx) / len) * amount;
    offEdges.push([pi[0] + nx, pi[1] + nz, dx, dz]);
  }

  const result: [number, number][] = [];
  for (let i = 0; i < n; i += 1) {
    const j = (i + 1) % n;
    const edge_i = offEdges[i];
    const edge_j = offEdges[j];
    if (!(edge_i && edge_j)) {
      continue;
    }
    const [ax, az, adx, adz] = edge_i;
    const [bx, bz, bdx, bdz] = edge_j;
    const denom = adx * bdz - adz * bdx;
    if (Math.abs(denom) < 1e-9) {
      result.push([ax + adx, az + adz]);
    } else {
      const t = ((bx - ax) * bdz - (bz - az) * bdx) / denom;
      result.push([ax + t * adx, az + t * adz]);
    }
  }

  return result;
}

export function generateSlabGeometry(slabNode: SlabNode): THREE.BufferGeometry {
  const polygon = outsetPolygon(slabNode.polygon, SLAB_OUTSET);
  const elevation = slabNode.elevation ?? 0.05;

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

  const holes = slabNode.holes || [];
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

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: elevation,
    bevelEnabled: false,
  });

  geometry.rotateX(-Math.PI / 2);
  geometry.computeVertexNormals();

  return geometry;
}
