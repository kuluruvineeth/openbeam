"use client";

import { create } from "zustand";

type OAuthAppModalState = {
  sheetType: "create" | "edit" | null;
  deleteAppId: string | null;
  secretModalData: { clientId: string; clientSecret: string } | null;
  editAppId: string | null;
  openCreate: () => void;
  openEdit: (id: string) => void;
  openDelete: (id: string) => void;
  showSecret: (clientId: string, clientSecret: string) => void;
  close: () => void;
};

export const useOAuthAppModal = create<OAuthAppModalState>((set) => ({
  sheetType: null,
  deleteAppId: null,
  secretModalData: null,
  editAppId: null,
  openCreate: () =>
    set({
      sheetType: "create",
      deleteAppId: null,
      secretModalData: null,
      editAppId: null,
    }),
  openEdit: (id) =>
    set({
      sheetType: "edit",
      editAppId: id,
      deleteAppId: null,
      secretModalData: null,
    }),
  openDelete: (id) => set({ deleteAppId: id }),
  showSecret: (clientId, clientSecret) =>
    set({
      secretModalData: { clientId, clientSecret },
      sheetType: null,
    }),
  close: () =>
    set({
      sheetType: null,
      deleteAppId: null,
      secretModalData: null,
      editAppId: null,
    }),
}));

export type { OAuthAppModalState };
