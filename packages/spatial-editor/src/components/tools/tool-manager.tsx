import {
  type AnyNodeId,
  type CeilingNode,
  type SlabNode,
  useScene,
} from "@openbeam/spatial-core";
import { useViewer } from "@openbeam/spatial-viewer";
import useEditor, { type Phase, type Tool } from "../../store/use-editor";
import { CeilingBoundaryEditor } from "./ceiling/ceiling-boundary-editor";
import { CeilingHoleEditor } from "./ceiling/ceiling-hole-editor";
import { CeilingTool } from "./ceiling/ceiling-tool";
import { DoorTool } from "./door/door-tool";
import { ItemTool } from "./item/item-tool";
import { MoveTool } from "./item/move-tool";
import { RoofTool } from "./roof/roof-tool";
import { SiteBoundaryEditor } from "./site/site-boundary-editor";
import { SlabBoundaryEditor } from "./slab/slab-boundary-editor";
import { SlabHoleEditor } from "./slab/slab-hole-editor";
import { SlabTool } from "./slab/slab-tool";
import { WallTool } from "./wall/wall-tool";
import { WindowTool } from "./window/window-tool";
import { ZoneBoundaryEditor } from "./zone/zone-boundary-editor";
import { ZoneTool } from "./zone/zone-tool";

const tools: Record<Phase, Partial<Record<Tool, React.FC>>> = {
  site: {
    "property-line": SiteBoundaryEditor,
  },
  structure: {
    wall: WallTool,
    slab: SlabTool,
    ceiling: CeilingTool,
    roof: RoofTool,
    door: DoorTool,
    item: ItemTool,
    zone: ZoneTool,
    window: WindowTool,
  },
  furnish: {
    item: ItemTool,
  },
};

export const ToolManager: React.FC = () => {
  const phase = useEditor((state) => state.phase);
  const mode = useEditor((state) => state.mode);
  const tool = useEditor((state) => state.tool);
  const movingNode = useEditor((state) => state.movingNode);
  const editingHole = useEditor((state) => state.editingHole);
  const selectedZoneId = useViewer((state) => state.selection.zoneId);
  const selectedIds = useViewer((state) => state.selection.selectedIds);
  const nodes = useScene((state) => state.nodes);

  const selectedSlabId = selectedIds.find(
    (id) => nodes[id as AnyNodeId]?.type === "slab"
  ) as SlabNode["id"] | undefined;

  const selectedCeilingId = selectedIds.find(
    (id) => nodes[id as AnyNodeId]?.type === "ceiling"
  ) as CeilingNode["id"] | undefined;

  const showSiteBoundaryEditor = phase === "site" && mode === "edit";

  const showSlabBoundaryEditor =
    phase === "structure" &&
    mode === "select" &&
    selectedSlabId !== undefined &&
    (!editingHole || editingHole.nodeId !== selectedSlabId);

  const showSlabHoleEditor =
    selectedSlabId !== undefined &&
    editingHole !== null &&
    editingHole.nodeId === selectedSlabId;

  const showCeilingBoundaryEditor =
    phase === "structure" &&
    mode === "select" &&
    selectedCeilingId !== undefined &&
    (!editingHole || editingHole.nodeId !== selectedCeilingId);

  const showCeilingHoleEditor =
    selectedCeilingId !== undefined &&
    editingHole !== null &&
    editingHole.nodeId === selectedCeilingId;

  const showZoneBoundaryEditor =
    phase === "structure" &&
    mode === "select" &&
    selectedZoneId !== null &&
    !showSlabBoundaryEditor &&
    !showCeilingBoundaryEditor;

  const showBuildTool = mode === "build" && tool !== null;

  const BuildToolComponent = showBuildTool ? tools[phase]?.[tool] : null;

  return (
    <>
      {showSiteBoundaryEditor && <SiteBoundaryEditor />}
      {showZoneBoundaryEditor && selectedZoneId && (
        <ZoneBoundaryEditor zoneId={selectedZoneId} />
      )}
      {showSlabBoundaryEditor && selectedSlabId && (
        <SlabBoundaryEditor slabId={selectedSlabId} />
      )}
      {showSlabHoleEditor && selectedSlabId && editingHole && (
        <SlabHoleEditor
          holeIndex={editingHole.holeIndex}
          slabId={selectedSlabId}
        />
      )}
      {showCeilingBoundaryEditor && selectedCeilingId && (
        <CeilingBoundaryEditor ceilingId={selectedCeilingId} />
      )}
      {showCeilingHoleEditor && selectedCeilingId && editingHole && (
        <CeilingHoleEditor
          ceilingId={selectedCeilingId}
          holeIndex={editingHole.holeIndex}
        />
      )}
      {movingNode && <MoveTool />}
      {!movingNode && BuildToolComponent && <BuildToolComponent />}
    </>
  );
};
