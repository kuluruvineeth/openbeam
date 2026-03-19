import type { Metadata } from "next";
import { SpatialEditorPage } from "@/features/spatial";

export const metadata: Metadata = {
  title: "Spatial Editor | OpenBeam",
  description: "Design and visualize 3D building layouts",
};

export default function SpatialPage() {
  return <SpatialEditorPage />;
}
