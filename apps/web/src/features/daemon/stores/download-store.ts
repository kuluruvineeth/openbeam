"use client";

import { create } from "zustand";

interface DownloadProgress {
  percent: number;
  bytesWritten: number;
  totalBytes: number;
  speed: number;
  eta: number;
}

export interface Download {
  id: string;
  serverId: string;
  agentId: string;
  fileName: string;
  status: "downloading" | "complete" | "error";
  message?: string;
  progress?: DownloadProgress;
  startedAt: number;
}

interface DownloadState {
  downloads: Map<string, Download>;
  activeDownloadId: string | null;

  startDownload: (params: {
    serverId: string;
    agentId: string;
    fileName: string;
    downloadUrl: string;
  }) => void;
  updateProgress: (id: string, progress: DownloadProgress) => void;
  completeDownload: (id: string) => void;
  failDownload: (id: string, message: string) => void;
  dismissDownload: (id: string) => void;
  dismissAllCompleted: () => void;
}

function generateDownloadId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function findMostRecentDownloadId(
  downloads: Map<string, Download>
): string | null {
  let mostRecent: Download | null = null;
  for (const download of downloads.values()) {
    if (!mostRecent || download.startedAt > mostRecent.startedAt) {
      mostRecent = download;
    }
  }
  return mostRecent?.id ?? null;
}

function triggerBrowserDownload(url: string, fileName: string) {
  if (typeof document === "undefined") {
    return;
  }
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export const useDownloadStore = create<DownloadState>()((set, get) => ({
  downloads: new Map(),
  activeDownloadId: null,

  startDownload: ({ serverId, agentId, fileName, downloadUrl }) => {
    const id = generateDownloadId();
    const download: Download = {
      id,
      serverId,
      agentId,
      fileName,
      status: "downloading",
      startedAt: Date.now(),
    };

    set((state) => ({
      downloads: new Map(state.downloads).set(id, download),
      activeDownloadId: id,
    }));

    try {
      triggerBrowserDownload(downloadUrl, fileName);
      get().completeDownload(id);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to download file.";
      get().failDownload(id, message);
    }
  },

  updateProgress: (id, progress) => {
    set((state) => {
      const download = state.downloads.get(id);
      if (!download || download.status !== "downloading") {
        return state;
      }
      const updated = new Map(state.downloads);
      updated.set(id, { ...download, progress });
      return { downloads: updated };
    });
  },

  completeDownload: (id) => {
    set((state) => {
      const download = state.downloads.get(id);
      if (!download) {
        return state;
      }
      const updated = new Map(state.downloads);
      updated.set(id, { ...download, status: "complete" });
      return { downloads: updated };
    });
  },

  failDownload: (id, message) => {
    set((state) => {
      const download = state.downloads.get(id);
      if (!download) {
        return state;
      }
      const updated = new Map(state.downloads);
      updated.set(id, { ...download, status: "error", message });
      return { downloads: updated };
    });
  },

  dismissDownload: (id) => {
    set((state) => {
      const updated = new Map(state.downloads);
      updated.delete(id);
      const newActiveId =
        state.activeDownloadId === id
          ? findMostRecentDownloadId(updated)
          : state.activeDownloadId;
      return { downloads: updated, activeDownloadId: newActiveId };
    });
  },

  dismissAllCompleted: () => {
    set((state) => {
      const updated = new Map(state.downloads);
      for (const [id, download] of updated) {
        if (download.status !== "downloading") {
          updated.delete(id);
        }
      }
      let newActiveId: string | null = null;
      if (state.activeDownloadId) {
        newActiveId = updated.has(state.activeDownloadId)
          ? state.activeDownloadId
          : findMostRecentDownloadId(updated);
      }
      return { downloads: updated, activeDownloadId: newActiveId };
    });
  },
}));

export function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond < 1024) {
    return `${Math.round(bytesPerSecond)} B/s`;
  }
  if (bytesPerSecond < 1024 * 1024) {
    return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
  }
  return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
}

export function formatEta(seconds: number): string {
  if (seconds < 1) {
    return "< 1s";
  }
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}
