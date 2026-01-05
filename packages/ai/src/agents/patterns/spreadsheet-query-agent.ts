import { type RoutingDecision, routeQuery } from "../../rag/query-router";
import { toolRegistry } from "../../tools/registry";
import type { ToolServices } from "../../tools/services";
import {
  BaseAgent,
  completeTrace,
  createTrace,
  failTrace,
  persistOutput,
} from "../base";
import type {
  AgentExecutionContext,
  AgentExecutionResult,
  LlmAgentConfig,
  ModelConfig,
} from "../config";

export interface SpreadsheetQueryConfig {
  name: string;
  description?: string;
  model?: ModelConfig;
  maxSteps?: number;
}

export interface SpreadsheetQueryInput {
  query: string;
  spreadsheetId?: string;
  spreadsheetColumns?: string[];
}

export interface SpreadsheetAgentResult {
  routing: RoutingDecision;
  answer?: string;
  data?: {
    rows: Record<string, unknown>[];
    columnTypes: Record<string, string>;
    rowCount: number;
    sql: string;
    explanation: string;
  };
  error?: string;
}

const SPREADSHEET_SYSTEM_PROMPT = `You are a data analyst assistant that helps users query spreadsheet data using natural language.

You have access to these tools:
- get_spreadsheet_schema: Get the structure and sample data from a spreadsheet
- generate_spreadsheet_sql: Convert a natural language question to SQL
- execute_spreadsheet_query: Execute SQL and get results

WORKFLOW:
1. If you have a spreadsheet ID, first get its schema
2. Generate SQL based on the user's question and schema
3. Execute the SQL and present results clearly

Always explain what you're doing and show the SQL before executing.
Format results as clean tables when possible.

If the query cannot be answered with the spreadsheet data, explain why.`;

export class SpreadsheetQueryAgent extends BaseAgent {
  readonly config: LlmAgentConfig;

  constructor(config: SpreadsheetQueryConfig) {
    const llmConfig: LlmAgentConfig = {
      type: "llm",
      name: config.name,
      description: config.description ?? "Spreadsheet query agent",
      systemPrompt: SPREADSHEET_SYSTEM_PROMPT,
      model: config.model,
      maxSteps: config.maxSteps ?? 5,
      tools: [
        "get_spreadsheet_schema",
        "generate_spreadsheet_sql",
        "execute_spreadsheet_query",
      ],
    };
    super(llmConfig);
    this.config = llmConfig;
  }

  async execute(
    input: SpreadsheetQueryInput,
    ctx: AgentExecutionContext
  ): Promise<AgentExecutionResult> {
    const trace = createTrace(this.config, ctx.parentTrace);
    trace.input = input;

    const routing = routeQuery(input.query, {
      hasSpreadsheet: !!input.spreadsheetId,
      spreadsheetId: input.spreadsheetId,
      availableColumns: input.spreadsheetColumns,
    });

    if (routing.route !== "duckdb") {
      const result: SpreadsheetAgentResult = {
        routing,
        answer: `This query is better suited for ${routing.route}. ${routing.reason}`,
      };
      trace.output = result;
      completeTrace(trace, result, { inputTokens: 0, outputTokens: 0 });
      return this.buildResult(result, ctx.state, trace);
    }

    if (!input.spreadsheetId) {
      const result: SpreadsheetAgentResult = {
        routing,
        error: "No spreadsheet ID provided for data query",
      };
      failTrace(trace, new Error(result.error));
      return this.buildResult(result, ctx.state, trace);
    }

    try {
      const services = toolRegistry.getServices();
      const result = await this.executeSpreadsheetQuery(
        input,
        services,
        ctx.teamId
      );

      persistOutput(this.config, ctx.state, result);
      completeTrace(trace, result, { inputTokens: 0, outputTokens: 0 });

      return this.buildResult(result, ctx.state, trace);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const result: SpreadsheetAgentResult = {
        routing,
        error: errorMessage,
      };
      failTrace(trace, error as Error);
      return this.buildResult(result, ctx.state, trace);
    }
  }

  private async executeSpreadsheetQuery(
    input: SpreadsheetQueryInput,
    services: ToolServices,
    teamId: string
  ): Promise<SpreadsheetAgentResult> {
    const routing = routeQuery(input.query, {
      hasSpreadsheet: !!input.spreadsheetId,
      spreadsheetId: input.spreadsheetId,
      availableColumns: input.spreadsheetColumns,
    });

    if (!input.spreadsheetId) {
      throw new Error("Spreadsheet ID is required");
    }

    const schema = await services.analytics.getSpreadsheetSchema(
      input.spreadsheetId,
      teamId
    );

    const sqlResult = await services.analytics.generateSql({
      documentId: input.spreadsheetId,
      naturalLanguageQuery: input.query,
      schema,
    });

    const viewName = `spreadsheet_${input.spreadsheetId.replace(/-/g, "_")}`;
    const queryResult = await services.analytics.executeQuery({
      documentId: input.spreadsheetId,
      sql: sqlResult.sql,
      viewName,
    });

    const answer = this.formatAnswer(
      input.query,
      sqlResult.explanation,
      queryResult.rows,
      queryResult.columnTypes
    );

    return {
      routing,
      answer,
      data: {
        rows: queryResult.rows,
        columnTypes: queryResult.columnTypes,
        rowCount: queryResult.rowCount,
        sql: sqlResult.sql,
        explanation: sqlResult.explanation,
      },
    };
  }

  private formatAnswer(
    _question: string,
    explanation: string,
    rows: Record<string, unknown>[],
    columnTypes: Record<string, string>
  ): string {
    const parts: string[] = [];

    parts.push(`**Query:** ${explanation}`);
    parts.push("");

    if (rows.length === 0) {
      parts.push("No results found for this query.");
      return parts.join("\n");
    }

    const columns = Object.keys(columnTypes);
    const headerRow = `| ${columns.join(" | ")} |`;
    const separatorRow = `| ${columns.map(() => "---").join(" | ")} |`;

    parts.push(headerRow);
    parts.push(separatorRow);

    const maxRows = Math.min(rows.length, 20);
    for (let i = 0; i < maxRows; i++) {
      const row = rows[i];
      if (!row) {
        continue;
      }
      const values = columns.map((col) => {
        const val = row[col];
        if (val === null || val === undefined) {
          return "—";
        }
        if (typeof val === "number") {
          return Number.isInteger(val) ? String(val) : val.toFixed(2);
        }
        return String(val);
      });
      parts.push(`| ${values.join(" | ")} |`);
    }

    if (rows.length > maxRows) {
      parts.push("");
      parts.push(`*... and ${rows.length - maxRows} more rows*`);
    }

    parts.push("");
    parts.push(`**Total rows:** ${rows.length}`);

    return parts.join("\n");
  }

  async *stream(
    input: SpreadsheetQueryInput,
    ctx: AgentExecutionContext
  ): AsyncGenerator<{
    type: string;
    agentName: string;
    content?: string;
    result?: AgentExecutionResult;
  }> {
    yield {
      type: "text",
      agentName: this.config.name,
      content: "Analyzing your query...\n",
    };

    const routing = routeQuery(input.query, {
      hasSpreadsheet: !!input.spreadsheetId,
      spreadsheetId: input.spreadsheetId,
      availableColumns: input.spreadsheetColumns,
    });

    if (routing.route !== "duckdb") {
      yield {
        type: "text",
        agentName: this.config.name,
        content: `This query is better suited for ${routing.route}. ${routing.reason}`,
      };
      const result = await this.execute(input, ctx);
      yield { type: "done", agentName: this.config.name, result };
      return;
    }

    yield {
      type: "text",
      agentName: this.config.name,
      content: "Routing to spreadsheet analysis...\n",
    };

    const result = await this.execute(input, ctx);
    const output = result.output as SpreadsheetAgentResult;

    if (output.answer) {
      yield {
        type: "text",
        agentName: this.config.name,
        content: output.answer,
      };
    } else if (output.error) {
      yield {
        type: "text",
        agentName: this.config.name,
        content: `Error: ${output.error}`,
      };
    }

    yield { type: "done", agentName: this.config.name, result };
  }
}

export function createSpreadsheetQueryAgent(
  config: SpreadsheetQueryConfig
): SpreadsheetQueryAgent {
  return new SpreadsheetQueryAgent(config);
}

export function isSpreadsheetQuery(
  query: string,
  context?: {
    hasSpreadsheet?: boolean;
    spreadsheetId?: string;
    availableColumns?: string[];
  }
): boolean {
  const routing = routeQuery(query, context);
  return routing.route === "duckdb";
}
