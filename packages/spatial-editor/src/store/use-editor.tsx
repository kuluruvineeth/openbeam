"use client";

import type { AssetInput } from "@openbeam/spatial-core";
import {
  type BuildingNode,
  type DoorNode,
  type ItemNode,
  type LevelNode,
  type Space,
  useScene,
  type WindowNode,
} from "@openbeam/spatial-core";
import { useViewer } from "@openbeam/spatial-viewer";
import { create } from "zustand";

export type Phase = "site" | "structure" | "furnish";

export type Mode = "select" | "edit" | "delete" | "build";

export type StructureTool =
  | "wall"
  | "room"
  | "custom-room"
  | "slab"
  | "ceiling"
  | "roof"
  | "column"
  | "stair"
  | "item"
  | "zone"
  | "window"
  | "door";

export type FurnishTool = "item";

export type SiteTool = "property-line";

export type CatalogCategory =
  | "furniture"
  | "appliance"
  | "bathroom"
  | "kitchen"
  | "outdoor"
  | "window"
  | "door";

export type StructureLayer = "zones" | "elements";

export type Tool = SiteTool | StructureTool | FurnishTool;

type EditorState = {
  phase: Phase;
  setPhase: (phase: Phase) => void;
  mode: Mode;
  setMode: (mode: Mode) => void;
  tool: Tool | null;
  setTool: (tool: Tool | null) => void;
  structureLayer: StructureLayer;
  setStructureLayer: (layer: StructureLayer) => void;
  catalogCategory: CatalogCategory | null;
  setCatalogCategory: (category: CatalogCategory | null) => void;
  selectedItem: AssetInput | null;
  setSelectedItem: (item: AssetInput) => void;
  movingNode: ItemNode | WindowNode | DoorNode | null;
  setMovingNode: (node: ItemNode | WindowNode | DoorNode | null) => void;
  selectedReferenceId: string | null;
  setSelectedReferenceId: (id: string | null) => void;
  spaces: Record<string, Space>;
  setSpaces: (spaces: Record<string, Space>) => void;
  editingHole: { nodeId: string; holeIndex: number } | null;
  setEditingHole: (hole: { nodeId: string; holeIndex: number } | null) => void;
  isPreviewMode: boolean;
  setPreviewMode: (preview: boolean) => void;
};

const useEditor = create<EditorState>()((set, get) => ({
  phase: "site",
  setPhase: (phase) => {
    const currentPhase = get().phase;
    if (currentPhase === phase) {
      return;
    }

    set({ phase });

    const { mode, structureLayer } = get();

    if (mode === "build") {
      if (phase === "site") {
        set({ tool: "property-line", catalogCategory: null });
      } else if (phase === "structure" && structureLayer === "zones") {
        set({ tool: "zone", catalogCategory: null });
      } else if (phase === "structure") {
        set({ tool: "wall", catalogCategory: null });
      } else if (phase === "furnish") {
        set({ tool: "item", catalogCategory: "furniture" });
      }
    } else {
      set({ mode: "select", tool: null, catalogCategory: null });
    }

    const viewer = useViewer.getState();
    const scene = useScene.getState();

    const selectBuildingAndLevel0 = () => {
      let buildingId = viewer.selection.buildingId;

      if (!buildingId) {
        const siteNode = scene.rootNodeIds[0]
          ? scene.nodes[scene.rootNodeIds[0]]
          : null;
        if (siteNode?.type === "site") {
          const firstBuilding = siteNode.children
            .map((child) =>
              typeof child === "string" ? scene.nodes[child] : child
            )
            .find((node) => node?.type === "building");
          if (firstBuilding) {
            buildingId = firstBuilding.id as BuildingNode["id"];
            viewer.setSelection({ buildingId });
          }
        }
      }

      if (buildingId && !viewer.selection.levelId) {
        const buildingNode = scene.nodes[buildingId] as BuildingNode;
        const level0Id = buildingNode.children.find((childId) => {
          const levelNode = scene.nodes[childId] as LevelNode;
          return levelNode?.type === "level" && levelNode.level === 0;
        });
        if (level0Id) {
          viewer.setSelection({ levelId: level0Id as LevelNode["id"] });
        } else if (buildingNode.children[0]) {
          viewer.setSelection({
            levelId: buildingNode.children[0] as LevelNode["id"],
          });
        }
      }
    };

    // biome-ignore lint/style/useDefaultSwitchClause: acceptable
    switch (phase) {
      case "site":
        viewer.resetSelection();
        break;

      case "structure":
        selectBuildingAndLevel0();
        break;

      case "furnish":
        selectBuildingAndLevel0();
        set({ structureLayer: "elements" });
        break;
    }
  },
  mode: "select",
  setMode: (mode) => {
    set({ mode });

    const { phase, structureLayer, tool } = get();

    if (mode === "build") {
      const viewer = useViewer.getState();
      viewer.setSelection({
        selectedIds: [],
        zoneId: null,
      });

      if (!tool) {
        if (phase === "structure" && structureLayer === "zones") {
          set({ tool: "zone" });
        } else if (phase === "structure" && structureLayer === "elements") {
          set({ tool: "wall" });
        } else if (phase === "furnish") {
          set({ tool: "item", catalogCategory: "furniture" });
        }
      }
    } else if (tool) {
      set({ tool: null });
    }
  },
  tool: null,
  setTool: (tool) => set({ tool }),
  structureLayer: "elements",
  setStructureLayer: (layer) => {
    const { mode } = get();

    if (mode === "build") {
      const tool = layer === "zones" ? "zone" : "wall";
      set({ structureLayer: layer, tool });
    } else {
      set({ structureLayer: layer, mode: "select", tool: null });
    }

    const viewer = useViewer.getState();
    viewer.setSelection({
      selectedIds: [],
      zoneId: null,
    });
  },
  catalogCategory: null,
  setCatalogCategory: (category) => set({ catalogCategory: category }),
  selectedItem: null,
  setSelectedItem: (item) => set({ selectedItem: item }),
  movingNode: null as ItemNode | WindowNode | DoorNode | null,
  setMovingNode: (node) => set({ movingNode: node }),
  selectedReferenceId: null,
  setSelectedReferenceId: (id) => set({ selectedReferenceId: id }),
  spaces: {},
  setSpaces: (spaces) => set({ spaces }),
  editingHole: null,
  setEditingHole: (hole) => set({ editingHole: hole }),
  isPreviewMode: false,
  setPreviewMode: (preview) => {
    if (preview) {
      set({
        isPreviewMode: true,
        mode: "select",
        tool: null,
        catalogCategory: null,
      });
      useViewer.getState().setSelection({ selectedIds: [], zoneId: null });
    } else {
      set({ isPreviewMode: false });
    }
  },
}));

export default useEditor;
