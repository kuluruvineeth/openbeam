import { describe, expect, it } from "bun:test";
import { getToolDisplayName, getToolMetadata } from "../tool-registry";

describe("getToolDisplayName", () => {
  it("maps canvas_add_node to Add Node", () => {
    expect(getToolDisplayName("canvas_add_node")).toBe("Add Node");
  });

  it("maps canvas_create_node to Create Node", () => {
    expect(getToolDisplayName("canvas_create_node")).toBe("Create Node");
  });

  it("maps canvas_validate_workflow to Validate", () => {
    expect(getToolDisplayName("canvas_validate_workflow")).toBe("Validate");
  });

  it("maps canvas_delete_nodes to Delete Nodes", () => {
    expect(getToolDisplayName("canvas_delete_nodes")).toBe("Delete Nodes");
  });

  it("maps canvas_auto_layout to Auto Layout", () => {
    expect(getToolDisplayName("canvas_auto_layout")).toBe("Auto Layout");
  });

  it("maps canvas_export_workflow to Export", () => {
    expect(getToolDisplayName("canvas_export_workflow")).toBe("Export");
  });

  it("maps canvas_get_state to Read Canvas", () => {
    expect(getToolDisplayName("canvas_get_state")).toBe("Read Canvas");
  });

  it("returns formatted fallback for unknown tool", () => {
    const metadata = getToolMetadata("some_unknown_tool");
    expect(metadata.displayName).toBe("some_unknown_tool");
  });

  it("resolves existing tools correctly (Bash)", () => {
    expect(getToolDisplayName("Bash")).toBe("Terminal");
  });

  it("resolves existing tools correctly (Read)", () => {
    expect(getToolDisplayName("Read")).toBe("Read File");
  });
});
