import type { Metadata } from "next";
import { SpatialEditorPage } from "@/features/spatial";

export const metadata: Metadata = {
  title: "Spatial Editor | OpenBeam",
  description: "Edit a 3D building layout",
};

export default async function SpatialScenePage({
  params,
}: {
  params: Promise<{ sceneId: string }>;
}) {
  const { sceneId } = await params;
  return <SpatialEditorPage sceneId={sceneId} />;
}
