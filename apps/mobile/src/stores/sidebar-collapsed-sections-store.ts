import { create } from "zustand";

interface SidebarCollapsedSectionsState {
  collapsedProjectKeys: Set<string>;
  collapsedSidebarSections: Set<string>;
  toggleProjectCollapsed: (projectKey: string) => void;
  setProjectCollapsed: (projectKey: string, collapsed: boolean) => void;
  toggleSidebarSection: (sectionId: string) => void;
  isSidebarSectionCollapsed: (sectionId: string) => boolean;
}

export const useSidebarCollapsedSectionsStore =
  create<SidebarCollapsedSectionsState>((set, get) => ({
    collapsedProjectKeys: new Set(),
    collapsedSidebarSections: new Set(),
    toggleProjectCollapsed: (projectKey) =>
      set((state) => {
        const next = new Set(state.collapsedProjectKeys);
        if (next.has(projectKey)) {
          next.delete(projectKey);
        } else {
          next.add(projectKey);
        }
        return { collapsedProjectKeys: next };
      }),
    setProjectCollapsed: (projectKey, collapsed) =>
      set((state) => {
        const next = new Set(state.collapsedProjectKeys);
        if (collapsed) {
          next.add(projectKey);
        } else {
          next.delete(projectKey);
        }
        return { collapsedProjectKeys: next };
      }),
    toggleSidebarSection: (sectionId) =>
      set((state) => {
        const next = new Set(state.collapsedSidebarSections);
        if (next.has(sectionId)) {
          next.delete(sectionId);
        } else {
          next.add(sectionId);
        }
        return { collapsedSidebarSections: next };
      }),
    isSidebarSectionCollapsed: (sectionId) =>
      get().collapsedSidebarSections.has(sectionId),
  }));
