import { afterEach, describe, expect, it } from "bun:test";
import { createMissionListStore } from "../mission-list-store";

const useStore = createMissionListStore({ skipPersist: true });

function getState() {
  return useStore.getState();
}

describe("mission-list-store", () => {
  afterEach(() => {
    getState().reset();
  });

  it("defaults viewMode to table", () => {
    expect(getState().viewMode).toBe("table");
  });

  it("setViewMode updates view mode", () => {
    getState().setViewMode("card");
    expect(getState().viewMode).toBe("card");

    getState().setViewMode("table");
    expect(getState().viewMode).toBe("table");
  });

  it("setSortField updates sort field", () => {
    getState().setSortField("name");
    expect(getState().sortField).toBe("name");

    getState().setSortField("createdAt");
    expect(getState().sortField).toBe("createdAt");
  });

  it("setSortDirection updates sort direction", () => {
    getState().setSortDirection("asc");
    expect(getState().sortDirection).toBe("asc");

    getState().setSortDirection("desc");
    expect(getState().sortDirection).toBe("desc");
  });

  it("setColumnVisibility toggles column visibility", () => {
    getState().setColumnVisibility("status", false);
    expect(getState().columnVisibility.status).toBe(false);

    getState().setColumnVisibility("status", true);
    expect(getState().columnVisibility.status).toBe(true);

    getState().setColumnVisibility("agents", false);
    expect(getState().columnVisibility.agents).toBe(false);
    expect(getState().columnVisibility.status).toBe(true);
  });

  it("reset restores defaults", () => {
    getState().setViewMode("card");
    getState().setSortField("name");
    getState().setSortDirection("asc");
    getState().setColumnVisibility("status", false);

    getState().reset();

    expect(getState().viewMode).toBe("table");
    expect(getState().sortField).toBe("updatedAt");
    expect(getState().sortDirection).toBe("desc");
    expect(getState().columnVisibility).toEqual({});
    expect(getState().isHydrated).toBe(true);
  });
});
