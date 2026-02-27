import type { DaemonClient } from "@server/client/daemon-client";
import { z } from "zod";

const DEFAULT_CONTEXT_TIMEOUT_MS = 250;

type DictationAppProfile = "chat" | "notes" | "email" | "code" | "default";

type DictationPastePreparation = {
  text: string;
  appProfile: DictationAppProfile;
  usedAccessibilityContext: boolean;
};

type DictationPasteContextClient = Pick<
  DaemonClient,
  "getNativeHelperAccessibilityContext"
>;

type DictationPasteContextWarnFn = (message: string, error?: unknown) => void;

type DictationAccessibilityContext = {
  bundleIdentifier: string | null;
  windowUrl: string | null;
  preSelectionText: string | null;
  postSelectionText: string | null;
};

const DictationAccessibilityContextResultSchema = z
  .object({
    context: z
      .object({
        application: z
          .object({
            bundleIdentifier: z.string().nullable().optional(),
          })
          .passthrough()
          .nullable()
          .optional(),
        windowInfo: z
          .object({
            url: z.string().nullable().optional(),
          })
          .passthrough()
          .nullable()
          .optional(),
        textSelection: z
          .object({
            preSelectionText: z.string().nullable().optional(),
            postSelectionText: z.string().nullable().optional(),
          })
          .passthrough()
          .nullable()
          .optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
  })
  .passthrough();

const BROWSER_BUNDLE_HINTS = [
  "safari",
  "chrome",
  "chromium",
  "firefox",
  "edge",
  "brave",
  "arc",
  "opera",
  "vivaldi",
] as const;

const CHAT_APP_BUNDLE_HINTS = [
  "slack",
  "discord",
  "telegram",
  "whatsapp",
  "wechat",
  "microsoft.teams",
] as const;

const NOTES_APP_BUNDLE_HINTS = [
  "notion",
  "obsidian",
  "evernote",
  "onenote",
  "roam",
  "logseq",
  "craft",
] as const;

const EMAIL_APP_BUNDLE_HINTS = [
  "mail",
  "outlook",
  "superhuman",
  "spark",
  "canarymail",
] as const;

const CODE_APP_BUNDLE_HINTS = [
  "visual-studio-code",
  "vscode",
  "cursor",
  "windsurf",
  "jetbrains",
  "xcode",
  "sublime_text",
  "zed",
] as const;

const CHAT_URL_PATTERNS = [
  /slack\.com/,
  /discord\.com\/channels/,
  /teams\.microsoft\.com/,
  /web\.whatsapp\.com/,
  /web\.telegram\.org/,
  /messenger\.com/,
] as const;

const NOTES_URL_PATTERNS = [
  /notion\.so/,
  /docs\.google\.com/,
  /coda\.io/,
  /workflowy\.com/,
  /obsidian\.md/,
] as const;

const EMAIL_URL_PATTERNS = [
  /mail\.google\.com/,
  /outlook\.(live|office)\.com/,
  /mail\.yahoo\.com/,
  /mail\.proton\.me/,
  /fastmail\.com/,
] as const;

const CODE_URL_PATTERNS = [
  /github\.com\/.+\/.+\/(blob|pull|issues)/,
  /gitlab\.com/,
  /bitbucket\.org/,
  /vscode\.dev/,
  /github\.dev/,
] as const;

const OPENPLANE_BUNDLE_HINTS = ["openplane"] as const;

const OPENPLANE_URL_PATTERNS = [
  /(?:^|:\/\/)app\.openplane\.dev(?:\/|$)/,
  /(?:^|:\/\/)openplane\.dev(?:\/|$)/,
  /^tauri:\/\/localhost(?:\/|$)/,
  /localhost:1420/,
  /127\.0\.0\.1:1420/,
] as const;

function normalizeTimeoutMs(timeoutMs?: number): number {
  if (
    !Number.isFinite(timeoutMs) ||
    timeoutMs === undefined ||
    timeoutMs <= 0
  ) {
    return DEFAULT_CONTEXT_TIMEOUT_MS;
  }
  return Math.floor(timeoutMs);
}

function normalizeContext(
  result: unknown
): DictationAccessibilityContext | null {
  const parsed = DictationAccessibilityContextResultSchema.safeParse(result);
  if (!(parsed.success && parsed.data.context)) {
    return null;
  }

  return {
    bundleIdentifier: parsed.data.context.application?.bundleIdentifier ?? null,
    windowUrl: parsed.data.context.windowInfo?.url ?? null,
    preSelectionText:
      parsed.data.context.textSelection?.preSelectionText ?? null,
    postSelectionText:
      parsed.data.context.textSelection?.postSelectionText ?? null,
  };
}

function stringContainsAny(text: string, hints: readonly string[]): boolean {
  return hints.some((hint) => text.includes(hint));
}

function isBrowserBundle(bundleIdentifier: string): boolean {
  return stringContainsAny(bundleIdentifier, BROWSER_BUNDLE_HINTS);
}

function matchesAnyPattern(
  value: string,
  patterns: readonly RegExp[]
): boolean {
  return patterns.some((pattern) => pattern.test(value));
}

function isOpenPlaneBundleIdentifier(bundleIdentifier: string): boolean {
  return stringContainsAny(bundleIdentifier, OPENPLANE_BUNDLE_HINTS);
}

function isOpenPlaneWindowUrl(windowUrl: string): boolean {
  return matchesAnyPattern(windowUrl, OPENPLANE_URL_PATTERNS);
}

function isLikelyOpenPlaneContext(
  context: DictationAccessibilityContext
): boolean {
  const bundleId = context.bundleIdentifier?.toLowerCase().trim() ?? "";
  if (bundleId && isOpenPlaneBundleIdentifier(bundleId)) {
    return true;
  }

  const url = context.windowUrl?.toLowerCase().trim() ?? "";
  if (url && isOpenPlaneWindowUrl(url)) {
    return true;
  }

  return false;
}

export function detectDictationAppProfile(
  contextResult: unknown
): DictationAppProfile {
  const context = normalizeContext(contextResult);
  if (!context?.bundleIdentifier) {
    return "default";
  }

  const bundleId = context.bundleIdentifier.toLowerCase();

  if (stringContainsAny(bundleId, CHAT_APP_BUNDLE_HINTS)) {
    return "chat";
  }
  if (stringContainsAny(bundleId, NOTES_APP_BUNDLE_HINTS)) {
    return "notes";
  }
  if (stringContainsAny(bundleId, EMAIL_APP_BUNDLE_HINTS)) {
    return "email";
  }
  if (stringContainsAny(bundleId, CODE_APP_BUNDLE_HINTS)) {
    return "code";
  }

  const url = context.windowUrl?.toLowerCase().trim();
  if (!(url && isBrowserBundle(bundleId))) {
    return "default";
  }

  if (matchesAnyPattern(url, CHAT_URL_PATTERNS)) {
    return "chat";
  }
  if (matchesAnyPattern(url, NOTES_URL_PATTERNS)) {
    return "notes";
  }
  if (matchesAnyPattern(url, EMAIL_URL_PATTERNS)) {
    return "email";
  }
  if (matchesAnyPattern(url, CODE_URL_PATTERNS)) {
    return "code";
  }

  return "default";
}

export function shouldAutoPasteDictationToFocusedApp(
  contextResult: unknown
): boolean {
  const context = normalizeContext(contextResult);
  if (!context) {
    return false;
  }
  if (isLikelyOpenPlaneContext(context)) {
    return false;
  }

  const bundleId = context.bundleIdentifier?.trim() ?? "";
  const url = context.windowUrl?.trim() ?? "";
  return bundleId.length > 0 || url.length > 0;
}

function startsWithWhitespace(text: string): boolean {
  // biome-ignore lint/performance/useTopLevelRegex: scoped regex acceptable here
  return /^\s/.test(text);
}

function endsWithWhitespace(text: string): boolean {
  // biome-ignore lint/performance/useTopLevelRegex: scoped regex acceptable here
  return /\s$/.test(text);
}

function startsWithClosingPunctuation(text: string): boolean {
  // biome-ignore lint/performance/useTopLevelRegex: scoped regex acceptable here
  return /^[,.;:!?)\]}]/.test(text);
}

function startsWithOpeningPunctuation(text: string): boolean {
  // biome-ignore lint/performance/useTopLevelRegex: scoped regex acceptable here
  return /^[([{]/.test(text);
}

function shouldAddLeadingSpace(text: string): boolean {
  if (!text.length) {
    return false;
  }
  if (startsWithWhitespace(text)) {
    return false;
  }
  if (startsWithClosingPunctuation(text)) {
    return false;
  }
  if (startsWithOpeningPunctuation(text)) {
    return false;
  }
  // biome-ignore lint/performance/useTopLevelRegex: scoped regex acceptable here
  if (/^\//.test(text)) {
    return false;
  }
  return true;
}

function shouldAddTrailingSpace(text: string, afterText: string): boolean {
  if (!(text.length && afterText.length)) {
    return false;
  }
  if (endsWithWhitespace(text) || startsWithWhitespace(afterText)) {
    return false;
  }
  // biome-ignore lint/performance/useTopLevelRegex: scoped regex acceptable here
  if (/^[,.;:!?)\]}]/.test(afterText)) {
    return false;
  }
  // biome-ignore lint/performance/useTopLevelRegex: scoped regex acceptable here
  if (/[([{]$/.test(text)) {
    return false;
  }
  return true;
}

const SPOKEN_STRUCTURE_REPLACEMENTS = [
  {
    pattern: /\bnew paragraph\b/gi,
    replacement: "\n\n",
  },
  {
    pattern: /\bnext paragraph\b/gi,
    replacement: "\n\n",
  },
  {
    pattern: /\bnew line\b/gi,
    replacement: "\n",
  },
  {
    pattern: /\bnext line\b/gi,
    replacement: "\n",
  },
  {
    pattern: /\bline break\b/gi,
    replacement: "\n",
  },
] as const;

function normalizeSpokenStructureCommands(text: string): string {
  let output = text;
  for (const replacement of SPOKEN_STRUCTURE_REPLACEMENTS) {
    output = output.replace(replacement.pattern, replacement.replacement);
  }
  return output.replace(/[ \t]*\n[ \t]*/g, "\n");
}

function normalizeNotesListCommands(text: string): string {
  return text.replace(/(^|\n)\s*(?:bullet point|bullet|dash)\s+/gi, "$1- ");
}

function isEmailGreetingLine(line: string): boolean {
  const normalized = line.trim();
  // biome-ignore lint/performance/useTopLevelRegex: scoped regex acceptable here
  return /^(hi|hello|hey|dear)\b/i.test(normalized);
}

function isEmailClosingLine(line: string): boolean {
  const normalized = line.trim();
  // biome-ignore lint/performance/useTopLevelRegex: scoped regex acceptable here
  return /^(thanks|thank you|best|regards|sincerely|cheers|kind regards)\b/i.test(
    normalized
  );
}

function normalizeEmailParagraphBoundaries(text: string): string {
  const lines = text.split("\n");
  if (lines.length < 3) {
    return text;
  }

  const nonEmptyLineIndices = lines.reduce<number[]>((acc, line, index) => {
    if (line.trim().length > 0) {
      acc.push(index);
    }
    return acc;
  }, []);
  if (nonEmptyLineIndices.length < 3) {
    return text;
  }

  // biome-ignore lint/style/noNonNullAssertion: ref guaranteed to be set
  const greetingLineIndex = nonEmptyLineIndices[0]!;
  // biome-ignore lint/style/noNonNullAssertion: ref guaranteed to be set
  const closingLineIndex = nonEmptyLineIndices.at(-1)!;
  const greetingLine = lines[greetingLineIndex] ?? "";
  const closingLine = lines[closingLineIndex] ?? "";
  if (!(isEmailGreetingLine(greetingLine) && isEmailClosingLine(closingLine))) {
    return text;
  }
  if (closingLineIndex <= greetingLineIndex + 1) {
    return text;
  }

  const normalizedLines: string[] = [];
  for (const [index, line] of lines.entries()) {
    const currentLine = line.trimEnd();
    const previousLine =
      // biome-ignore lint/style/noNonNullAssertion: ref guaranteed to be set
      normalizedLines.length > 0 ? normalizedLines.at(-1)! : "";
    if (index === closingLineIndex && previousLine.trim().length > 0) {
      normalizedLines.push("");
    }

    normalizedLines.push(currentLine);

    const sourceNextLine = lines[index + 1] ?? "";
    if (index === greetingLineIndex && sourceNextLine.trim().length > 0) {
      normalizedLines.push("");
    }
  }

  return normalizedLines.join("\n");
}

function normalizeWhitespaceByContext(
  text: string,
  context: DictationAccessibilityContext
): string {
  let output = text;
  const beforeText = context.preSelectionText;
  const afterText = context.postSelectionText;

  if (beforeText !== null) {
    if (startsWithWhitespace(output) && endsWithWhitespace(beforeText)) {
      // biome-ignore lint/performance/useTopLevelRegex: scoped regex acceptable here
      output = output.replace(/^[ \t]+/, "");
    } else if (
      !startsWithWhitespace(output) &&
      beforeText.length > 0 &&
      !endsWithWhitespace(beforeText) &&
      shouldAddLeadingSpace(output)
    ) {
      output = ` ${output}`;
    }
  }

  if (afterText !== null) {
    if (endsWithWhitespace(output) && startsWithWhitespace(afterText)) {
      // biome-ignore lint/performance/useTopLevelRegex: scoped regex acceptable here
      output = output.replace(/[ \t]+$/, "");
    } else if (shouldAddTrailingSpace(output, afterText)) {
      output = `${output} `;
    }
  }

  return output;
}

function normalizeForProfile(
  text: string,
  profile: DictationAppProfile
): string {
  let output = normalizeSpokenStructureCommands(text);

  if (profile === "notes") {
    output = normalizeNotesListCommands(output);
  }

  if (profile === "email") {
    output = normalizeEmailParagraphBoundaries(output);
  }

  if (profile === "chat" || profile === "email") {
    output = output.replace(/\n{3,}/g, "\n\n");
  }

  return output;
}

export function applyDictationContextAwareFormatting(params: {
  transcript: string;
  contextResult: unknown;
}): DictationPastePreparation {
  const { transcript, contextResult } = params;

  if (!transcript.trim()) {
    return {
      text: transcript,
      appProfile: "default",
      usedAccessibilityContext: false,
    };
  }

  const context = normalizeContext(contextResult);
  if (!context) {
    return {
      text: transcript,
      appProfile: "default",
      usedAccessibilityContext: false,
    };
  }

  const appProfile = detectDictationAppProfile(contextResult);
  const withProfileFormatting = normalizeForProfile(transcript, appProfile);
  const withContextWhitespace = normalizeWhitespaceByContext(
    withProfileFormatting,
    context
  );

  return {
    text: withContextWhitespace,
    appProfile,
    usedAccessibilityContext: true,
  };
}

export async function prepareDictationTranscriptForNativePaste(params: {
  transcript: string;
  client: DictationPasteContextClient | null;
  timeoutMs?: number;
  onWarn?: DictationPasteContextWarnFn;
}): Promise<DictationPastePreparation> {
  const { transcript, client, timeoutMs, onWarn } = params;

  if (!(client && transcript.trim())) {
    return {
      text: transcript,
      appProfile: "default",
      usedAccessibilityContext: false,
    };
  }

  try {
    const contextResult = await client.getNativeHelperAccessibilityContext({
      editableOnly: true,
      timeoutMs: normalizeTimeoutMs(timeoutMs),
    });
    return applyDictationContextAwareFormatting({ transcript, contextResult });
  } catch (error) {
    onWarn?.(
      "Failed to fetch native helper accessibility context for dictation paste",
      error
    );
    return {
      text: transcript,
      appProfile: "default",
      usedAccessibilityContext: false,
    };
  }
}
