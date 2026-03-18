import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DoubleSide, MeshStandardNodeMaterial } from "three/webgpu";
import { sceneRegistry } from "../../hooks/scene-registry/scene-registry";
import type { AnyNodeId, DoorNode } from "../../schema";
import useScene from "../../store/use-scene";

const baseMaterial = new MeshStandardNodeMaterial({
  name: "door-base",
  color: "#f2f0ed",
  roughness: 0.5,
  metalness: 0,
});

const glassMaterial = new MeshStandardNodeMaterial({
  name: "door-glass",
  color: "lightblue",
  roughness: 0.05,
  metalness: 0.1,
  transparent: true,
  opacity: 0.35,
  side: DoubleSide,
  depthWrite: false,
});

const hitboxMaterial = new THREE.MeshBasicMaterial({ visible: false });

export const DoorSystem = () => {
  const dirtyNodes = useScene((state) => state.dirtyNodes);
  const clearDirty = useScene((state) => state.clearDirty);

  useFrame(() => {
    if (dirtyNodes.size === 0) {
      return;
    }

    const nodes = useScene.getState().nodes;

    for (const id of dirtyNodes) {
      const node = nodes[id];
      if (!node || node.type !== "door") {
        continue;
      }

      const mesh = sceneRegistry.nodes.get(id) as THREE.Mesh;
      if (!mesh) {
        continue;
      }

      updateDoorMesh(node as DoorNode, mesh);
      clearDirty(id as AnyNodeId);

      if ((node as DoorNode).parentId) {
        useScene
          .getState()
          .dirtyNodes.add((node as DoorNode).parentId as AnyNodeId);
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

function updateDoorMesh(node: DoorNode, mesh: THREE.Mesh) {
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
    frameThickness,
    frameDepth,
    threshold,
    thresholdHeight,
    segments,
    handle,
    handleHeight,
    handleSide,
    doorCloser,
    panicBar,
    panicBarHeight,
    contentPadding,
    hingesSide,
  } = node;

  const leafW = width - 2 * frameThickness;
  const leafH = height - frameThickness;
  const leafDepth = 0.04;
  const leafCenterY = -frameThickness / 2;

  addBox({
    parent: mesh,
    material: baseMaterial,
    size: [frameThickness, height, frameDepth],
    pos: [-width / 2 + frameThickness / 2, 0, 0],
  });
  addBox({
    parent: mesh,
    material: baseMaterial,
    size: [frameThickness, height, frameDepth],
    pos: [width / 2 - frameThickness / 2, 0, 0],
  });
  addBox({
    parent: mesh,
    material: baseMaterial,
    size: [width, frameThickness, frameDepth],
    pos: [0, height / 2 - frameThickness / 2, 0],
  });

  if (threshold) {
    addBox({
      parent: mesh,
      material: baseMaterial,
      size: [leafW, thresholdHeight, frameDepth],
      pos: [0, -height / 2 + thresholdHeight / 2, 0],
    });
  }

  const cpX = contentPadding[0];
  const cpY = contentPadding[1];
  if (cpY > 0) {
    addBox({
      parent: mesh,
      material: baseMaterial,
      size: [leafW, cpY, leafDepth],
      pos: [0, leafCenterY + leafH / 2 - cpY / 2, 0],
    });
    addBox({
      parent: mesh,
      material: baseMaterial,
      size: [leafW, cpY, leafDepth],
      pos: [0, leafCenterY - leafH / 2 + cpY / 2, 0],
    });
  }
  if (cpX > 0) {
    const innerH = leafH - 2 * cpY;
    addBox({
      parent: mesh,
      material: baseMaterial,
      size: [cpX, innerH, leafDepth],
      pos: [-leafW / 2 + cpX / 2, leafCenterY, 0],
    });
    addBox({
      parent: mesh,
      material: baseMaterial,
      size: [cpX, innerH, leafDepth],
      pos: [leafW / 2 - cpX / 2, leafCenterY, 0],
    });
  }

  const contentW = leafW - 2 * cpX;
  const contentH = leafH - 2 * cpY;

  const totalRatio = segments.reduce((sum, s) => sum + s.heightRatio, 0);
  const contentTop = leafCenterY + contentH / 2;

  let segY = contentTop;
  for (const seg of segments) {
    const segH = (seg.heightRatio / totalRatio) * contentH;
    const segCenterY = segY - segH / 2;

    const numCols = seg.columnRatios.length;
    const colSum = seg.columnRatios.reduce((a, b) => a + b, 0);
    const usableW = contentW - (numCols - 1) * seg.dividerThickness;
    const colWidths = seg.columnRatios.map((r) => (r / colSum) * usableW);

    const colXCenters: number[] = [];
    let cx = -contentW / 2;
    for (let c = 0; c < numCols; c += 1) {
      colXCenters.push(cx + (colWidths[c] ?? 0) / 2);
      cx += colWidths[c] ?? 0;
      if (c < numCols - 1) {
        cx += seg.dividerThickness;
      }
    }

    cx = -contentW / 2;
    for (let c = 0; c < numCols - 1; c += 1) {
      cx += colWidths[c] ?? 0;
      addBox({
        parent: mesh,
        material: baseMaterial,
        size: [seg.dividerThickness, segH, leafDepth + 0.001],
        pos: [cx + seg.dividerThickness / 2, segCenterY, 0],
      });
      cx += seg.dividerThickness;
    }

    for (let c = 0; c < numCols; c += 1) {
      const colW = colWidths[c] ?? 0;
      const colX = colXCenters[c] ?? 0;

      if (seg.type === "glass") {
        const glassDepth = Math.max(0.004, leafDepth * 0.15);
        addBox({
          parent: mesh,
          material: glassMaterial,
          size: [colW, segH, glassDepth],
          pos: [colX, segCenterY, 0],
        });
      } else if (seg.type === "panel") {
        addBox({
          parent: mesh,
          material: baseMaterial,
          size: [colW, segH, leafDepth],
          pos: [colX, segCenterY, 0],
        });
        const panelW = colW - 2 * seg.panelInset;
        const panelH = segH - 2 * seg.panelInset;
        if (panelW > 0.01 && panelH > 0.01) {
          const effectiveDepth =
            Math.abs(seg.panelDepth) < 0.002 ? 0.005 : Math.abs(seg.panelDepth);
          const panelZ = leafDepth / 2 + effectiveDepth / 2;
          addBox({
            parent: mesh,
            material: baseMaterial,
            size: [panelW, panelH, effectiveDepth],
            pos: [colX, segCenterY, panelZ],
          });
        }
      } else {
        addBox({
          parent: mesh,
          material: baseMaterial,
          size: [colW, segH, leafDepth],
          pos: [colX, segCenterY, 0],
        });
      }
    }

    segY -= segH;
  }

  if (handle) {
    const handleY = handleHeight - height / 2;
    const faceZ = leafDepth / 2;

    const handleX =
      handleSide === "right" ? leafW / 2 - 0.045 : -leafW / 2 + 0.045;

    addBox({
      parent: mesh,
      material: baseMaterial,
      size: [0.028, 0.14, 0.01],
      pos: [handleX, handleY, faceZ + 0.005],
    });
    addBox({
      parent: mesh,
      material: baseMaterial,
      size: [0.022, 0.1, 0.035],
      pos: [handleX, handleY, faceZ + 0.025],
    });
  }

  if (doorCloser) {
    const closerY = leafCenterY + leafH / 2 - 0.04;
    addBox({
      parent: mesh,
      material: baseMaterial,
      size: [0.28, 0.055, 0.055],
      pos: [0, closerY, leafDepth / 2 + 0.03],
    });
    addBox({
      parent: mesh,
      material: baseMaterial,
      size: [0.14, 0.015, 0.015],
      pos: [leafW / 4, closerY + 0.025, leafDepth / 2 + 0.015],
    });
  }

  if (panicBar) {
    const barY = panicBarHeight - height / 2;
    addBox({
      parent: mesh,
      material: baseMaterial,
      size: [leafW * 0.72, 0.04, 0.055],
      pos: [0, barY, leafDepth / 2 + 0.03],
    });
  }

  {
    const hingeX =
      hingesSide === "right" ? leafW / 2 - 0.012 : -leafW / 2 + 0.012;
    const hingeZ = 0;
    const hingeH = 0.1;
    const hingeW = 0.024;
    const hingeD = leafDepth + 0.016;
    const leafBottom = leafCenterY - leafH / 2;
    const leafTop = leafCenterY + leafH / 2;
    addBox({
      parent: mesh,
      material: baseMaterial,
      size: [hingeW, hingeH, hingeD],
      pos: [hingeX, leafBottom + 0.25, hingeZ],
    });
    addBox({
      parent: mesh,
      material: baseMaterial,
      size: [hingeW, hingeH, hingeD],
      pos: [hingeX, (leafBottom + leafTop) / 2, hingeZ],
    });
    addBox({
      parent: mesh,
      material: baseMaterial,
      size: [hingeW, hingeH, hingeD],
      pos: [hingeX, leafTop - 0.25, hingeZ],
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
