import {
  type CeilingNode,
  resolveLevelId,
  useScene,
} from "@openbeam/spatial-core";
import { useViewer } from "@openbeam/spatial-viewer";
import { useCallback } from "react";
import { PolygonEditor } from "../shared/polygon-editor";

interface CeilingHoleEditorProps {
  ceilingId: CeilingNode["id"];
  holeIndex: number;
}

export const CeilingHoleEditor: React.FC<CeilingHoleEditorProps> = ({
  ceilingId,
  holeIndex,
}) => {
  const ceilingNode = useScene((state) => state.nodes[ceilingId]);
  const updateNode = useScene((state) => state.updateNode);
  const setSelection = useViewer((state) => state.setSelection);

  const ceiling =
    ceilingNode?.type === "ceiling" ? (ceilingNode as CeilingNode) : null;
  const holes = ceiling?.holes || [];
  const hole = holes[holeIndex];

  const handlePolygonChange = useCallback(
    (newPolygon: [number, number][]) => {
      const updatedHoles = [...holes];
      updatedHoles[holeIndex] = newPolygon;
      updateNode(ceilingId, { holes: updatedHoles });
      setSelection({ selectedIds: [ceilingId] });
    },
    [ceilingId, holeIndex, holes, updateNode, setSelection]
  );

  if (!(ceiling && hole) || hole.length < 3) {
    return null;
  }

  return (
    <PolygonEditor
      color="#ef4444"
      levelId={resolveLevelId(ceiling, useScene.getState().nodes)}
      minVertices={3}
      onPolygonChange={handlePolygonChange}
      polygon={hole}
      surfaceHeight={ceiling.height ?? 2.5}
    />
  );
};
