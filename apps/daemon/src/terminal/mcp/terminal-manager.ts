import {
  capturePaneContent,
  createSession,
  createWindow,
  executeTmux,
  extractExitCodeMarkerFromOutput,
  findSessionByName,
  findWindowByName,
  getCurrentCommand,
  getCurrentWorkingDirectory,
  getStoredCommand,
  getStoredWorkingDirectory,
  isWindowNameUnique,
  killWindow,
  listPanes,
  listWindows,
  renameWindow,
  executeCommand as tmuxExecuteCommand,
  sendKeys as tmuxSendKeys,
  sendText as tmuxSendText,
  waitForPaneActivityToSettle,
} from "./tmux";

export interface TerminalInfo {
  name: string;
  workingDirectory: string;
  currentCommand: string;
  lastLines: string | null;
}

export interface CommandInfo {
  id: string;
  name: string;
  workingDirectory: string;
  currentCommand: string;
  isDead: boolean;
  exitCode: number | null;
  lastLines: string | null;
}

export interface CreateTerminalParams {
  name: string;
  workingDirectory: string;
  initialCommand?: string;
}

export interface CreateTerminalResult extends TerminalInfo {
  commandOutput: string | null;
}

export class TerminalManager {
  // biome-ignore lint/style/noParameterProperties: TypeScript parameter properties
  constructor(private readonly sessionName: string) {}

  async initialize(): Promise<void> {
    const session = await findSessionByName(this.sessionName);

    if (!session) {
      await createSession(this.sessionName);
    }
  }

  async listTerminals(): Promise<TerminalInfo[]> {
    const session = await findSessionByName(this.sessionName);

    if (!session) {
      throw new Error(
        `Session '${this.sessionName}' not found. Call initialize() first.`
      );
    }

    const windows = await listWindows(session.id);

    const terminals: TerminalInfo[] = [];

    for (const window of windows) {
      const paneId = `${window.id}.0`;

      const workingDirectory = await getCurrentWorkingDirectory(paneId);
      const currentCommand = await getCurrentCommand(paneId);
      const lastLines = await capturePaneContent(paneId, 5, false);

      terminals.push({
        name: window.name,
        workingDirectory,
        currentCommand,
        lastLines: lastLines || null,
      });
    }

    return terminals;
  }

  async createTerminal(
    params: CreateTerminalParams
  ): Promise<CreateTerminalResult> {
    const session = await findSessionByName(this.sessionName);

    if (!session) {
      throw new Error(
        `Session '${this.sessionName}' not found. Call initialize() first.`
      );
    }

    const isUnique = await isWindowNameUnique(session.id, params.name);
    if (!isUnique) {
      throw new Error(
        `Terminal with name '${params.name}' already exists. Please choose a unique name.`
      );
    }

    const windowResult = await createWindow(session.id, params.name, {
      workingDirectory: params.workingDirectory,
      command: params.initialCommand ?? null,
    });

    if (!windowResult) {
      throw new Error(`Failed to create terminal '${params.name}'`);
    }

    const paneId = windowResult.paneId;

    const workingDirectory = await getCurrentWorkingDirectory(paneId);
    const currentCommand = await getCurrentCommand(paneId);

    return {
      name: windowResult.name,
      workingDirectory,
      currentCommand,
      commandOutput: windowResult.output || null,
      lastLines: null,
    };
  }

  async captureTerminal(
    terminalName: string,
    lines = 200,
    maxWait?: number
  ): Promise<string> {
    const session = await findSessionByName(this.sessionName);
    if (!session) {
      throw new Error(`Session '${this.sessionName}' not found.`);
    }

    const window = await findWindowByName(session.id, terminalName);
    if (!window) {
      const windows = await listWindows(session.id);
      const availableNames = windows.map((w) => w.name).join(", ");
      throw new Error(
        `Terminal '${terminalName}' not found. Available terminals: ${availableNames}`
      );
    }

    const panes = await listPanes(window.id);
    const pane = panes[0];
    if (!pane) {
      throw new Error(`No pane found for terminal ${terminalName}`);
    }

    if (maxWait) {
      return waitForPaneActivityToSettle(pane.id, maxWait, lines);
    }

    return capturePaneContent(pane.id, lines, false);
  }

  async sendText(
    terminalName: string,
    text: string,
    pressEnter = false,
    return_output?: {
      lines?: number;
      waitForSettled?: boolean;
      maxWait?: number;
    }
  ): Promise<string | null> {
    const session = await findSessionByName(this.sessionName);
    if (!session) {
      throw new Error(`Session '${this.sessionName}' not found.`);
    }

    const window = await findWindowByName(session.id, terminalName);
    if (!window) {
      const windows = await listWindows(session.id);
      const availableNames = windows.map((w) => w.name).join(", ");
      throw new Error(
        `Terminal '${terminalName}' not found. Available terminals: ${availableNames}`
      );
    }

    const panes = await listPanes(window.id);
    const pane = panes[0];
    if (!pane) {
      throw new Error(`No pane found for terminal ${terminalName}`);
    }

    return tmuxSendText({
      paneId: pane.id,
      text,
      pressEnter,
      return_output,
    });
  }

  async sendKeys(
    terminalName: string,
    keys: string,
    repeat = 1,
    return_output?: {
      lines?: number;
      waitForSettled?: boolean;
      maxWait?: number;
    }
  ): Promise<string | null> {
    const session = await findSessionByName(this.sessionName);
    if (!session) {
      throw new Error(`Session '${this.sessionName}' not found.`);
    }

    const window = await findWindowByName(session.id, terminalName);
    if (!window) {
      const windows = await listWindows(session.id);
      const availableNames = windows.map((w) => w.name).join(", ");
      throw new Error(
        `Terminal '${terminalName}' not found. Available terminals: ${availableNames}`
      );
    }

    const panes = await listPanes(window.id);
    const pane = panes[0];
    if (!pane) {
      throw new Error(`No pane found for terminal ${terminalName}`);
    }

    return tmuxSendKeys({
      paneId: pane.id,
      keys,
      repeat,
      return_output,
    });
  }

  async renameTerminal(terminalName: string, newName: string): Promise<void> {
    const session = await findSessionByName(this.sessionName);

    if (!session) {
      throw new Error(`Session '${this.sessionName}' not found.`);
    }

    await renameWindow(session.id, terminalName, newName);
  }

  async killTerminal(terminalName: string): Promise<void> {
    const session = await findSessionByName(this.sessionName);

    if (!session) {
      throw new Error(`Session '${this.sessionName}' not found.`);
    }

    const window = await findWindowByName(session.id, terminalName);
    if (!window) {
      const windows = await listWindows(session.id);
      const availableNames = windows.map((w) => w.name).join(", ");
      throw new Error(
        `Terminal '${terminalName}' not found. Available terminals: ${availableNames}`
      );
    }

    await killWindow(window.id);
  }

  async executeCommand(
    command: string,
    workingDirectory: string,
    maxWait?: number
  ): Promise<{
    commandId: string;
    output: string;
    exitCode: number | null;
    isDead: boolean;
  }> {
    const session = await findSessionByName(this.sessionName);
    if (!session) {
      throw new Error(
        `Session '${this.sessionName}' not found. Call initialize() first.`
      );
    }

    const result = await tmuxExecuteCommand({
      sessionId: session.id,
      command,
      workingDirectory,
      maxWait,
    });

    return {
      commandId: result.windowId,
      output: result.output,
      exitCode: result.exitCode,
      isDead: result.isDead,
    };
  }

  async listCommands(): Promise<CommandInfo[]> {
    const session = await findSessionByName(this.sessionName);

    if (!session) {
      throw new Error(
        `Session '${this.sessionName}' not found. Call initialize() first.`
      );
    }

    const windows = await listWindows(session.id);
    const commands: CommandInfo[] = [];

    for (const window of windows) {
      const paneId = `${window.id}.0`;

      const deadStatus = await executeTmux([
        "display-message",
        "-p",
        "-t",
        paneId,
        "#{pane_dead}",
      ]);
      const isDead = deadStatus === "1";

      const workingDirectory = await getStoredWorkingDirectory(
        window.id,
        paneId
      );
      const currentCommand = await getStoredCommand(window.id, paneId);
      const rawLastLines = await capturePaneContent(paneId, 5, false);
      const lastLinesExtracted = extractExitCodeMarkerFromOutput(rawLastLines);
      const lastLines = lastLinesExtracted.output;

      let exitCode: number | null = null;
      if (isDead) {
        const exitCodeStr = await executeTmux([
          "display-message",
          "-p",
          "-t",
          paneId,
          "#{pane_dead_status}",
        ]);
        const parsed = Number.parseInt(exitCodeStr, 10);
        exitCode = Number.isFinite(parsed)
          ? parsed
          : lastLinesExtracted.exitCode;
      }

      commands.push({
        id: window.id,
        name: window.name,
        workingDirectory,
        currentCommand,
        isDead,
        exitCode,
        lastLines: lastLines || null,
      });
    }

    return commands;
  }

  async captureCommand(
    commandId: string,
    lines = 200
  ): Promise<{
    output: string;
    exitCode: number | null;
    isDead: boolean;
  }> {
    const session = await findSessionByName(this.sessionName);
    if (!session) {
      throw new Error(`Session '${this.sessionName}' not found.`);
    }

    const paneId = `${commandId}.0`;

    const rawOutput = await capturePaneContent(paneId, lines, false);
    const extracted = extractExitCodeMarkerFromOutput(rawOutput);
    const output = extracted.output;

    const deadStatus = await executeTmux([
      "display-message",
      "-p",
      "-t",
      paneId,
      "#{pane_dead}",
    ]);
    const isDead = deadStatus === "1";

    let exitCode: number | null = null;
    if (isDead) {
      const exitCodeStr = await executeTmux([
        "display-message",
        "-p",
        "-t",
        paneId,
        "#{pane_dead_status}",
      ]);
      const parsed = Number.parseInt(exitCodeStr, 10);
      exitCode = Number.isFinite(parsed) ? parsed : extracted.exitCode;
    }

    return {
      output,
      exitCode,
      isDead,
    };
  }

  async sendTextToCommand(
    commandId: string,
    text: string,
    pressEnter = false,
    return_output?: {
      lines?: number;
      waitForSettled?: boolean;
      maxWait?: number;
    }
  ): Promise<string | null> {
    const session = await findSessionByName(this.sessionName);
    if (!session) {
      throw new Error(`Session '${this.sessionName}' not found.`);
    }

    const paneId = `${commandId}.0`;

    return tmuxSendText({
      paneId,
      text,
      pressEnter,
      return_output,
    });
  }

  async sendKeysToCommand(
    commandId: string,
    keys: string,
    repeat = 1,
    return_output?: {
      lines?: number;
      waitForSettled?: boolean;
      maxWait?: number;
    }
  ): Promise<string | null> {
    const session = await findSessionByName(this.sessionName);
    if (!session) {
      throw new Error(`Session '${this.sessionName}' not found.`);
    }

    const paneId = `${commandId}.0`;

    return tmuxSendKeys({
      paneId,
      keys,
      repeat,
      return_output,
    });
  }

  async killCommand(commandId: string): Promise<void> {
    const session = await findSessionByName(this.sessionName);
    if (!session) {
      throw new Error(`Session '${this.sessionName}' not found.`);
    }

    await killWindow(commandId);
  }
}
