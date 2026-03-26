import { describe, expect, it } from "bun:test";
import type { SmartsheetTransformContext } from "@openbeam/types/services/connectors/smartsheet";
import type { SmartsheetDashboard } from "../api/dashboards";
import type { SmartsheetReport } from "../api/reports";
import type {
  SmartsheetColumn,
  SmartsheetRow,
  SmartsheetSheet,
} from "../api/sheets";
import type { SmartsheetWorkspace } from "../api/workspaces";
import { transformDashboard } from "../transformers/dashboard";
import { transformReport } from "../transformers/report";
import { transformRow } from "../transformers/row";
import { transformSheet } from "../transformers/sheet";
import { formatAccessLevel } from "../transformers/utils";
import { transformWorkspace } from "../transformers/workspace";

const context: SmartsheetTransformContext = {
  connectorId: "conn_ss_123",
  connectorType: "SMARTSHEET",
  teamId: "team_456",
  workspaceId: "ws_789",
};

describe("transformSheet", () => {
  const sheet: SmartsheetSheet = {
    id: 1_234_567_890,
    name: "Project Tracker",
    accessLevel: "OWNER",
    permalink: "https://app.smartsheet.com/sheets/abc123",
    createdAt: "2026-03-01T10:00:00Z",
    modifiedAt: "2026-03-20T14:30:00Z",
    version: 42,
    totalRowCount: 150,
    owner: "alice@example.com",
    columns: [
      { id: 1, title: "Task", type: "TEXT_NUMBER", index: 0, primary: true },
      { id: 2, title: "Status", type: "PICKLIST", index: 1 },
      { id: 3, title: "Due Date", type: "DATE", index: 2 },
    ],
    workspace: { id: 999, name: "Engineering" },
  };

  it("produces a valid GenericDocument", async () => {
    const doc = await transformSheet(sheet, context);

    expect(doc.id).toBe("conn_ss_123_sheet_1234567890");
    expect(doc.connector_id).toBe("conn_ss_123");
    expect(doc.connector_type).toBe("SMARTSHEET");
    expect(doc.team_id).toBe("team_456");
    expect(doc.external_id).toBe("1234567890");
    expect(doc.document_type).toBe("sheet");
    expect(doc.title).toBe("Project Tracker");
    expect(doc.source_type).toBe("smartsheet");
    expect(doc.author_name).toBe("alice@example.com");
    expect(doc.url).toBe("https://app.smartsheet.com/sheets/abc123");
    expect(doc.checksum).toBeDefined();
  });

  it("includes metadata fields", async () => {
    const doc = await transformSheet(sheet, context);

    expect(doc.metadata).toMatchObject({
      sheetId: "1234567890",
      accessLevel: "OWNER",
      rowCount: 150,
      owner: "alice@example.com",
      columnCount: 3,
      workspaceName: "Engineering",
      version: 42,
    });
  });

  it("includes column names in content", async () => {
    const doc = await transformSheet(sheet, context);
    expect(doc.content).toContain("Columns: Task, Status, Due Date");
    expect(doc.content).toContain("Row count: 150");
    expect(doc.content).toContain("Owner: alice@example.com");
    expect(doc.content).toContain("Workspace: Engineering");
  });

  it("handles minimal sheet", async () => {
    const minimal: SmartsheetSheet = {
      id: 111,
      name: "Empty Sheet",
      accessLevel: "VIEWER",
      permalink: "https://app.smartsheet.com/sheets/xyz",
      createdAt: "2026-03-01T00:00:00Z",
      modifiedAt: "2026-03-01T00:00:00Z",
    };

    const doc = await transformSheet(minimal, context);
    expect(doc.id).toBe("conn_ss_123_sheet_111");
    expect(doc.author_name).toBeUndefined();
    expect(doc.metadata?.rowCount).toBeUndefined();
  });
});

describe("transformRow", () => {
  const columns: SmartsheetColumn[] = [
    { id: 1, title: "Task", type: "TEXT_NUMBER", index: 0, primary: true },
    { id: 2, title: "Status", type: "PICKLIST", index: 1 },
    { id: 3, title: "Assignee", type: "CONTACT_LIST", index: 2 },
  ];

  const row: SmartsheetRow = {
    id: 5001,
    rowNumber: 3,
    cells: [
      { columnId: 1, value: "Fix login bug", displayValue: "Fix login bug" },
      { columnId: 2, value: "In Progress", displayValue: "In Progress" },
      { columnId: 3, value: "Bob", displayValue: "Bob" },
    ],
    createdAt: "2026-03-10T08:00:00Z",
    modifiedAt: "2026-03-15T12:00:00Z",
    locked: false,
  };

  it("produces a valid GenericDocument", async () => {
    const doc = await transformRow({
      row,
      sheet: {
        id: 1234,
        name: "Project Tracker",
        permalink: "https://app.smartsheet.com/sheets/abc",
        columns,
      },
      context,
    });

    expect(doc.id).toBe("conn_ss_123_row_1234_5001");
    expect(doc.document_type).toBe("row");
    expect(doc.document_subtype).toBe("Project Tracker");
    expect(doc.title).toBe("Fix login bug");
    expect(doc.url).toBe("https://app.smartsheet.com/sheets/abc?rowId=5001");
    expect(doc.checksum).toBeDefined();
  });

  it("includes cell values in content", async () => {
    const doc = await transformRow({
      row,
      sheet: {
        id: 1234,
        name: "Test",
        permalink: "https://example.com",
        columns,
      },
      context,
    });
    expect(doc.content).toContain("Task: Fix login bug");
    expect(doc.content).toContain("Status: In Progress");
    expect(doc.content).toContain("Assignee: Bob");
    expect(doc.content).toContain("Row #3");
  });

  it("uses row number as title when no primary column value", async () => {
    const emptyRow: SmartsheetRow = {
      id: 5002,
      rowNumber: 7,
      cells: [{ columnId: 2, value: "Done", displayValue: "Done" }],
    };

    const doc = await transformRow({
      row: emptyRow,
      sheet: {
        id: 1234,
        name: "Test",
        permalink: "https://example.com",
        columns,
      },
      context,
    });
    expect(doc.title).toBe("Row #7");
  });

  it("includes metadata", async () => {
    const doc = await transformRow({
      row,
      sheet: {
        id: 1234,
        name: "Project Tracker",
        permalink: "https://example.com",
        columns,
      },
      context,
    });

    expect(doc.metadata).toMatchObject({
      rowId: "5001",
      rowNumber: 3,
      sheetId: "1234",
      sheetName: "Project Tracker",
      locked: false,
    });
  });
});

describe("transformWorkspace", () => {
  const workspace: SmartsheetWorkspace = {
    id: 8001,
    name: "Engineering",
    accessLevel: "ADMIN",
    permalink: "https://app.smartsheet.com/workspaces/eng",
    sheets: [
      { id: 1, name: "Sprint Board" },
      { id: 2, name: "Roadmap" },
    ],
    reports: [{ id: 10, name: "Weekly Report" }],
    sights: [{ id: 20, name: "Team Dashboard" }],
  };

  it("produces a valid GenericDocument", async () => {
    const doc = await transformWorkspace(workspace, context);

    expect(doc.id).toBe("conn_ss_123_workspace_8001");
    expect(doc.document_type).toBe("workspace");
    expect(doc.title).toBe("Engineering");
    expect(doc.checksum).toBeDefined();
  });

  it("includes contents in content", async () => {
    const doc = await transformWorkspace(workspace, context);
    expect(doc.content).toContain("Sheets (2): Sprint Board, Roadmap");
    expect(doc.content).toContain("Reports (1): Weekly Report");
    expect(doc.content).toContain("Dashboards (1): Team Dashboard");
  });

  it("includes metadata", async () => {
    const doc = await transformWorkspace(workspace, context);

    expect(doc.metadata).toMatchObject({
      workspaceId: "8001",
      accessLevel: "ADMIN",
      sheetCount: 2,
      reportCount: 1,
      dashboardCount: 1,
    });
  });
});

describe("transformReport", () => {
  const report: SmartsheetReport = {
    id: 3001,
    name: "Weekly Status",
    accessLevel: "EDITOR",
    permalink: "https://app.smartsheet.com/reports/xyz",
    createdAt: "2026-02-01T00:00:00Z",
    modifiedAt: "2026-03-20T16:00:00Z",
    owner: "carol@example.com",
    totalRowCount: 45,
    sourceSheets: [
      { id: 1, name: "Sprint Board" },
      { id: 2, name: "Bug Tracker" },
    ],
  };

  it("produces a valid GenericDocument", async () => {
    const doc = await transformReport(report, context);

    expect(doc.id).toBe("conn_ss_123_report_3001");
    expect(doc.document_type).toBe("report");
    expect(doc.title).toBe("Weekly Status");
    expect(doc.author_name).toBe("carol@example.com");
    expect(doc.checksum).toBeDefined();
  });

  it("includes source sheets in content", async () => {
    const doc = await transformReport(report, context);
    expect(doc.content).toContain("Source sheets: Sprint Board, Bug Tracker");
    expect(doc.content).toContain("Total rows: 45");
  });
});

describe("transformDashboard", () => {
  const dashboard: SmartsheetDashboard = {
    id: 4001,
    name: "Executive Overview",
    accessLevel: "VIEWER",
    permalink: "https://app.smartsheet.com/dashboards/abc",
    createdAt: "2026-01-15T00:00:00Z",
    modifiedAt: "2026-03-18T09:00:00Z",
    owner: "dave@example.com",
    widgets: [
      { id: 1, type: "CHART", title: "Burndown" },
      { id: 2, type: "METRIC", title: "Open Issues" },
      { id: 3, type: "SHORTCUT" },
    ],
  };

  it("produces a valid GenericDocument", async () => {
    const doc = await transformDashboard(dashboard, context);

    expect(doc.id).toBe("conn_ss_123_dashboard_4001");
    expect(doc.document_type).toBe("dashboard");
    expect(doc.title).toBe("Executive Overview");
    expect(doc.author_name).toBe("dave@example.com");
    expect(doc.checksum).toBeDefined();
  });

  it("includes widgets in content", async () => {
    const doc = await transformDashboard(dashboard, context);
    expect(doc.content).toContain(
      "Widgets (3): Burndown, Open Issues, SHORTCUT"
    );
  });

  it("includes metadata", async () => {
    const doc = await transformDashboard(dashboard, context);

    expect(doc.metadata).toMatchObject({
      dashboardId: "4001",
      accessLevel: "VIEWER",
      owner: "dave@example.com",
      widgetCount: 3,
    });
  });
});

describe("formatAccessLevel", () => {
  it("maps known levels to labels", () => {
    expect(formatAccessLevel("ADMIN")).toBe("Admin");
    expect(formatAccessLevel("EDITOR")).toBe("Editor");
    expect(formatAccessLevel("OWNER")).toBe("Owner");
    expect(formatAccessLevel("VIEWER")).toBe("Viewer");
  });

  it("returns unknown values as-is", () => {
    expect(formatAccessLevel("CUSTOM")).toBe("CUSTOM");
  });
});
