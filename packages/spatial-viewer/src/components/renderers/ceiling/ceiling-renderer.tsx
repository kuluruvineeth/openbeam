import { type CeilingNode, useRegistry } from "@openbeam/spatial-core";
import { useRef } from "react";
import { float, mix, positionWorld, smoothstep } from "three/tsl";
import {
  BackSide,
  FrontSide,
  type Mesh,
  MeshBasicNodeMaterial,
} from "three/webgpu";
import { useNodeEvents } from "../../../hooks/use-node-events";
import { NodeRenderer } from "../node-renderer";

const ceilingTopMaterial = new MeshBasicNodeMaterial({
  color: 0xb5_a7_8d,
  transparent: true,
  depthWrite: false,
  side: FrontSide,
});

const ceilingBottomMaterial = new MeshBasicNodeMaterial({
  color: 0x99_99_99,
  transparent: true,
  side: BackSide,
});

const gridScale = 5;
const gridX = positionWorld.x.mul(gridScale).fract();
const gridY = positionWorld.z.mul(gridScale).fract();

const lineWidth = 0.05;

const lineX = smoothstep(lineWidth, 0, gridX).add(
  smoothstep(1.0 - lineWidth, 1.0, gridX)
);
const lineY = smoothstep(lineWidth, 0, gridY).add(
  smoothstep(1.0 - lineWidth, 1.0, gridY)
);

const gridPattern = lineX.max(lineY);

const gridOpacity = mix(float(0.2), float(0.6), gridPattern);

ceilingTopMaterial.opacityNode = gridOpacity;

export const CeilingRenderer = ({ node }: { node: CeilingNode }) => {
  const ref = useRef<Mesh>(null);

  useRegistry(node.id, "ceiling", ref);
  const handlers = useNodeEvents(node, "ceiling");

  return (
    <mesh material={ceilingBottomMaterial} ref={ref}>
      <boxGeometry args={[0, 0, 0]} />
      <mesh
        material={ceilingTopMaterial}
        name="ceiling-grid"
        {...handlers}
        scale={0}
        visible={false}
      >
        <boxGeometry args={[0, 0, 0]} />
      </mesh>
      {node.children.map((childId) => (
        <NodeRenderer key={childId} nodeId={childId} />
      ))}
    </mesh>
  );
};
