import type { Sandbox } from "./sandbox";

const INFINITE_LOOP_WHILE_TRUE = /while\s*\(\s*true\s*\)/;
const INFINITE_LOOP_WHILE_ONE = /while\s*\(\s*1\s*\)/;
const INFINITE_LOOP_FOR_EMPTY = /for\s*\(\s*;\s*;\s*\)/;
const INFINITE_LOOP_PYTHON_TRUE = /while\s+True\s*:/;

export interface CodeGenerationRequest {
  code: string;
  language: string;
  description?: string;
  timeout?: number;
}

export interface CodeExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  exitCode: number;
  durationMs: number;
}

export interface CodeValidationResult {
  valid: boolean;
  issues: CodeIssue[];
  severity: "safe" | "warning" | "dangerous";
}

export interface CodeIssue {
  type: CodeIssueType;
  message: string;
  line?: number;
  severity: "info" | "warning" | "error";
}

export type CodeIssueType =
  | "network_access"
  | "file_system_access"
  | "process_spawn"
  | "environment_access"
  | "dangerous_import"
  | "infinite_loop"
  | "excessive_memory"
  | "shell_execution";

const DANGEROUS_PATTERNS: Array<{
  type: CodeIssueType;
  patterns: RegExp[];
  severity: "warning" | "error";
  message: string;
}> = [
  {
    type: "shell_execution",
    patterns: [
      /subprocess\.(?:call|run|Popen)/,
      /os\.system\(/,
      /exec\s*\(/,
      /child_process\./,
      /\$\(/,
      /`.*`/,
    ],
    severity: "error",
    message: "Shell execution detected - requires elevated permissions",
  },
  {
    type: "network_access",
    patterns: [
      /socket\./,
      /urllib/,
      /requests\.(?:get|post|put|delete)/,
      /fetch\s*\(/,
      /http\.(?:get|request)/,
      /net\.connect/,
    ],
    severity: "warning",
    message: "Network access detected",
  },
  {
    type: "file_system_access",
    patterns: [
      /open\s*\([^)]*['"][wa]/,
      /fs\.writeFile/,
      /fs\.unlink/,
      /os\.remove/,
      /shutil\.rmtree/,
      /path\.join.*['"]\/['"]/,
    ],
    severity: "warning",
    message: "File system write/delete detected",
  },
  {
    type: "environment_access",
    patterns: [/os\.environ/, /process\.env/, /getenv\(/, /dotenv/],
    severity: "warning",
    message: "Environment variable access detected",
  },
  {
    type: "dangerous_import",
    patterns: [
      /import\s+ctypes/,
      /from\s+ctypes/,
      /require\s*\(['"]child_process['"]\)/,
      /import\s+subprocess/,
      /import\s+pickle/,
      /eval\s*\(/,
    ],
    severity: "error",
    message: "Dangerous import or eval detected",
  },
  {
    type: "process_spawn",
    patterns: [
      /multiprocessing\./,
      /threading\.Thread/,
      /cluster\.fork/,
      /worker_threads/,
    ],
    severity: "warning",
    message: "Process/thread spawning detected",
  },
];

const MAX_CODE_LENGTH = 50_000;
const MAX_EXECUTION_TIME_MS = 30_000;

export function validateCode(
  code: string,
  _language: string
): CodeValidationResult {
  const issues: CodeIssue[] = [];

  if (code.length > MAX_CODE_LENGTH) {
    issues.push({
      type: "excessive_memory",
      message: `Code exceeds maximum length of ${MAX_CODE_LENGTH} characters`,
      severity: "error",
    });
  }

  for (const rule of DANGEROUS_PATTERNS) {
    for (const pattern of rule.patterns) {
      const matches = code.matchAll(new RegExp(pattern, "g"));
      for (const match of matches) {
        const lineNumber = code.slice(0, match.index).split("\n").length;
        issues.push({
          type: rule.type,
          message: rule.message,
          line: lineNumber,
          severity: rule.severity,
        });
      }
    }
  }

  const infiniteLoopPatterns = [
    INFINITE_LOOP_WHILE_TRUE,
    INFINITE_LOOP_WHILE_ONE,
    INFINITE_LOOP_FOR_EMPTY,
    INFINITE_LOOP_PYTHON_TRUE,
  ];

  for (const pattern of infiniteLoopPatterns) {
    if (pattern.test(code)) {
      issues.push({
        type: "infinite_loop",
        message: "Potential infinite loop detected",
        severity: "warning",
      });
    }
  }

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;

  let severity: CodeValidationResult["severity"] = "safe";
  if (errorCount > 0) {
    severity = "dangerous";
  } else if (warningCount > 0) {
    severity = "warning";
  }

  return {
    valid: errorCount === 0,
    issues,
    severity,
  };
}

export interface SandboxExecutionOptions {
  timeout?: number;
  allowNetwork?: boolean;
  allowFileWrite?: boolean;
  workDir?: string;
  env?: Record<string, string>;
}

export async function executeInSandbox(
  sandbox: Sandbox,
  code: string,
  language: string,
  options: SandboxExecutionOptions = {}
): Promise<CodeExecutionResult> {
  const timeout = options.timeout ?? MAX_EXECUTION_TIME_MS;
  const startTime = performance.now();

  const validation = validateCode(code, language);
  if (!validation.valid && validation.severity === "dangerous") {
    return {
      success: false,
      error: `Code validation failed: ${validation.issues.map((i) => i.message).join("; ")}`,
      exitCode: 1,
      durationMs: performance.now() - startTime,
    };
  }

  const fileName = getFileName(language);
  await sandbox.files.write(fileName, code);

  const command = getExecutionCommand(language, fileName);

  try {
    const result = await sandbox.process.run(command, {
      timeout,
      cwd: options.workDir,
      env: options.env,
    });

    return {
      success: result.exitCode === 0,
      output: result.stdout,
      error: result.stderr || undefined,
      exitCode: result.exitCode,
      durationMs: performance.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Execution failed",
      exitCode: -1,
      durationMs: performance.now() - startTime,
    };
  }
}

function getFileName(language: string): string {
  const extensions: Record<string, string> = {
    python: "main.py",
    javascript: "main.js",
    typescript: "main.ts",
    bash: "main.sh",
    ruby: "main.rb",
    go: "main.go",
    rust: "main.rs",
    java: "Main.java",
  };

  return extensions[language.toLowerCase()] ?? "main.txt";
}

function getExecutionCommand(language: string, fileName: string): string {
  const commands: Record<string, string> = {
    python: `python3 ${fileName}`,
    javascript: `node ${fileName}`,
    typescript: `npx tsx ${fileName}`,
    bash: `bash ${fileName}`,
    ruby: `ruby ${fileName}`,
    go: `go run ${fileName}`,
    rust: `rustc ${fileName} -o main && ./main`,
    java: `javac ${fileName} && java Main`,
  };

  return commands[language.toLowerCase()] ?? `cat ${fileName}`;
}

export interface CodeGenerationToolOptions {
  sandbox: Sandbox;
  allowDangerous?: boolean;
  maxExecutionTime?: number;
  onValidation?: (result: CodeValidationResult) => void;
  onExecution?: (result: CodeExecutionResult) => void;
}

export function createCodeGenerationTool(options: CodeGenerationToolOptions) {
  return {
    name: "execute_code",
    description:
      "Execute code in a sandboxed environment. Validates code for safety before execution.",
    parameters: {
      code: {
        type: "string",
        description: "The code to execute",
      },
      language: {
        type: "string",
        description:
          "Programming language (python, javascript, typescript, bash, etc.)",
      },
      description: {
        type: "string",
        description: "Description of what the code does",
      },
    },
    execute: async (params: CodeGenerationRequest) => {
      const validation = validateCode(params.code, params.language);
      options.onValidation?.(validation);

      if (!(validation.valid || options.allowDangerous)) {
        return {
          success: false,
          error: "Code validation failed",
          validation,
        };
      }

      const result = await executeInSandbox(
        options.sandbox,
        params.code,
        params.language,
        { timeout: params.timeout ?? options.maxExecutionTime }
      );

      options.onExecution?.(result);

      return {
        success: result.success,
        output: result.output,
        error: result.error,
        exitCode: result.exitCode,
        durationMs: result.durationMs,
        validation,
      };
    },
  };
}
