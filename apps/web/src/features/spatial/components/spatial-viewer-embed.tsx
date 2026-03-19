"use client";

import dynamic from "next/dynamic";

const Viewer = dynamic(
  () =>
    import("@openbeam/spatial-viewer").then((m) => ({
      default: m.Viewer,
    })),
  { ssr: false }
);

interface SpatialViewerEmbedProps {
  height?: string;
}

export function SpatialViewerEmbed({
  height = "400px",
}: SpatialViewerEmbedProps) {
  return (
    <div style={{ height, width: "100%" }}>
      <Viewer />
    </div>
  );
}
