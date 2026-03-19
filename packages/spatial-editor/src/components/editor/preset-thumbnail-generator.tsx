"use client";

import { emitter, sceneRegistry } from "@openbeam/spatial-core";
import { useThree } from "@react-three/fiber";
import { useCallback, useEffect } from "react";
import * as THREE from "three";
import { usePresetsAdapter } from "../../contexts/presets-context";

const THUMBNAIL_SIZE = 1080;
const CAMERA_FOV = 45;

export const PresetThumbnailGenerator = () => {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const adapter = usePresetsAdapter();

  const generate = useCallback(
    ({ presetId, nodeId }: { presetId: string; nodeId: string }) => {
      const target = sceneRegistry.nodes.get(nodeId);
      if (!target) {
        console.error("❌ PresetThumbnail: node not found", nodeId);
        return;
      }

      target.updateWorldMatrix(true, true);
      const targetInverse = new THREE.Matrix4()
        .copy(target.matrixWorld)
        .invert();
      const relMatrix = new THREE.Matrix4();

      const clones: THREE.Object3D[] = [];
      target.traverse((obj) => {
        if (
          !(
            obj instanceof THREE.Mesh ||
            obj instanceof THREE.Line ||
            obj instanceof THREE.Points
          )
        ) {
          return;
        }
        const c = obj.clone(false); // shallow clone: copies geometry, material, visible — no children
        relMatrix.multiplyMatrices(targetInverse, obj.matrixWorld);
        relMatrix.decompose(c.position, c.quaternion, c.scale);
        scene.add(c);
        clones.push(c);
      });

      if (clones.length === 0) {
        console.error(
          "❌ PresetThumbnail: no renderable objects found",
          nodeId
        );
        return;
      }

      const box = new THREE.Box3();
      for (const c of clones) {
        box.expandByObject(c);
      }

      if (box.isEmpty()) {
        for (const c of clones) {
          scene.remove(c);
        }
        console.error("❌ PresetThumbnail: empty bounding box", nodeId);
        return;
      }

      const sphere = new THREE.Sphere();
      box.getBoundingSphere(sphere);

      const { width, height } = gl.domElement;
      const camera = new THREE.PerspectiveCamera(
        CAMERA_FOV,
        width / height,
        0.01,
        1000
      );
      const dir = new THREE.Vector3(-0.5, 0.5, 0.5).normalize();
      const fovRad = (CAMERA_FOV * Math.PI) / 180;
      const dist = (sphere.radius / Math.tan(fovRad / 2)) * 1.3;
      camera.position.copy(sphere.center).addScaledVector(dir, dist);
      camera.lookAt(sphere.center);
      camera.updateProjectionMatrix();

      const cloneSet = new Set<THREE.Object3D>(clones);
      const snapshot = new Map<THREE.Object3D, boolean>();
      scene.traverse((obj) => {
        if (cloneSet.has(obj)) {
          return;
        }
        if (
          !(
            obj instanceof THREE.Mesh ||
            obj instanceof THREE.Line ||
            obj instanceof THREE.Points
          )
        ) {
          return;
        }
        snapshot.set(obj, obj.visible);
        obj.visible = false;
      });

      gl.render(scene, camera);

      for (const [obj, wasVisible] of snapshot) {
        obj.visible = wasVisible;
      }
      for (const c of clones) {
        scene.remove(c);
      }

      const minDim = Math.min(width, height);
      const sx = Math.round((width - minDim) / 2);
      const sy = Math.round((height - minDim) / 2);
      const offscreen = document.createElement("canvas");
      offscreen.width = THUMBNAIL_SIZE;
      offscreen.height = THUMBNAIL_SIZE;
      const ctx = offscreen.getContext("2d") as CanvasRenderingContext2D;
      ctx.drawImage(
        gl.domElement,
        sx,
        sy,
        minDim,
        minDim,
        0,
        0,
        THUMBNAIL_SIZE,
        THUMBNAIL_SIZE
      );

      offscreen.toBlob(async (blob) => {
        if (!blob) {
          console.error("❌ PresetThumbnail: failed to create blob");
          return;
        }
        if (!adapter.uploadPresetThumbnail) {
          return;
        }
        const thumbnailUrl = await adapter.uploadPresetThumbnail(
          presetId,
          blob
        );
        if (thumbnailUrl) {
          emitter.emit("preset:thumbnail-updated", { presetId, thumbnailUrl });
        }
      }, "image/png");
    },
    [gl, scene, adapter]
  );

  useEffect(() => {
    emitter.on("preset:generate-thumbnail", generate);
    return () => emitter.off("preset:generate-thumbnail", generate);
  }, [generate]);

  return null;
};
