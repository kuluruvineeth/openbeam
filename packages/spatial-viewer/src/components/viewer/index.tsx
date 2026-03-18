"use client";

import {
  CeilingSystem,
  DoorSystem,
  ItemSystem,
  RoofSystem,
  SlabSystem,
  WallSystem,
  WindowSystem,
} from "@openbeam/spatial-core";
import { Bvh } from "@react-three/drei";
import { Canvas, extend, type ThreeToJSXElements } from "@react-three/fiber";
import * as THREE from "three/webgpu";
import useViewer from "../../store/use-viewer";
import { GuideSystem } from "../../systems/guide/guide-system";
import { LevelSystem } from "../../systems/level/level-system";
import { ScanSystem } from "../../systems/scan/scan-system";
import { WallCutout } from "../../systems/wall/wall-cutout";
import { ZoneSystem } from "../../systems/zone/zone-system";
import { SceneRenderer } from "../renderers/scene-renderer";
import { GroundOccluder } from "./ground-occluder";
import { Lights } from "./lights";
import PostProcessing from "./post-processing";
import { SelectionManager } from "./selection-manager";
import { ViewerCamera } from "./viewer-camera";

declare module "@react-three/fiber" {
  interface ThreeElements extends ThreeToJSXElements<typeof THREE> {}
}

extend(THREE as unknown as Record<string, new (...args: unknown[]) => unknown>);

interface ViewerProps {
  children?: React.ReactNode;
  selectionManager?: "default" | "custom";
}

const Viewer: React.FC<ViewerProps> = ({
  children,
  selectionManager = "default",
}) => {
  const theme = useViewer((state) => state.theme);

  return (
    <Canvas
      camera={{ position: [50, 50, 50], fov: 50 }}
      className={`transition-colors duration-700 ${theme === "dark" ? "bg-[#1f2433]" : "bg-[#fafafa]"}`}
      dpr={[1, 1.5]}
      gl={async (props) => {
        const renderer = new THREE.WebGPURenderer(
          props as unknown as ConstructorParameters<
            typeof THREE.WebGPURenderer
          >[0]
        );
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.9;
        await renderer.init();
        return renderer;
      }}
      shadows={{
        type: THREE.PCFShadowMap,
        enabled: true,
      }}
    >
      <GroundOccluder />
      <ViewerCamera />

      <Lights />
      <Bvh>
        <SceneRenderer />
      </Bvh>

      <LevelSystem />
      <GuideSystem />
      <ScanSystem />
      <WallCutout />
      <CeilingSystem />
      <DoorSystem />
      <ItemSystem />
      <RoofSystem />
      <SlabSystem />
      <WallSystem />
      <WindowSystem />
      <ZoneSystem />
      <PostProcessing />

      {selectionManager === "default" && <SelectionManager />}
      {children}
    </Canvas>
  );
};

export default Viewer;
