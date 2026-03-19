import { type AnyNodeId, useScene } from "@openbeam/spatial-core";
import { useViewer } from "@openbeam/spatial-viewer";
import { useMemo } from "react";
import useEditor, { type StructureTool } from "../store/use-editor";

export function useContextualTools() {
  const selection = useViewer((s) => s.selection);
  const nodes = useScene((s) => s.nodes);
  const structureLayer = useEditor((s) => s.structureLayer);

  return useMemo(() => {
    if (structureLayer === "zones") {
      return ["zone"] as StructureTool[];
    }

    const defaultTools: StructureTool[] = [
      "wall",
      "slab",
      "ceiling",
      "roof",
      "door",
      "window",
    ];

    if (selection.selectedIds.length === 0) {
      return defaultTools;
    }

    const selectedTypes = new Set(
      selection.selectedIds
        .map((id) => nodes[id as AnyNodeId]?.type)
        .filter(Boolean)
    );

    if (selectedTypes.has("wall")) {
      return ["window", "door", "wall"] as StructureTool[];
    }

    if (selectedTypes.has("slab")) {
      return ["slab", "wall"] as StructureTool[];
    }

    if (selectedTypes.has("ceiling")) {
      return ["ceiling"] as StructureTool[];
    }

    if (selectedTypes.has("roof")) {
      return ["roof"] as StructureTool[];
    }

    return defaultTools;
  }, [selection.selectedIds, nodes, structureLayer]);
}
