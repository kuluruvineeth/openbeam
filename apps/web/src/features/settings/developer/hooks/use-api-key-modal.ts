"use client";

import { create } from "zustand";

type ModalType = "create" | "edit" | "revoke";

type ApiKeyData = {
  id: string;
  name: string;
  scopes: string[];
  prefix: string;
};

type ApiKeyModalState = {
  type: ModalType | null;
  data: ApiKeyData | null;
  createdKey: string | null;
  open: (type: ModalType, data?: ApiKeyData) => void;
  close: () => void;
  setCreatedKey: (key: string) => void;
};

export const useApiKeyModal = create<ApiKeyModalState>((set) => ({
  type: null,
  data: null,
  createdKey: null,
  open: (type, data) => set({ type, data: data ?? null, createdKey: null }),
  close: () => set({ type: null, data: null, createdKey: null }),
  setCreatedKey: (key) => set({ createdKey: key }),
}));

export type { ModalType, ApiKeyData, ApiKeyModalState };
