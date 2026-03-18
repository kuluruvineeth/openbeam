import { sceneRegistry, useScene, type WallNode } from "@openbeam/spatial-core";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import {
  Fn,
  float,
  fract,
  length,
  mix,
  positionLocal,
  smoothstep,
  step,
  vec2,
} from "three/tsl";

import { type Mesh, MeshStandardNodeMaterial, Vector3 } from "three/webgpu";
import useViewer from "../../store/use-viewer";

const tmpVec = new Vector3();
const u = new Vector3();
const v = new Vector3();

const dotPattern = Fn(() => {
  const scale = float(0.1);
  const dotSize = float(0.3);

  const uv = vec2(positionLocal.x, positionLocal.y).div(scale);
  const gridUV = fract(uv);

  const dist = length(gridUV.sub(0.5));

  const dots = step(dist, dotSize.mul(0.5));

  const fadeHeight = float(2.5);
  const yFade = float(1).sub(smoothstep(float(0), fadeHeight, positionLocal.y));

  return dots.mul(yFade);
});

const invsibleWallMaterial = new MeshStandardNodeMaterial({
  transparent: true,
  opacityNode: mix(float(0.0), float(0.24), dotPattern()),
  color: "white",
  depthWrite: false,
  emissive: "white",
});
const wallMaterial = new MeshStandardNodeMaterial({
  color: "white",
  roughness: 1,
  metalness: 0,
});

export const WallCutout = () => {
  const lastCameraPosition = useRef(new Vector3());
  const lastCameraTarget = useRef(new Vector3());
  const lastUpdateTime = useRef(0);
  const lastWallMode = useRef<string>(useViewer.getState().wallMode);
  const lastNumberOfWalls = useRef(0);

  useFrame(({ camera, clock }) => {
    const wallMode = useViewer.getState().wallMode;
    const currentTime = clock.elapsedTime;
    const currentCameraPosition = camera.position;
    camera.getWorldDirection(tmpVec);
    tmpVec.add(currentCameraPosition);

    const distanceMoved = currentCameraPosition.distanceTo(
      lastCameraPosition.current
    );
    const directionChanged = tmpVec.distanceTo(lastCameraTarget.current);
    const timeSinceUpdate = currentTime - lastUpdateTime.current;

    if (
      ((distanceMoved > 0.5 || directionChanged > 0.3) &&
        timeSinceUpdate > 0.1) ||
      lastWallMode.current !== wallMode ||
      sceneRegistry.byType.wall.size !== lastNumberOfWalls.current
    ) {
      lastCameraPosition.current.copy(currentCameraPosition);
      lastCameraTarget.current.copy(tmpVec);
      lastUpdateTime.current = currentTime;
      camera.getWorldDirection(u);

      const walls = sceneRegistry.byType.wall;
      for (const wallId of walls) {
        const wallMesh = sceneRegistry.nodes.get(wallId);
        if (!wallMesh) {
          continue;
        }
        const wallNode = useScene.getState().nodes[wallId as WallNode["id"]];
        if (!wallNode || wallNode.type !== "wall") {
          continue;
        }
        let hideWall =
          wallNode.frontSide === "interior" && wallNode.backSide === "interior";

        if (wallMode === "up") {
          hideWall = false;
        } else if (wallMode === "down") {
          hideWall = true;
        } else {
          wallMesh.getWorldDirection(v);
          if (v.dot(u) < 0) {
            if (
              wallNode.frontSide === "exterior" &&
              wallNode.backSide !== "exterior"
            ) {
              hideWall = true;
            }
          } else if (
            wallNode.backSide === "exterior" &&
            wallNode.frontSide !== "exterior"
          ) {
            hideWall = true;
          }
        }
        (wallMesh as Mesh).material = hideWall
          ? invsibleWallMaterial
          : wallMaterial;
      }
      lastWallMode.current = wallMode;
      lastNumberOfWalls.current = sceneRegistry.byType.wall.size;
    }
  });
  return null;
};
