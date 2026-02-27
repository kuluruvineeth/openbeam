import { describe, expect, it, mock } from "bun:test";
import type { ToolServices } from "../../../services";
import type { ToolContext } from "../../../types";
import {
  sandboxExecuteCodeTool,
  sandboxListFilesTool,
  sandboxReadFileTool,
  sandboxRunCommandTool,
  sandboxWriteFileTool,
} from "../tools";

function createNotUsed(): never {
  throw new Error("not used");
}

function createMockSandboxService(
  overrides: Partial<NonNullable<ToolServices["sandbox"]>> = {}
): NonNullable<ToolServices["sandbox"]> {
  return {
    executeCode: mock(() =>
      Promise.resolve({
        success: true,
        output: "hello",
        logs: [],
        artifacts: [],
        durationMs: 150,
      })
    ),
    runCommand: mock(() =>
      Promise.resolve({ exitCode: 0, stdout: "", stderr: "", durationMs: 50 })
    ),
    readFile: mock(() => Promise.resolve("file contents")),
    writeFile: mock(() => Promise.resolve()),
    listFiles: mock(() =>
      Promise.resolve([
        { path: "/app/main.py", name: "main.py", isDirectory: false, size: 42 },
      ])
    ),
    ...overrides,
  };
}

function createMockServices(
  sandbox?: NonNullable<ToolServices["sandbox"]> | undefined
): ToolServices {
  return {
    sandbox,
    connectors: {
      list: createNotUsed,
      get: createNotUsed,
      getSyncHistory: createNotUsed,
      getSyncHistoryPaginated: createNotUsed,
      triggerSync: createNotUsed,
      getSyncJobStatus: createNotUsed,
      pause: createNotUsed,
      resume: createNotUsed,
    },
    search: {
      hybrid: createNotUsed,
      semantic: createNotUsed,
      keyword: createNotUsed,
      unified: createNotUsed,
      export: createNotUsed,
      save: createNotUsed,
    },
    rag: {
      answer: createNotUsed,
      synthesize: createNotUsed,
      analyzeQuery: createNotUsed,
      verifyGrounding: createNotUsed,
    },
    documents: {
      get: createNotUsed,
      list: createNotUsed,
      getChunks: createNotUsed,
      export: createNotUsed,
      share: createNotUsed,
    },
    discovery: { getCapabilities: createNotUsed },
    context: {
      storeVirtualFile: createNotUsed,
      retrieveVirtualFile: createNotUsed,
      retrieveVirtualFileChunk: createNotUsed,
      listVirtualFiles: createNotUsed,
      deleteVirtualFile: createNotUsed,
    },
    analytics: {
      getSpreadsheetSchema: createNotUsed,
      generateSql: createNotUsed,
      executeQuery: createNotUsed,
    },
    preferences: { get: createNotUsed, update: createNotUsed },
    media: {
      searchByText: createNotUsed,
      searchByImage: createNotUsed,
      getTranscript: createNotUsed,
      getTranscriptWithTimestamps: createNotUsed,
      getMetadata: createNotUsed,
      analyze: createNotUsed,
      getSummary: createNotUsed,
      getChapters: createNotUsed,
      getHighlights: createNotUsed,
    },
    integrations: {
      listAvailable: createNotUsed,
      getCapabilities: createNotUsed,
    },
    storage: {
      list: createNotUsed,
      getSignedUrl: createNotUsed,
      exists: createNotUsed,
      getMetadata: createNotUsed,
    },
    workspace: {
      getSchema: createNotUsed,
      generateSql: createNotUsed,
    },
  };
}

function createMockContext(
  services: ToolServices,
  overrides: Partial<ToolContext> = {}
): ToolContext {
  return {
    teamId: "team_123",
    userId: "user_456",
    services,
    ...overrides,
  };
}

describe("sandbox tool metadata", () => {
  it("sandbox_execute_code has correct metadata", () => {
    expect(sandboxExecuteCodeTool.metadata.name).toBe("sandbox_execute_code");
    expect(sandboxExecuteCodeTool.metadata.category).toBe("action");
    expect(sandboxExecuteCodeTool.metadata.riskProfile?.stakes).toBe("high");
  });

  it("sandbox_run_command has correct metadata", () => {
    expect(sandboxRunCommandTool.metadata.name).toBe("sandbox_run_command");
    expect(sandboxRunCommandTool.metadata.category).toBe("action");
    expect(sandboxRunCommandTool.metadata.riskProfile?.stakes).toBe("high");
  });

  it("sandbox_read_file has correct metadata", () => {
    expect(sandboxReadFileTool.metadata.name).toBe("sandbox_read_file");
    expect(sandboxReadFileTool.metadata.category).toBe("action");
    expect(sandboxReadFileTool.metadata.riskProfile?.stakes).toBe("low");
  });

  it("sandbox_write_file has correct metadata", () => {
    expect(sandboxWriteFileTool.metadata.name).toBe("sandbox_write_file");
    expect(sandboxWriteFileTool.metadata.category).toBe("action");
    expect(sandboxWriteFileTool.metadata.riskProfile?.stakes).toBe("medium");
  });

  it("sandbox_list_files has correct metadata", () => {
    expect(sandboxListFilesTool.metadata.name).toBe("sandbox_list_files");
    expect(sandboxListFilesTool.metadata.category).toBe("action");
    expect(sandboxListFilesTool.metadata.riskProfile?.stakes).toBe("low");
  });
});

describe("sandbox tools without sandbox service", () => {
  it("sandbox_execute_code returns failure", async () => {
    const services = createMockServices(undefined);
    const ctx = createMockContext(services);

    const result = await sandboxExecuteCodeTool.execute(
      { code: "print('hi')", language: "python" },
      ctx
    );

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_STATE");
  });

  it("sandbox_run_command returns failure", async () => {
    const services = createMockServices(undefined);
    const ctx = createMockContext(services);

    const result = await sandboxRunCommandTool.execute({ command: "ls" }, ctx);

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_STATE");
  });

  it("sandbox_read_file returns failure", async () => {
    const services = createMockServices(undefined);
    const ctx = createMockContext(services);

    const result = await sandboxReadFileTool.execute(
      { path: "/app/main.py" },
      ctx
    );

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_STATE");
  });

  it("sandbox_write_file returns failure", async () => {
    const services = createMockServices(undefined);
    const ctx = createMockContext(services);

    const result = await sandboxWriteFileTool.execute(
      { path: "/app/out.txt", content: "hello" },
      ctx
    );

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_STATE");
  });

  it("sandbox_list_files returns failure", async () => {
    const services = createMockServices(undefined);
    const ctx = createMockContext(services);

    const result = await sandboxListFilesTool.execute({ path: "/" }, ctx);

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_STATE");
  });
});

describe("sandbox_execute_code", () => {
  it("delegates to sandbox service", async () => {
    const sandbox = createMockSandboxService();
    const services = createMockServices(sandbox);
    const ctx = createMockContext(services);

    const result = await sandboxExecuteCodeTool.execute(
      { code: "print('hello')", language: "python" },
      ctx
    );

    expect(result.success).toBe(true);
    expect(sandbox.executeCode).toHaveBeenCalledWith(
      "print('hello')",
      "python"
    );
  });
});

describe("sandbox_run_command", () => {
  it("delegates to sandbox service with options", async () => {
    const sandbox = createMockSandboxService();
    const services = createMockServices(sandbox);
    const ctx = createMockContext(services);

    const result = await sandboxRunCommandTool.execute(
      { command: "ls -la", cwd: "/app", env: { NODE_ENV: "test" } },
      ctx
    );

    expect(result.success).toBe(true);
    expect(sandbox.runCommand).toHaveBeenCalledWith("ls -la", {
      cwd: "/app",
      env: { NODE_ENV: "test" },
    });
  });
});

describe("sandbox_read_file", () => {
  it("returns file contents", async () => {
    const sandbox = createMockSandboxService({
      readFile: mock(() => Promise.resolve("print('hello')")),
    });
    const services = createMockServices(sandbox);
    const ctx = createMockContext(services);

    const result = await sandboxReadFileTool.execute(
      { path: "/app/main.py" },
      ctx
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ content: "print('hello')" });
    expect(sandbox.readFile).toHaveBeenCalledWith("/app/main.py");
  });
});

describe("sandbox_write_file", () => {
  it("writes content and confirms", async () => {
    const sandbox = createMockSandboxService();
    const services = createMockServices(sandbox);
    const ctx = createMockContext(services);

    const result = await sandboxWriteFileTool.execute(
      { path: "/app/out.txt", content: "output data" },
      ctx
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ path: "/app/out.txt", written: true });
    expect(sandbox.writeFile).toHaveBeenCalledWith(
      "/app/out.txt",
      "output data"
    );
  });
});

describe("sandbox_list_files", () => {
  it("returns file listing with count", async () => {
    const sandbox = createMockSandboxService();
    const services = createMockServices(sandbox);
    const ctx = createMockContext(services);

    const result = await sandboxListFilesTool.execute({ path: "/app" }, ctx);

    expect(result.success).toBe(true);
    expect(result.data?.count).toBe(1);
    expect(result.data?.files).toHaveLength(1);
    expect(sandbox.listFiles).toHaveBeenCalledWith("/app");
  });
});
