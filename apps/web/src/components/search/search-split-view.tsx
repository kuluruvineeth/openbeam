"use client";

import type { ReactNode } from "react";
import { FilePreviewPanel } from "@/components/file-preview";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

type SearchSplitViewProps = {
  children: ReactNode;
  previewId: string | null;
  onClosePreview: () => void;
  highlightText?: string;
  chunkIndex?: number;
  pageNumber?: number;
};

export function SearchSplitView({
  children,
  previewId,
  onClosePreview,
  highlightText,
  chunkIndex,
  pageNumber,
}: SearchSplitViewProps) {
  const hasPreview = !!previewId;

  return (
    <ResizablePanelGroup className="h-full" direction="horizontal">
      <ResizablePanel defaultSize={hasPreview ? 50 : 100} minSize={30}>
        {children}
      </ResizablePanel>

      {hasPreview && (
        <>
          <ResizableHandle />
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="h-full border-border/50 border-l">
              <FilePreviewPanel
                chunkIndex={chunkIndex}
                documentId={previewId}
                highlightText={highlightText}
                onClose={onClosePreview}
                pageNumber={pageNumber}
              />
            </div>
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  );
}
