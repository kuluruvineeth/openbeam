"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { analytics } from "@/lib/analytics";

interface YouTubeEmbedProps {
  videoId: string;
  version: string;
}

export function YouTubeEmbed({ videoId, version }: YouTubeEmbedProps) {
  const [playing, setPlaying] = useState(false);

  const play = useCallback(() => {
    setPlaying(true);
    analytics.changelogVideoPlayed(version);
  }, [version]);

  if (playing) {
    return (
      <div className="aspect-video overflow-hidden rounded-sm border border-border/50">
        <iframe
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
          title="Release video"
        />
      </div>
    );
  }

  return (
    <button
      className="group relative aspect-video w-full overflow-hidden rounded-sm border border-border/50 bg-black"
      onClick={play}
      type="button"
    >
      <Image
        alt="Video thumbnail"
        className="h-full w-full object-cover opacity-80 transition-opacity duration-200 group-hover:opacity-100"
        fill
        sizes="(max-width: 768px) 100vw, 768px"
        src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 transition-transform duration-200 group-hover:scale-110">
          <svg
            aria-hidden="true"
            className="ml-1 h-6 w-6 text-black"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <title>Play</title>
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </button>
  );
}
