import {
  exec as execCallback,
  execFile as execFileCallback,
} from "node:child_process";
import os from "node:os";
import { promisify } from "node:util";
import { v4 as uuidv4 } from "uuid";

const exec = promisify(execCallback);
const execFile = promisify(execFileCallback);

export interface TmuxSession {
  id: string;
  name: string;
  attached: boolean;
  windows: number;
}

export interface TmuxWindow {
  id: string;
  name: string;
  active: boolean;
  sessionId: string;
}

export interface TmuxPane {
  id: string;
  windowId: string;
  active: boolean;
  title: string;
}

interface CommandExecution {
  id: string;
  paneId: string;
  command: string;
  status: "pending" | "completed" | "error";
  startTime: Date;
  result?: string;
  exitCode?: number;
  rawMode?: boolean;
}

export type ShellType = "bash" | "zsh" | "fish";

let shellConfig: { type: ShellType } = { type: "bash" };

const ANSI_ESCAPE_REGEX =
  // biome-ignore lint/suspicious/noControlCharactersInRegex: necessary for this context
  /\u001B[[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

const EXIT_CODE_MARKER = "__OPENBEAM_EXIT_CODE__:";

function stripAnsiSequences(value: string): string {
  if (!value) {
    return "";
  }
  return value.replace(ANSI_ESCAPE_REGEX, "");
}

export function extractExitCodeMarkerFromOutput(output: string): {
  exitCode: number | null;
  output: string;
} {
  if (!output) {
    return { exitCode: null, output };
  }

  let exitCode: number | null = null;
  const kept: string[] = [];

  for (const line of output.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith(EXIT_CODE_MARKER)) {
      const codeStr = trimmed.slice(EXIT_CODE_MARKER.length).trim();
      const parsed = Number.parseInt(codeStr, 10);
      if (Number.isFinite(parsed)) {
        exitCode = parsed;
      }
      continue;
    }
    kept.push(line);
  }

  return { exitCode, output: kept.join("\n").trimEnd() };
}

export function setShellConfig(config: { type: string }): void {
  const validShells: ShellType[] = ["bash", "zsh", "fish"];

  if (validShells.includes(config.type as ShellType)) {
    shellConfig = { type: config.type as ShellType };
  } else {
    shellConfig = { type: "bash" };
  }
}

export async function executeTmux(args: string[]): Promise<string> {
  try {
    const { stdout } = await execFile("tmux", args);
    return stdout.trim();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to execute tmux command: ${message}`);
  }
}

export async function isTmuxRunning(): Promise<boolean> {
  try {
    await executeTmux(["list-sessions", "-F", "#{session_name}"]);
    return true;
  } catch {
    return false;
  }
}

export async function listSessions(): Promise<TmuxSession[]> {
  const format =
    "#{session_id}:#{session_name}:#{?session_attached,1,0}:#{session_windows}";
  const output = await executeTmux(["list-sessions", "-F", format]);

  if (!output) {
    return [];
  }

  return output.split("\n").map((line) => {
    const [id, name, attached, windows] = line.split(":");
    return {
      id: id ?? "",
      name: name ?? "",
      attached: attached === "1",
      windows: Number.parseInt(windows ?? "0", 10),
    };
  });
}

export async function findSessionByName(
  name: string
): Promise<TmuxSession | null> {
  try {
    const sessions = await listSessions();
    return sessions.find((session) => session.name === name) || null;
  } catch {
    return null;
  }
}

export async function findWindowByName(
  sessionId: string,
  name: string
): Promise<TmuxWindow | null> {
  try {
    const windows = await listWindows(sessionId);
    return windows.find((window) => window.name === name) || null;
  } catch {
    return null;
  }
}

export async function isWindowNameUnique(
  sessionId: string,
  name: string
): Promise<boolean> {
  const window = await findWindowByName(sessionId, name);
  return window === null;
}

export async function listWindows(sessionId: string): Promise<TmuxWindow[]> {
  const format = "#{window_id}:#{window_name}:#{?window_active,1,0}";
  const output = await executeTmux([
    "list-windows",
    "-t",
    sessionId,
    "-F",
    format,
  ]);

  if (!output) {
    return [];
  }

  return output.split("\n").map((line) => {
    const [id, name, active] = line.split(":");
    return {
      id: id ?? "",
      name: name ?? "",
      active: active === "1",
      sessionId,
    };
  });
}

export async function listPanes(windowId: string): Promise<TmuxPane[]> {
  const format = "#{pane_id}:#{pane_title}:#{?pane_active,1,0}";
  const output = await executeTmux([
    "list-panes",
    "-t",
    windowId,
    "-F",
    format,
  ]);

  if (!output) {
    return [];
  }

  return output.split("\n").map((line) => {
    const [id, title, active] = line.split(":");
    return {
      id: id ?? "",
      windowId,
      title: title ?? "",
      active: active === "1",
    };
  });
}

export async function capturePaneContent(
  paneId: string,
  lines = 200,
  includeColors = false
): Promise<string> {
  const captureLines = Math.max(lines, 1000);
  const args = ["capture-pane", "-p"];
  if (includeColors) {
    args.push("-e");
  }
  args.push("-t", paneId, "-S", `-${captureLines}`, "-E", "-");
  const output = await executeTmux(args);

  const trimmed = output.trimEnd();
  const allLines = trimmed.split("\n");
  const lastLines = allLines.slice(-lines);
  const joined = lastLines.join("\n");

  return includeColors ? joined : stripAnsiSequences(joined);
}

export async function getCurrentWorkingDirectory(
  paneId: string
): Promise<string> {
  try {
    const tmuxPath = await executeTmux([
      "display-message",
      "-p",
      "-t",
      paneId,
      "#{pane_current_path}",
    ]);

    if (tmuxPath?.trim()) {
      return tmuxPath;
    }

    const shellPid = await executeTmux([
      "display-message",
      "-p",
      "-t",
      paneId,
      "#{pane_pid}",
    ]);
    const { stdout } = await exec(
      `lsof -a -p ${shellPid.trim()} -d cwd -Fn | grep '^n' | cut -c2-`
    );
    return stdout.trim() || tmuxPath;
  } catch {
    return "";
  }
}

export async function getStoredWorkingDirectory(
  windowId: string,
  paneId: string
): Promise<string> {
  try {
    const stored = await executeTmux([
      "show-window-options",
      "-t",
      windowId,
      "-v",
      "@working_directory",
    ]);
    if (stored?.trim()) {
      return stored.trim();
    }
    // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
  } catch {}
  return getCurrentWorkingDirectory(paneId);
}

export async function getCurrentCommand(paneId: string): Promise<string> {
  try {
    const shellPid = await executeTmux([
      "display-message",
      "-p",
      "-t",
      paneId,
      "#{pane_pid}",
    ]);

    const { stdout: childPid } = await exec(
      `ps ax -o pid=,ppid=,comm= | awk '$2 == ${shellPid.trim()} { print $1; exit }'`
    );

    if (childPid.trim()) {
      const { stdout: fullCmd } = await exec(
        `ps -p ${childPid.trim()} -o args= | sed 's/\\\\012.*//'`
      );
      const command = fullCmd.trim();
      if (command) {
        return command;
      }
    }

    const { stdout: shellCmd } = await exec(`ps -p ${shellPid} -o comm=`);
    return shellCmd.trim();
  } catch {
    return executeTmux([
      "display-message",
      "-p",
      "-t",
      paneId,
      "#{pane_current_command}",
    ]);
  }
}

export async function getStoredCommand(
  windowId: string,
  paneId: string
): Promise<string> {
  try {
    const stored = await executeTmux([
      "show-window-options",
      "-t",
      windowId,
      "-v",
      "@command",
    ]);
    if (stored?.trim()) {
      return stored.trim();
    }
    // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
  } catch {}
  return getCurrentCommand(paneId);
}

export async function createSession(name: string): Promise<TmuxSession | null> {
  const homeDir = process.env.HOME || "~";
  await executeTmux([
    "new-session",
    "-d",
    "-s",
    name,
    "-n",
    "default",
    "-c",
    homeDir,
  ]);

  const session = await findSessionByName(name);
  if (!session) {
    return null;
  }

  await executeTmux([
    "set-window-option",
    "-t",
    session.id,
    "automatic-rename",
    "off",
  ]);

  return session;
}

export function expandTilde(path: string): string {
  if (path.startsWith("~/")) {
    const homeDir = process.env.HOME || os.homedir();
    return path.replace("~", homeDir);
  }
  if (path === "~") {
    return process.env.HOME || os.homedir();
  }
  return path;
}

export async function createWindow(
  sessionId: string,
  name: string,
  options?: {
    workingDirectory?: string;
    command?: string | null;
  }
): Promise<(TmuxWindow & { paneId: string; output?: string | null }) | null> {
  const isUnique = await isWindowNameUnique(sessionId, name);
  if (!isUnique) {
    throw new Error(
      `Terminal with name '${name}' already exists. Please choose a unique name.`
    );
  }

  const args = ["new-window", "-t", sessionId, "-n", name];
  if (options?.workingDirectory) {
    const expandedPath = expandTilde(options.workingDirectory);
    args.push("-c", expandedPath);
  }

  await executeTmux(args);
  const windows = await listWindows(sessionId);
  // biome-ignore lint/nursery/noShadow: intentional variable scoping
  const window = windows.find((window) => window.name === name);

  if (!window) {
    return null;
  }

  await executeTmux([
    "set-window-option",
    "-t",
    window.id,
    "automatic-rename",
    "off",
  ]);

  const panes = await listPanes(window.id);
  const defaultPane = panes[0];

  let commandOutput: string | null = null;

  if (options?.command && defaultPane) {
    commandOutput = (await sendText({
      paneId: defaultPane.id,
      text: options.command,
      pressEnter: true,
      return_output: {
        waitForSettled: true,
        maxWait: 120_000,
      },
    })) as string;
  }

  return {
    ...window,
    paneId: defaultPane?.id || "",
    output: commandOutput,
  };
}

export async function executeCommand({
  sessionId,
  command,
  workingDirectory,
  maxWait = 120_000,
}: {
  sessionId: string;
  command: string;
  workingDirectory: string;
  maxWait?: number;
}): Promise<{
  windowId: string;
  paneId: string;
  output: string;
  exitCode: number | null;
  isDead: boolean;
}> {
  const windowName = `cmd-${Date.now()}`;
  const expandedPath = expandTilde(workingDirectory);

  const args = [
    "new-window",
    "-t",
    sessionId,
    "-n",
    windowName,
    "-c",
    expandedPath,
  ];
  await executeTmux(args);

  const windows = await listWindows(sessionId);
  const window = windows.find((w) => w.name === windowName);
  if (!window) {
    throw new Error("Failed to create window for command execution");
  }

  await executeTmux([
    "set-window-option",
    "-t",
    window.id,
    "remain-on-exit",
    "on",
  ]);

  await executeTmux([
    "set-window-option",
    "-t",
    window.id,
    "automatic-rename",
    "off",
  ]);

  await executeTmux([
    "set-window-option",
    "-t",
    window.id,
    "@command",
    command,
  ]);
  await executeTmux([
    "set-window-option",
    "-t",
    window.id,
    "@working_directory",
    expandedPath,
  ]);

  const panes = await listPanes(window.id);
  const pane = panes[0];
  if (!pane) {
    throw new Error("No pane found in created window");
  }

  const wrappedCommand = `bash -c 'cd "${expandedPath}" && ${command.replace(/'/g, "'\\''")} 2>&1; code=$?; echo ${EXIT_CODE_MARKER}$code; exit $code'`;
  await executeTmux(["respawn-pane", "-t", pane.id, "-k", wrappedCommand]);

  const startTime = Date.now();
  let output = "";
  let isDead = false;
  let exitCode: number | null = null;

  const emptyOutputGraceMs = Math.min(maxWait, 2000);

  while (Date.now() - startTime < maxWait) {
    const deadStatus = await executeTmux([
      "display-message",
      "-p",
      "-t",
      pane.id,
      "#{pane_dead}",
    ]);
    isDead = deadStatus === "1";

    if (isDead) {
      output = await capturePaneContent(pane.id, 1000, false);
      const extracted = extractExitCodeMarkerFromOutput(output);
      output = extracted.output;
      const exitCodeStr = await executeTmux([
        "display-message",
        "-p",
        "-t",
        pane.id,
        "#{pane_dead_status}",
      ]);
      const parsed = Number.parseInt(exitCodeStr, 10);
      exitCode = Number.isFinite(parsed) ? parsed : extracted.exitCode;
      break;
    }

    const currentOutput = await capturePaneContent(pane.id, 1000, false);
    if (currentOutput === output) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const confirmedOutput = await capturePaneContent(pane.id, 1000, false);
      if (confirmedOutput === currentOutput) {
        const elapsed = Date.now() - startTime;
        if (!confirmedOutput && elapsed < emptyOutputGraceMs) {
          continue;
        }
        output = confirmedOutput;
        break;
      }
    }
    output = currentOutput;

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  if (!(isDead || output)) {
    output = await capturePaneContent(pane.id, 1000, false);
  }

  return {
    windowId: window.id,
    paneId: pane.id,
    output,
    exitCode,
    isDead,
  };
}

export async function killSession(sessionId: string): Promise<void> {
  await executeTmux(["kill-session", "-t", sessionId]);
}

export async function killWindow(windowId: string): Promise<void> {
  await executeTmux(["kill-window", "-t", windowId]);
}

export async function killPane(paneId: string): Promise<void> {
  await executeTmux(["kill-pane", "-t", paneId]);
}

export async function renameWindow(
  sessionId: string,
  windowNameOrId: string,
  newName: string
): Promise<void> {
  const isUnique = await isWindowNameUnique(sessionId, newName);
  if (!isUnique) {
    throw new Error(
      `Terminal with name '${newName}' already exists. Please choose a unique name.`
    );
  }

  let windowId: string;
  if (windowNameOrId.startsWith("@")) {
    windowId = windowNameOrId;
  } else {
    const window = await findWindowByName(sessionId, windowNameOrId);
    if (!window) {
      throw new Error(`Terminal '${windowNameOrId}' not found.`);
    }
    windowId = window.id;
  }

  await executeTmux(["rename-window", "-t", windowId, newName]);
  await executeTmux([
    "set-window-option",
    "-t",
    windowId,
    "automatic-rename",
    "off",
  ]);
}

export async function splitPane(
  targetPaneId: string,
  direction: "horizontal" | "vertical" = "vertical",
  size?: number
): Promise<TmuxPane | null> {
  const args = ["split-window"];

  if (direction === "horizontal") {
    args.push("-h");
  } else {
    args.push("-v");
  }

  args.push("-t", targetPaneId);

  if (size !== undefined && size > 0 && size < 100) {
    args.push("-p", size.toString());
  }

  await executeTmux(args);

  const windowInfo = await executeTmux([
    "display-message",
    "-p",
    "-t",
    targetPaneId,
    "#{window_id}",
  ]);

  const panes = await listPanes(windowInfo);

  // biome-ignore lint/style/noNonNullAssertion: value guaranteed to be set
  return panes.length > 0 ? panes.at(-1)! : null;
}

const activeCommands = new Map<string, CommandExecution>();

const startMarkerText = "TMUX_MCP_START";
const endMarkerPrefix = "TMUX_MCP_DONE_";

export async function executeCommandLegacy(
  paneId: string,
  command: string,
  rawMode?: boolean,
  noEnter?: boolean
): Promise<string> {
  const commandId = uuidv4();

  let fullCommand: string;
  if (rawMode || noEnter) {
    fullCommand = command;
  } else {
    const endMarkerText = getEndMarkerText();
    fullCommand = `echo "${startMarkerText}"; ${command}; echo "${endMarkerText}"`;
  }

  activeCommands.set(commandId, {
    id: commandId,
    paneId,
    command,
    status: "pending",
    startTime: new Date(),
    rawMode: rawMode || noEnter,
  });

  if (noEnter) {
    const specialKeys = [
      "Up",
      "Down",
      "Left",
      "Right",
      "Escape",
      "Tab",
      "Enter",
      "Space",
      "BSpace",
      "Delete",
      "Home",
      "End",
      "PageUp",
      "PageDown",
      "F1",
      "F2",
      "F3",
      "F4",
      "F5",
      "F6",
      "F7",
      "F8",
      "F9",
      "F10",
      "F11",
      "F12",
      "BTab",
    ];

    const parts = fullCommand.split("-");
    // biome-ignore lint/style/noNonNullAssertion: value guaranteed to be set
    const isSpecialKey = parts.length === 1 && specialKeys.includes(parts[0]!);
    const isKeyCombo =
      parts.length > 1 &&
      (parts[0] === "C" || parts[0] === "M" || parts[0] === "S");

    if (isSpecialKey || isKeyCombo) {
      const args = ["send-keys", "-t", paneId];
      args.push(...fullCommand.split(" "));
      await executeTmux(args);
    } else {
      for (const char of fullCommand) {
        await executeTmux(["send-keys", "-t", paneId, char]);
      }
    }
  } else {
    await executeTmux(["send-keys", "-t", paneId, fullCommand, "Enter"]);
  }

  return commandId;
}

export async function checkCommandStatus(
  commandId: string
): Promise<CommandExecution | null> {
  const command = activeCommands.get(commandId);
  if (!command) {
    return null;
  }

  if (command.status !== "pending") {
    return command;
  }

  const content = await capturePaneContent(command.paneId, 1000);

  if (command.rawMode) {
    command.result =
      "Status tracking unavailable for rawMode commands. Use capture-pane to monitor interactive apps instead.";
    return command;
  }

  const startIndex = content.lastIndexOf(startMarkerText);
  const endIndex = content.lastIndexOf(endMarkerPrefix);

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    command.result = "Command output could not be captured properly";
    return command;
  }

  // biome-ignore lint/style/noNonNullAssertion: value guaranteed to be set
  const endLine = content.substring(endIndex).split("\n")[0]!;
  const endMarkerRegex = new RegExp(`${endMarkerPrefix}(\\d+)`);
  const exitCodeMatch = endLine.match(endMarkerRegex);

  if (exitCodeMatch) {
    // biome-ignore lint/style/noNonNullAssertion: value guaranteed to be set
    const exitCode = Number.parseInt(exitCodeMatch[1]!, 10);

    command.status = exitCode === 0 ? "completed" : "error";
    command.exitCode = exitCode;

    const outputStart = startIndex + startMarkerText.length;
    const outputContent = content.substring(outputStart, endIndex).trim();

    command.result = outputContent
      .substring(outputContent.indexOf("\n") + 1)
      .trim();

    activeCommands.set(commandId, command);
  }

  return command;
}

export function getCommand(commandId: string): CommandExecution | null {
  return activeCommands.get(commandId) || null;
}

export function getActiveCommandIds(): string[] {
  return Array.from(activeCommands.keys());
}

export function cleanupOldCommands(maxAgeMinutes = 60): void {
  const now = new Date();

  for (const [id, command] of activeCommands.entries()) {
    const ageMinutes =
      (now.getTime() - command.startTime.getTime()) / (1000 * 60);

    if (command.status !== "pending" && ageMinutes > maxAgeMinutes) {
      activeCommands.delete(id);
    }
  }
}

function getEndMarkerText(): string {
  return shellConfig.type === "fish"
    ? `${endMarkerPrefix}$status`
    : `${endMarkerPrefix}$?`;
}

export type ListScope = "all" | "sessions" | "session" | "window" | "pane";

interface SessionWithWindows extends TmuxSession {
  windowDetails?: WindowWithPanes[];
}

interface WindowWithPanes extends TmuxWindow {
  paneDetails?: TmuxPane[];
}

export async function list({
  scope,
  target,
}: {
  scope: ListScope;
  target?: string;
}): Promise<
  | SessionWithWindows[]
  | TmuxSession[]
  | TmuxWindow[]
  | TmuxPane[]
  | TmuxSession
  | TmuxWindow
  | TmuxPane
> {
  if (scope === "all") {
    const sessions = await listSessions();
    const sessionsWithDetails: SessionWithWindows[] = [];

    for (const session of sessions) {
      const windows = await listWindows(session.id);
      const windowsWithPanes: WindowWithPanes[] = [];

      for (const window of windows) {
        const panes = await listPanes(window.id);
        windowsWithPanes.push({
          ...window,
          paneDetails: panes,
        });
      }

      sessionsWithDetails.push({
        ...session,
        windowDetails: windowsWithPanes,
      });
    }

    return sessionsWithDetails;
  }

  if (scope === "sessions") {
    return listSessions();
  }

  if (scope === "session") {
    if (!target) {
      throw new Error("target is required for scope 'session'");
    }
    return listWindows(target);
  }

  if (scope === "window") {
    if (!target) {
      throw new Error("target is required for scope 'window'");
    }
    return listPanes(target);
  }

  if (scope === "pane") {
    if (!target) {
      throw new Error("target is required for scope 'pane'");
    }
    const windowId = await executeTmux([
      "display-message",
      "-p",
      "-t",
      target,
      "#{window_id}",
    ]);
    const panes = await listPanes(windowId);
    const pane = panes.find((p) => p.id === target);
    if (!pane) {
      throw new Error(`Pane not found: ${target}`);
    }
    return pane;
  }

  throw new Error(`Invalid scope: ${scope}`);
}

export type KillScope = "session" | "window" | "pane";

// biome-ignore lint/suspicious/useAwait: async signature required by interface
export async function kill({
  scope,
  target,
}: {
  scope: KillScope;
  target: string;
}): Promise<void> {
  if (scope === "session") {
    return killSession(target);
  }

  if (scope === "window") {
    return killWindow(target);
  }

  if (scope === "pane") {
    return killPane(target);
  }

  throw new Error(`Invalid scope: ${scope}`);
}

export interface ShellCommandResult {
  command: string;
  status: "completed" | "error";
  exitCode: number;
  output: string;
}

export async function executeShellCommand({
  paneId,
  command,
  timeout = 30_000,
}: {
  paneId: string;
  command: string;
  timeout?: number;
}): Promise<ShellCommandResult> {
  const commandId = uuidv4();
  const endMarkerText = getEndMarkerText();
  const fullCommand = `echo "${startMarkerText}"; ${command}; echo "${endMarkerText}"`;

  activeCommands.set(commandId, {
    id: commandId,
    paneId,
    command,
    status: "pending",
    startTime: new Date(),
    rawMode: false,
  });

  await executeTmux(["send-keys", "-t", paneId, fullCommand, "Enter"]);

  const startTime = Date.now();
  const pollInterval = 100;

  while (Date.now() - startTime < timeout) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval));

    const result = await checkCommandStatus(commandId);

    if (result && result.status !== "pending") {
      activeCommands.delete(commandId);

      return {
        command: result.command,
        status: result.status,
        // biome-ignore lint/style/noNonNullAssertion: value guaranteed to be set
        exitCode: result.exitCode!,
        output: result.result || "",
      };
    }
  }

  activeCommands.delete(commandId);
  throw new Error(
    `Command timed out after ${timeout}ms. Use capture-pane to check pane state.`
  );
}

export async function sendKeys({
  paneId,
  keys,
  repeat = 1,
  return_output,
}: {
  paneId: string;
  keys: string;
  repeat?: number;
  return_output?: {
    lines?: number;
    waitForSettled?: boolean;
    maxWait?: number;
  };
}): Promise<string | null> {
  for (let i = 0; i < repeat; i++) {
    const args = ["send-keys", "-t", paneId];
    args.push(...keys.split(" "));
    await executeTmux(args);
  }

  if (return_output) {
    const lines = return_output.lines || 200;
    const waitForSettled = return_output.waitForSettled ?? true;
    const maxWait = return_output.maxWait ?? 120_000;

    if (waitForSettled) {
      return waitForPaneActivityToSettle(paneId, maxWait, lines);
    }
    return capturePaneContent(paneId, lines, false);
  }

  return null;
}

export async function waitForPaneActivityToSettle(
  paneId: string,
  maxWait: number,
  lines: number
): Promise<string> {
  const settleTime = 1000;
  const pollInterval = 100;

  let lastContent = "";
  let lastChangeTime = Date.now();
  const startTime = Date.now();

  while (true) {
    const elapsed = Date.now() - startTime;
    if (elapsed >= maxWait) {
      return lastContent;
    }

    const content = await capturePaneContent(paneId, lines, false);

    if (content !== lastContent) {
      lastContent = content;
      lastChangeTime = Date.now();
    } else if (Date.now() - lastChangeTime >= settleTime) {
      return content;
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }
}

export async function sendText({
  paneId,
  text,
  pressEnter = false,
  return_output,
}: {
  paneId: string;
  text: string;
  pressEnter?: boolean;
  return_output?: {
    lines?: number;
    waitForSettled?: boolean;
    maxWait?: number;
  };
}): Promise<string | null> {
  for (const char of text) {
    await executeTmux(["send-keys", "-l", "-t", paneId, char]);
  }

  if (pressEnter) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    await executeTmux(["send-keys", "-t", paneId, "Enter"]);
  }

  if (return_output) {
    const lines = return_output.lines || 200;
    const waitForSettled = return_output.waitForSettled ?? true;
    const maxWait = return_output.maxWait ?? 120_000;

    if (waitForSettled) {
      return waitForPaneActivityToSettle(paneId, maxWait, lines);
    }
    return capturePaneContent(paneId, lines, false);
  }

  return null;
}
