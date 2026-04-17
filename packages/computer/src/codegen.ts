import { anthropic } from "@ai-sdk/anthropic";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { generateObject } from "ai";
import { z } from "zod";
import { generateTypeStubs } from "./stubs";

const MAX_REPAIR_ATTEMPTS = 2;

const agentOutputSchema = z.object({
  name: z.string().describe("Human-readable agent name"),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .describe("URL-safe unique slug"),
  description: z.string().describe("One-line description"),
  scheduleCron: z
    .string()
    .nullable()
    .describe("Cron expression for scheduling, or null for on-demand"),
  plan: z.array(z.string()).describe("Step-by-step plan"),
  toolsUsed: z.array(z.string()).describe("MCP tool names used"),
  code: z
    .string()
    .describe("TypeScript async function body using SecureExec.bindings"),
});

export type GeneratedAgent = z.infer<typeof agentOutputSchema> & {
  compiledCode: string;
};

function buildSystemPrompt(typeStubs: string): string {
  return `You generate executable TypeScript agent code for OpenBeam Computer.

## Type Definitions
${typeStubs}

## Code Pattern
\`\`\`typescript
const { callTool, parseMcp, generateText, readMemory, writeMemory, notify, getTrigger, callConnector, propose } = SecureExec.bindings;

const result = await callTool("search_documents", { query: "...", limit: 10 });
const { data } = parseMcp(result);

const analysis = await generateText("Analyze: " + JSON.stringify(data));

await writeMemory("last_analysis", analysis, "snapshot");
await notify(analysis);

module.exports = { summary: analysis, itemCount: data.length };
\`\`\`

## Rules
1. Always destructure bindings from SecureExec.bindings at the top
2. ALWAYS use parseMcp() to unwrap callTool results
3. All field names in tool results are camelCase
4. Handle empty results gracefully (data ?? [])
5. Use generateText for analysis and decision-making
6. Use notify for important findings (urgent priority sends email)
7. Use readMemory/writeMemory for cross-run state persistence
8. Always assign final result to module.exports = { summary, ... }
9. Keep code concise — under 150 lines
10. Wrap individual tool calls in try/catch for resilience
11. Use callConnector only for external services when explicitly requested
12. Use propose() for actions that modify data — agent pauses for user approval
13. Wrap JSON.parse in try/catch — memory content may be invalid`;
}

async function typecheckAndCompile(
  typeStubs: string,
  code: string
): Promise<{
  success: boolean;
  javascript: string;
  diagnostics: string;
}> {
  const { createTypeScriptTools } = await import("@secure-exec/typescript");
  const { createNodeDriver, createNodeRuntimeDriverFactory } = await import(
    "secure-exec"
  );

  const systemDriver = createNodeDriver({
    permissions: {
      fs: () => ({ allow: false }),
      network: () => ({ allow: false }),
    },
  });

  const runtimeDriverFactory = createNodeRuntimeDriverFactory();

  const tsTools = createTypeScriptTools({
    systemDriver,
    runtimeDriverFactory,
    memoryLimit: 128,
    cpuTimeLimitMs: 15_000,
  });

  const fullSource = `${typeStubs}\n\n(async () => {\n${code}\n})();`;
  const agentSource = `(async () => {\n${code}\n})();`;

  const compilerOptions = {
    target: "ES2022",
    module: "commonjs",
    strict: false,
    skipLibCheck: true,
  };

  const checkResult = await tsTools.typecheckSource({
    sourceText: fullSource,
    filePath: "agent.ts",
    compilerOptions: { ...compilerOptions, noEmit: true },
  });

  if (!checkResult.success) {
    const errorMessages = checkResult.diagnostics
      .filter((d) => d.category === "error")
      .map((d) => `Line ${d.line ?? 0}: ${d.message}`)
      .join("\n");

    return { success: false, javascript: "", diagnostics: errorMessages };
  }

  const compileResult = await tsTools.compileSource({
    sourceText: agentSource,
    filePath: "agent.ts",
    compilerOptions: { ...compilerOptions, removeComments: true },
  });

  if (!compileResult.success) {
    const errorMessages = compileResult.diagnostics
      .map((d) => d.message)
      .join("\n");
    return { success: false, javascript: "", diagnostics: errorMessages };
  }

  return {
    success: true,
    javascript: compileResult.outputText ?? "",
    diagnostics: "",
  };
}

export async function generateAgentFromDescription(
  description: string,
  mcpClient: Client
): Promise<GeneratedAgent> {
  const typeStubs = await generateTypeStubs(mcpClient);
  const systemPrompt = buildSystemPrompt(typeStubs);

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-6"),
    schema: agentOutputSchema,
    system: systemPrompt,
    prompt: `Create an agent for: "${description}"`,
    temperature: 0.2,
  });

  let tsCode = object.code;
  let compiled = await typecheckAndCompile(typeStubs, tsCode);
  let attempts = 0;

  while (!compiled.success && attempts < MAX_REPAIR_ATTEMPTS) {
    attempts += 1;
    const { object: repaired } = await generateObject({
      model: anthropic("claude-sonnet-4-6"),
      schema: z.object({ code: z.string() }),
      system: systemPrompt,
      prompt: `Fix the following TypeScript agent code.\n\n## Original Code\n${tsCode}\n\n## Type Errors\n${compiled.diagnostics}\n\nReturn only the corrected code.`,
      temperature: 0.0,
    });
    tsCode = repaired.code;
    compiled = await typecheckAndCompile(typeStubs, tsCode);
  }

  if (!compiled.success) {
    throw new Error(
      `Code generation failed after ${MAX_REPAIR_ATTEMPTS} repair attempts: ${compiled.diagnostics}`
    );
  }

  return {
    ...object,
    code: tsCode,
    compiledCode: compiled.javascript,
  };
}
