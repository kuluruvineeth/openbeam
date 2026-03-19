import {
  resolveLevelId,
  type SlabNode,
  useScene,
} from "@openbeam/spatial-core";
import { useViewer } from "@openbeam/spatial-viewer";
import { useCallback } from "react";
import { PolygonEditor } from "../shared/polygon-editor";

interface SlabHoleEditorProps {
  slabId: SlabNode["id"];
  holeIndex: number;
}

export const SlabHoleEditor: React.FC<SlabHoleEditorProps> = ({
  slabId,
  holeIndex,
}) => {
  const slabNode = useScene((state) => state.nodes[slabId]);
  const updateNode = useScene((state) => state.updateNode);
  const setSelection = useViewer((state) => state.setSelection);

  const slab = slabNode?.type === "slab" ? (slabNode as SlabNode) : null;
  const holes = slab?.holes || [];
  const hole = holes[holeIndex];

  const handlePolygonChange = useCallback(
    (newPolygon: [number, number][]) => {
      const updatedHoles = [...holes];
      updatedHoles[holeIndex] = newPolygon;
      updateNode(slabId, { holes: updatedHoles });
      setSelection({ selectedIds: [slabId] });
    },
    [slabId, holeIndex, holes, updateNode, setSelection]
  );

  if (!(slab && hole) || hole.length < 3) {
    return null;
  }

  return (
    <PolygonEditor
      color="#ef4444"
      levelId={resolveLevelId(slab, useScene.getState().nodes)}
      minVertices={3}
      onPolygonChange={handlePolygonChange}
      polygon={hole}
      surfaceHeight={slab.elevation ?? 0.05}
    />
  );
};
