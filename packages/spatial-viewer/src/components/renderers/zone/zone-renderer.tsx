import { useRegistry, type ZoneNode } from "@openbeam/spatial-core";
import { Html } from "@react-three/drei";
import { useMemo, useRef } from "react";
import {
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  type Group,
  Shape,
} from "three";
import { color, float, uniform, uv } from "three/tsl";
import { MeshBasicNodeMaterial } from "three/webgpu";
import { useNodeEvents } from "../../../hooks/use-node-events";
import { ZONE_LAYER } from "../../../lib/layers";

const Y_OFFSET = 0.01;
const WALL_HEIGHT = 2.3;

const createWallGradientMaterial = (zoneColor: string) => {
  const baseColor = color(new Color(zoneColor));

  const gradientT = uv().y;

  const opacity = uniform(0);
  const finalOpacity = float(0.6).mul(float(1).sub(gradientT)).mul(opacity);

  return new MeshBasicNodeMaterial({
    transparent: true,
    colorNode: baseColor,
    opacityNode: finalOpacity,
    side: DoubleSide,
    depthWrite: true,
    depthTest: false,
    userData: {
      uOpacity: opacity,
    },
  });
};

const createFloorMaterial = (zoneColor: string) => {
  const baseColor = color(new Color(zoneColor));
  const opacity = uniform(0);
  return new MeshBasicNodeMaterial({
    transparent: true,
    colorNode: baseColor,
    opacityNode: float(0.25).mul(opacity),
    side: DoubleSide,
    depthWrite: false,
    depthTest: false,
    userData: { uOpacity: opacity },
  });
};

const createWallGeometry = (polygon: [number, number][]): BufferGeometry => {
  const geometry = new BufferGeometry();

  if (polygon.length < 2) {
    return geometry;
  }

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i < polygon.length; i += 1) {
    const current = polygon[i];
    const next = polygon[(i + 1) % polygon.length];
    if (!(current && next)) {
      continue;
    }

    const baseIndex = i * 4;

    positions.push(current[0], Y_OFFSET, current[1]);
    uvs.push(0, 0);

    positions.push(next[0], Y_OFFSET, next[1]);
    uvs.push(1, 0);

    positions.push(next[0], Y_OFFSET + WALL_HEIGHT, next[1]);
    uvs.push(1, 1);

    positions.push(current[0], Y_OFFSET + WALL_HEIGHT, current[1]);
    uvs.push(0, 1);

    indices.push(
      baseIndex,
      baseIndex + 1,
      baseIndex + 2,
      baseIndex,
      baseIndex + 2,
      baseIndex + 3
    );
  }

  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
};

export const ZoneRenderer = ({ node }: { node: ZoneNode }) => {
  const ref = useRef<Group>(null);

  useRegistry(node.id, "zone", ref);

  const floorShape = useMemo(() => {
    if (!node?.polygon || node.polygon.length < 3) {
      return null;
    }
    const shape = new Shape();
    const firstPt = node.polygon[0];
    if (!firstPt) {
      return null;
    }

    shape.moveTo(firstPt[0], -firstPt[1]);

    for (let i = 1; i < node.polygon.length; i += 1) {
      const pt = node.polygon[i];
      if (pt) {
        shape.lineTo(pt[0], -pt[1]);
      }
    }
    shape.closePath();

    return shape;
  }, [node?.polygon]);

  const wallGeometry = useMemo(() => {
    if (!node?.polygon || node.polygon.length < 2) {
      return null;
    }
    return createWallGeometry(node.polygon);
  }, [node?.polygon]);

  const centroid = useMemo(() => {
    if (!node?.polygon || node.polygon.length < 3) {
      return [0, 0] as [number, number];
    }

    const polygon = node.polygon;
    let signedArea = 0;
    let cx = 0;
    let cz = 0;

    for (let i = 0; i < polygon.length; i += 1) {
      const entry = polygon[i];
      const nextEntry = polygon[(i + 1) % polygon.length];
      if (!(entry && nextEntry)) {
        continue;
      }
      const [x0, z0] = entry;
      const [x1, z1] = nextEntry;

      const cross = x0 * z1 - x1 * z0;
      signedArea += cross;
      cx += (x0 + x1) * cross;
      cz += (z0 + z1) * cross;
    }

    signedArea /= 2;
    const factor = 1 / (6 * signedArea);

    return [cx * factor, cz * factor] as [number, number];
  }, [node?.polygon]);

  const floorMaterial = useMemo(() => {
    if (!node?.color) {
      return null;
    }
    return createFloorMaterial(node.color);
  }, [node?.color]);

  const wallMaterial = useMemo(() => {
    if (!node?.color) {
      return null;
    }
    return createWallGradientMaterial(node.color);
  }, [node?.color]);

  const handlers = useNodeEvents(node, "zone");

  if (!(node && floorShape && wallGeometry && floorMaterial && wallMaterial)) {
    return null;
  }

  return (
    <group
      ref={ref}
      {...handlers}
      userData={{ labelPosition: [centroid[0], 1, centroid[1]] }}
    >
      <Html
        name="label"
        position={[centroid[0], 1, centroid[1]]}
        style={{ pointerEvents: "none" }}
        zIndexRange={[10, 0]}
      >
        <div
          id={`${node.id}-label`}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            transform: "translate3d(-50%, -50%, 0)",
            opacity: 0,
            transition: "opacity 0.3s ease-in-out",
          }}
        >
          <div
            style={{
              width: "max-content",
              color: "white",
              textShadow: `-1px -1px 0 ${node.color}, 1px -1px 0 ${node.color}, -1px 1px 0 ${node.color}, 1px 1px 0 ${node.color}`,
              textAlign: "center",
            }}
          >
            <span>{node.name}</span>
          </div>
          <div
            className="label-pin"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginTop: "2px",
              opacity: 0,
              transition: "opacity 0.5s ease-in-out",
            }}
          >
            <div
              style={{
                width: "2px",
                height: "40px",
                backgroundColor: node.color,
              }}
            />
            <div
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                backgroundColor: node.color,
                border: "1px solid white",
              }}
            />
          </div>
        </div>
      </Html>

      <mesh
        layers={ZONE_LAYER}
        material={floorMaterial}
        name="floor"
        position={[0, Y_OFFSET, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <shapeGeometry args={[floorShape]} />
      </mesh>

      <mesh
        geometry={wallGeometry}
        layers={ZONE_LAYER}
        material={wallMaterial}
        name="walls"
      />
    </group>
  );
};
