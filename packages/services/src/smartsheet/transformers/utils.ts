export function buildSmartsheetSheetUrl(permalink: string): string {
  return permalink;
}

export function buildSmartsheetRowUrl(
  sheetPermalink: string,
  rowId: number
): string {
  return `${sheetPermalink}?rowId=${rowId}`;
}

export function formatAccessLevel(level: string): string {
  const map: Record<string, string> = {
    ADMIN: "Admin",
    EDITOR: "Editor",
    EDITOR_SHARE: "Editor (Share)",
    OWNER: "Owner",
    VIEWER: "Viewer",
    COMMENTER: "Commenter",
  };
  return map[level] ?? level;
}
