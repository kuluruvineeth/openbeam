import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DoubleSide, MeshStandardNodeMaterial } from "three/webgpu";
import { sceneRegistry } from "../../hooks/scene-registry/scene-registry";
import type { AnyNodeId, WindowNode } from "../../schema";
import useScene from "../../store/use-scene";

const glassMaterial = new MeshStandardNodeMaterial({
  name: "glass",
  color: "lightblue",
  roughness: 0.05,
  metalness: 0.1,
  transparent: true,
  opacity: 0.3,
  side: DoubleSide,
  depthWrite: false,
});

const frameMaterial = new MeshStandardNodeMaterial({
  name: "window-frame",
  color: "#e8e8e8",
  roughness: 0.6,
  metalness: 0,
});

const hitboxMaterial = new THREE.MeshBasicMaterial({ visible: false });

export const WindowSystem = () => {
  const dirtyNodes = useScene((state) => state.dirtyNodes);
  const clearDirty = useScene((state) => state.clearDirty);

  useFrame(() => {
    if (dirtyNodes.size === 0) {
      return;
    }

    const nodes = useScene.getState().nodes;

    for (const id of dirtyNodes) {
      const node = nodes[id];
      if (!node || node.type !== "window") {
        continue;
      }

      const mesh = sceneRegistry.nodes.get(id) as THREE.Mesh;
      if (!mesh) {
        continue;
      }

      updateWindowMesh(node as WindowNode, mesh);
      clearDirty(id as AnyNodeId);

      if ((node as WindowNode).parentId) {
        useScene
          .getState()
          .dirtyNodes.add((node as WindowNode).parentId as AnyNodeId);
      }
    }
  }, 3);

  return null;
};

interface BoxParams {
  parent: THREE.Object3D;
  material: THREE.Material;
  size: [number, number, number];
  pos: [number, number, number];
}

function addBox({ parent, material, size, pos }: BoxParams) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(size[0], size[1], size[2]),
    material
  );
  m.position.set(pos[0], pos[1], pos[2]);
  parent.add(m);
}

function updateWindowMesh(node: WindowNode, mesh: THREE.Mesh) {
  mesh.geometry.dispose();
  mesh.geometry = new THREE.BoxGeometry(
    node.width,
    node.height,
    node.frameDepth
  );
  mesh.material = hitboxMaterial;

  mesh.position.set(node.position[0], node.position[1], node.position[2]);
  mesh.rotation.set(node.rotation[0], node.rotation[1], node.rotation[2]);

  for (const child of [...mesh.children]) {
    if (child.name === "cutout") {
      continue;
    }
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
    }
    mesh.remove(child);
  }

  const {
    width,
    height,
    frameDepth,
    frameThickness,
    columnRatios,
    rowRatios,
    columnDividerThickness,
    rowDividerThickness,
    sill,
    sillDepth,
    sillThickness,
  } = node;

  const innerW = width - 2 * frameThickness;
  const innerH = height - 2 * frameThickness;

  addBox({
    parent: mesh,
    material: frameMaterial,
    size: [width, frameThickness, frameDepth],
    pos: [0, height / 2 - frameThickness / 2, 0],
  });
  addBox({
    parent: mesh,
    material: frameMaterial,
    size: [width, frameThickness, frameDepth],
    pos: [0, -height / 2 + frameThickness / 2, 0],
  });
  addBox({
    parent: mesh,
    material: frameMaterial,
    size: [frameThickness, innerH, frameDepth],
    pos: [-width / 2 + frameThickness / 2, 0, 0],
  });
  addBox({
    parent: mesh,
    material: frameMaterial,
    size: [frameThickness, innerH, frameDepth],
    pos: [width / 2 - frameThickness / 2, 0, 0],
  });

  const numCols = columnRatios.length;
  const numRows = rowRatios.length;

  const usableW = innerW - (numCols - 1) * columnDividerThickness;
  const usableH = innerH - (numRows - 1) * rowDividerThickness;

  const colSum = columnRatios.reduce((a, b) => a + b, 0);
  const rowSum = rowRatios.reduce((a, b) => a + b, 0);
  const colWidths = columnRatios.map((r) => (r / colSum) * usableW);
  const rowHeights = rowRatios.map((r) => (r / rowSum) * usableH);

  const colXCenters: number[] = [];
  let cx = -innerW / 2;
  for (let c = 0; c < numCols; c += 1) {
    colXCenters.push(cx + (colWidths[c] ?? 0) / 2);
    cx += colWidths[c] ?? 0;
    if (c < numCols - 1) {
      cx += columnDividerThickness;
    }
  }

  const rowYCenters: number[] = [];
  let cy = innerH / 2;
  for (let r = 0; r < numRows; r += 1) {
    rowYCenters.push(cy - (rowHeights[r] ?? 0) / 2);
    cy -= rowHeights[r] ?? 0;
    if (r < numRows - 1) {
      cy -= rowDividerThickness;
    }
  }

  cx = -innerW / 2;
  for (let c = 0; c < numCols - 1; c += 1) {
    cx += colWidths[c] ?? 0;
    addBox({
      parent: mesh,
      material: frameMaterial,
      size: [columnDividerThickness, innerH, frameDepth],
      pos: [cx + columnDividerThickness / 2, 0, 0],
    });
    cx += columnDividerThickness;
  }

  cy = innerH / 2;
  for (let r = 0; r < numRows - 1; r += 1) {
    cy -= rowHeights[r] ?? 0;
    const divY = cy - rowDividerThickness / 2;
    for (let c = 0; c < numCols; c += 1) {
      addBox({
        parent: mesh,
        material: frameMaterial,
        size: [colWidths[c] ?? 0, rowDividerThickness, frameDepth],
        pos: [colXCenters[c] ?? 0, divY, 0],
      });
    }
    cy -= rowDividerThickness;
  }

  const glassDepth = Math.max(0.004, frameDepth * 0.08);
  for (let c = 0; c < numCols; c += 1) {
    for (let r = 0; r < numRows; r += 1) {
      addBox({
        parent: mesh,
        material: glassMaterial,
        size: [colWidths[c] ?? 0, rowHeights[r] ?? 0, glassDepth],
        pos: [colXCenters[c] ?? 0, rowYCenters[r] ?? 0, 0],
      });
    }
  }

  if (sill) {
    const sillW = width + sillDepth * 0.4;
    const sillZ = frameDepth / 2 + sillDepth / 2;
    addBox({
      parent: mesh,
      material: frameMaterial,
      size: [sillW, sillThickness, sillDepth],
      pos: [0, -height / 2 - sillThickness / 2, sillZ],
    });
  }

  let cutout = mesh.getObjectByName("cutout") as THREE.Mesh | undefined;
  if (!cutout) {
    cutout = new THREE.Mesh();
    cutout.name = "cutout";
    mesh.add(cutout);
  }
  cutout.geometry.dispose();
  cutout.geometry = new THREE.BoxGeometry(node.width, node.height, 1.0);
  cutout.visible = false;
}
