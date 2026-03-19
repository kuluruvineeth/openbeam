"use client";

import dynamic from "next/dynamic";
import { useSpatialPersistence } from "../hooks/use-spatial-persistence";

const Editor = dynamic(
  () =>
    import("@openbeam/spatial-editor").then((m) => ({
      default: m.Editor,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    ),
  }
);

interface SpatialEditorPageProps {
  sceneId?: string;
}

export function SpatialEditorPage({ sceneId }: SpatialEditorPageProps) {
  const { loadScene, saveScene, isLoading } = useSpatialPersistence(sceneId);

  return (
    <div className="h-[calc(100vh-3rem)] w-full">
      <Editor isLoading={isLoading} onLoad={loadScene} onSave={saveScene} />
    </div>
  );
}
