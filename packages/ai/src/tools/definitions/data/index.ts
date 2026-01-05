import { classifyQueryTool } from "./classify";
import { buildContextTool } from "./context";
import { extractEntitiesTool } from "./entities";
import { executeSpreadsheetQueryTool } from "./spreadsheet-query";
import { getSpreadsheetSchemaTool } from "./spreadsheet-schema";
import { generateSpreadsheetSqlTool } from "./spreadsheet-sql";

export {
  buildContextTool,
  classifyQueryTool,
  executeSpreadsheetQueryTool,
  extractEntitiesTool,
  generateSpreadsheetSqlTool,
  getSpreadsheetSchemaTool,
};

export function registerDataTools(): void {
  buildContextTool.register();
  classifyQueryTool.register();
  extractEntitiesTool.register();
  getSpreadsheetSchemaTool.register();
  generateSpreadsheetSqlTool.register();
  executeSpreadsheetQueryTool.register();
}
