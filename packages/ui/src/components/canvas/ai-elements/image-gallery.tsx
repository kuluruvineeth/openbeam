"use client";

import type { GeneratedImage } from "@openplane/types/canvas";
import { forwardRef, memo, useCallback, useState } from "react";
import { cn } from "../../../utils";
import { Button } from "../../button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "../../dialog";
import { Icons } from "../../icons";
import { ScrollArea } from "../../scroll-area";
import { Skeleton } from "../../skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../tooltip";

export interface ImageGalleryProps {
  images: GeneratedImage[];
  isLoading?: boolean;
  generatingCount?: number;
  columns?: 1 | 2 | 3 | 4;
  onImageSelect?: (image: GeneratedImage) => void;
  onDownload?: (image: GeneratedImage) => void;
  onVariation?: (image: GeneratedImage) => void;
  className?: string;
}

export const ImageGallery = memo(
  forwardRef<HTMLDivElement, ImageGalleryProps>(function ImageGalleryComponent(
    {
      images,
      isLoading = false,
      generatingCount = 0,
      columns = 2,
      onImageSelect,
      onDownload,
      onVariation,
      className,
    },
    ref
  ) {
    const [, setSelectedImage] = useState<GeneratedImage | null>(null);

    const handleDownload = useCallback(
      async (image: GeneratedImage, e: React.MouseEvent) => {
        e.stopPropagation();
        if (onDownload) {
          onDownload(image);
          return;
        }

        const response = await fetch(image.url);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `image-${image.id}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      },
      [onDownload]
    );

    const handleVariation = useCallback(
      (image: GeneratedImage, e: React.MouseEvent) => {
        e.stopPropagation();
        onVariation?.(image);
      },
      [onVariation]
    );

    if (isLoading) {
      return (
        <div
          className={cn(
            "grid gap-2",
            columns === 1 && "grid-cols-1",
            columns === 2 && "grid-cols-2",
            columns === 3 && "grid-cols-3",
            columns === 4 && "grid-cols-4",
            className
          )}
          ref={ref}
        >
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton
              className="aspect-square rounded-md"
              key={`skeleton-${i.toString()}`}
            />
          ))}
        </div>
      );
    }

    if (images.length === 0) {
      return (
        <div
          className={cn(
            "flex flex-col items-center justify-center rounded-md border border-dashed bg-muted/30 p-6",
            className
          )}
          ref={ref}
        >
          <Icons.ImageIcon
            className="mb-2 text-muted-foreground/50"
            size={32}
          />
          <span className="text-muted-foreground text-sm">
            No images generated yet
          </span>
        </div>
      );
    }

    return (
      <div
        className={cn(
          "grid gap-2",
          columns === 1 && "grid-cols-1",
          columns === 2 && "grid-cols-2",
          columns === 3 && "grid-cols-3",
          columns === 4 && "grid-cols-4",
          className
        )}
        ref={ref}
      >
        {images.map((image) => (
          <Dialog key={image.id}>
            <DialogTrigger asChild>
              <button
                className="group relative aspect-square overflow-hidden rounded-md border bg-muted transition-all hover:ring-2 hover:ring-primary/50"
                onClick={() => {
                  setSelectedImage(image);
                  onImageSelect?.(image);
                }}
                type="button"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- AI-generated images with dynamic URLs */}
                {/* biome-ignore lint/performance/noImgElement: AI-generated images with dynamic URLs */}
                <img
                  alt={image.revisedPrompt ?? "Generated image"}
                  className="size-full object-cover"
                  height={256}
                  loading="lazy"
                  src={image.url}
                  width={256}
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <Icons.Expand className="text-white" size={20} />
                </div>
                <div className="absolute right-0 bottom-0 left-0 flex justify-center gap-1 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        className="size-6"
                        onClick={(e) => handleDownload(image, e)}
                        size="icon"
                        variant="secondary"
                      >
                        <Icons.Download size={12} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Download</TooltipContent>
                  </Tooltip>
                  {onVariation && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          className="size-6"
                          onClick={(e) => handleVariation(image, e)}
                          size="icon"
                          variant="secondary"
                        >
                          <Icons.Wand size={12} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        Create variation
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl p-0">
              <DialogTitle className="sr-only">Image Preview</DialogTitle>
              <DialogDescription className="sr-only">
                Full size preview of the generated image
              </DialogDescription>
              <ScrollArea className="max-h-[80vh]">
                {/* eslint-disable-next-line @next/next/no-img-element -- AI-generated images with dynamic URLs */}
                {/* biome-ignore lint/performance/noImgElement: AI-generated images with dynamic URLs */}
                <img
                  alt={image.revisedPrompt ?? "Generated image"}
                  className="w-full"
                  height={1024}
                  src={image.url}
                  width={1024}
                />
                {image.revisedPrompt && (
                  <div className="border-t p-4">
                    <p className="text-muted-foreground text-sm">
                      <span className="font-medium">Prompt:</span>{" "}
                      {image.revisedPrompt}
                    </p>
                  </div>
                )}
              </ScrollArea>
            </DialogContent>
          </Dialog>
        ))}
        {generatingCount > 0 &&
          Array.from({ length: generatingCount }).map((_, i) => (
            <div
              className="relative aspect-square overflow-hidden rounded-md border bg-muted"
              key={`generating-${i.toString()}`}
            >
              <div className="shimmer absolute inset-0 bg-gradient-to-r from-transparent via-muted-foreground/10 to-transparent" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <div className="relative">
                  <Icons.Wand
                    className="animate-pulse text-muted-foreground/50"
                    size={24}
                  />
                </div>
                <span className="text-muted-foreground/50 text-xs">
                  Generating...
                </span>
              </div>
            </div>
          ))}
      </div>
    );
  })
);

ImageGallery.displayName = "ImageGallery";
