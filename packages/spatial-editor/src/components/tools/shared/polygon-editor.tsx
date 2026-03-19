import { emitter, type GridEvent, sceneRegistry } from "@openbeam/spatial-core";
import { createPortal } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BufferGeometry, Float32BufferAttribute, type Line } from "three";
import { EDITOR_LAYER } from "../../../lib/constants";
import { sfxEmitter } from "../../../lib/sfx-bus";

const Y_OFFSET = 0.02;

type DragState = {
  isDragging: boolean;
  vertexIndex: number;
  initialPosition: [number, number];
  pointerId: number;
};

export interface PolygonEditorProps {
  polygon: [number, number][];
  color?: string;
  onPolygonChange: (polygon: [number, number][]) => void;
  minVertices?: number;
  levelId?: string;
  surfaceHeight?: number;
}

const MIN_HANDLE_HEIGHT = 0.15;

export const PolygonEditor: React.FC<PolygonEditorProps> = ({
  polygon,
  color = "#3b82f6",
  onPolygonChange,
  minVertices = 3,
  levelId,
  surfaceHeight = 0,
}) => {
  const levelNode = levelId ? sceneRegistry.nodes.get(levelId) : null;

  const editY = levelNode ? Y_OFFSET : 0;

  const [dragState, setDragState] = useState<DragState | null>(null);
  const [previewPolygon, setPreviewPolygon] = useState<
    [number, number][] | null
  >(null);
  const previewPolygonRef = useRef<[number, number][] | null>(null);

  useEffect(() => {
    previewPolygonRef.current = previewPolygon;
  }, [previewPolygon]);

  const [hoveredVertex, setHoveredVertex] = useState<number | null>(null);
  const [hoveredMidpoint, setHoveredMidpoint] = useState<number | null>(null);
  const [_cursorPosition, setCursorPosition] = useState<[number, number]>([
    0, 0,
  ]);

  // biome-ignore lint/style/noNonNullAssertion: geometry access
  const lineRef = useRef<Line>(null!);
  const previousPositionRef = useRef<[number, number] | null>(null);

  const lastPolygonRef = useRef(polygon);
  if (polygon !== lastPolygonRef.current) {
    lastPolygonRef.current = polygon;
    if (previewPolygon) {
      setPreviewPolygon(null);
    }
    if (dragState) {
      setDragState(null);
    }
  }

  const displayPolygon = previewPolygon ?? polygon;

  const midpoints = useMemo(() => {
    if (displayPolygon.length < 2) {
      return [];
    }
    return displayPolygon.map(([x1, z1], index) => {
      const nextIndex = (index + 1) % displayPolygon.length;
      // biome-ignore lint/style/noNonNullAssertion: geometry access
      const [x2, z2] = displayPolygon[nextIndex]!;
      // biome-ignore lint/style/noNonNullAssertion: geometry access
      return [(x1! + x2) / 2, (z1! + z2) / 2] as [number, number];
    });
  }, [displayPolygon]);

  const handleVertexDrag = useCallback(
    (vertexIndex: number, position: [number, number]) => {
      setPreviewPolygon((prev) => {
        const basePolygon = prev ?? polygon;
        const newPolygon = [...basePolygon];
        newPolygon[vertexIndex] = position;
        return newPolygon;
      });
    },
    [polygon]
  );

  const commitPolygonChange = useCallback(() => {
    if (previewPolygonRef.current) {
      onPolygonChange(previewPolygonRef.current);
    }
    setPreviewPolygon(null);
    setDragState(null);
  }, [onPolygonChange]);

  const handleAddVertex = useCallback(
    (afterIndex: number, position: [number, number]) => {
      const basePolygon = previewPolygon ?? polygon;
      const newPolygon = [
        ...basePolygon.slice(0, afterIndex + 1),
        position,
        ...basePolygon.slice(afterIndex + 1),
      ];

      setPreviewPolygon(newPolygon);
      return afterIndex + 1;
    },
    [polygon, previewPolygon]
  );

  const handleDeleteVertex = useCallback(
    (index: number) => {
      const basePolygon = previewPolygon ?? polygon;
      if (basePolygon.length <= minVertices) {
        return;
      }

      const newPolygon = basePolygon.filter((_, i) => i !== index);
      onPolygonChange(newPolygon);
      setPreviewPolygon(null);
    },
    [polygon, previewPolygon, onPolygonChange, minVertices]
  );

  useEffect(() => {
    const onGridMove = (event: GridEvent) => {
      const gridX = Math.round(event.position[0] * 2) / 2;
      const gridZ = Math.round(event.position[2] * 2) / 2;
      const newPosition: [number, number] = [gridX, gridZ];

      if (
        dragState?.isDragging &&
        previousPositionRef.current &&
        (newPosition[0] !== previousPositionRef.current[0] ||
          newPosition[1] !== previousPositionRef.current[1])
      ) {
        sfxEmitter.emit("sfx:grid-snap");
      }

      previousPositionRef.current = newPosition;
      setCursorPosition(newPosition);

      if (dragState?.isDragging) {
        handleVertexDrag(dragState.vertexIndex, newPosition);
      }
    };

    emitter.on("grid:move", onGridMove);
    return () => {
      emitter.off("grid:move", onGridMove);
    };
  }, [dragState, handleVertexDrag]);

  useEffect(() => {
    if (!dragState?.isDragging) {
      return;
    }

    const handlePointerUp = (e: PointerEvent | MouseEvent) => {
      if (
        "pointerId" in e &&
        dragState.pointerId !== undefined &&
        e.pointerId !== dragState.pointerId
      ) {
        return;
      }

      e.stopImmediatePropagation();
      e.preventDefault();

      const suppressClick = (ce: MouseEvent) => {
        ce.stopImmediatePropagation();
        ce.preventDefault();
        window.removeEventListener("click", suppressClick, true);
      };
      window.addEventListener("click", suppressClick, true);

      requestAnimationFrame(() => {
        window.removeEventListener("click", suppressClick, true);
      });

      commitPolygonChange();
    };

    window.addEventListener(
      "pointerup",
      handlePointerUp as EventListener,
      true
    );
    window.addEventListener(
      "pointercancel",
      handlePointerUp as EventListener,
      true
    );
    return () => {
      window.removeEventListener(
        "pointerup",
        handlePointerUp as EventListener,
        true
      );
      window.removeEventListener(
        "pointercancel",
        handlePointerUp as EventListener,
        true
      );
    };
  }, [dragState, commitPolygonChange]);

  useEffect(() => {
    if (!lineRef.current || displayPolygon.length < 2) {
      return;
    }

    const positions: number[] = [];
    for (const [x, z] of displayPolygon) {
      // biome-ignore lint/style/noNonNullAssertion: geometry access
      positions.push(x!, editY + 0.01, z!);
    }
    // biome-ignore lint/style/noNonNullAssertion: geometry access
    const first = displayPolygon[0]!;
    // biome-ignore lint/style/noNonNullAssertion: geometry access
    positions.push(first[0]!, editY + 0.01, first[1]!);

    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));

    lineRef.current.geometry.dispose();
    lineRef.current.geometry = geometry;
  }, [displayPolygon, editY]);

  if (displayPolygon.length < minVertices) {
    return null;
  }

  const canDelete = displayPolygon.length > minVertices;

  const editorContent = (
    <group>
      <threeLine
        frustumCulled={false}
        layers={EDITOR_LAYER}
        raycast={Function.prototype as () => void}
        ref={lineRef}
        renderOrder={10}
      >
        <bufferGeometry />
        <lineBasicNodeMaterial
          color={color}
          depthTest={false}
          depthWrite={false}
          linewidth={2}
          opacity={0.8}
          transparent
        />
      </threeLine>

      {displayPolygon.map(([x, z], index) => {
        const isHovered = hoveredVertex === index;
        const isDragging = dragState?.vertexIndex === index;
        const radius = 0.1;
        const height = Math.max(MIN_HANDLE_HEIGHT, surfaceHeight + 0.02);

        return (
          // biome-ignore lint/a11y/noStaticElementInteractions: R3F mesh element
          <mesh
            castShadow
            // biome-ignore lint/suspicious/noArrayIndexKey: static list
            key={`vertex-${index}`}
            layers={EDITOR_LAYER}
            onClick={(e) => {
              if (e.button !== 0) {
                return;
              }
              e.stopPropagation();
            }}
            onDoubleClick={(e) => {
              if (e.button !== 0) {
                return;
              }
              e.stopPropagation();
              if (canDelete) {
                handleDeleteVertex(index);
              }
            }}
            onPointerDown={(e) => {
              if (e.button !== 0) {
                return;
              }
              e.stopPropagation();
              setDragState({
                isDragging: true,
                vertexIndex: index,
                // biome-ignore lint/style/noNonNullAssertion: geometry access
                initialPosition: [x!, z!],
                pointerId: e.pointerId,
              });
            }}
            onPointerEnter={(e) => {
              e.stopPropagation();
              setHoveredVertex(index);
            }}
            onPointerLeave={(e) => {
              e.stopPropagation();
              setHoveredVertex(null);
            }}
            // biome-ignore lint/style/noNonNullAssertion: geometry access
            position={[x!, editY + height / 2, z!]}
          >
            <cylinderGeometry args={[radius, radius, height, 16]} />
            <meshStandardMaterial
              // biome-ignore lint/style/noNestedTernary: acceptable
              color={isDragging ? "#22c55e" : isHovered ? "#60a5fa" : "#3b82f6"}
            />
          </mesh>
        );
      })}

      {!dragState &&
        midpoints.map(([x, z], index) => {
          const isHovered = hoveredMidpoint === index;
          const radius = 0.06;
          const height = Math.max(MIN_HANDLE_HEIGHT, surfaceHeight + 0.02);

          return (
            // biome-ignore lint/a11y/noStaticElementInteractions: R3F mesh element
            <mesh
              // biome-ignore lint/suspicious/noArrayIndexKey: static list
              key={`midpoint-${index}`}
              layers={EDITOR_LAYER}
              onClick={(e) => {
                if (e.button !== 0) {
                  return;
                }
                e.stopPropagation();
              }}
              onPointerDown={(e) => {
                if (e.button !== 0) {
                  return;
                }
                e.stopPropagation();
                // biome-ignore lint/style/noNonNullAssertion: geometry access
                const newVertexIndex = handleAddVertex(index, [x!, z!]);
                if (newVertexIndex >= 0) {
                  setDragState({
                    isDragging: true,
                    vertexIndex: newVertexIndex,
                    // biome-ignore lint/style/noNonNullAssertion: geometry access
                    initialPosition: [x!, z!],
                    pointerId: e.pointerId,
                  });
                  setHoveredMidpoint(null);
                }
              }}
              onPointerEnter={(e) => {
                e.stopPropagation();
                setHoveredMidpoint(index);
              }}
              onPointerLeave={(e) => {
                e.stopPropagation();
                setHoveredMidpoint(null);
              }}
              // biome-ignore lint/style/noNonNullAssertion: geometry access
              position={[x!, editY + height / 2, z!]}
            >
              <cylinderGeometry args={[radius, radius, height, 16]} />
              <meshStandardMaterial
                color={isHovered ? "#4ade80" : "#22c55e"}
                opacity={isHovered ? 1 : 0.7}
                transparent
              />
            </mesh>
          );
        })}
    </group>
  );

  return levelNode ? createPortal(editorContent, levelNode) : editorContent;
};
