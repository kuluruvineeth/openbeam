import type { BotResponse, FormField, FormState } from "@openbeam/types/bot";
import { clearFormState, setFormState } from "./form-store";
import { coerceValue, validateField } from "./form-validator";

const CANCEL_WORDS = new Set(["cancel", "abort", "quit", "exit", "stop"]);
const BACK_WORDS = new Set(["back", "go back", "previous"]);
const EDIT_RE = /^edit\s+(.+)/i;

export function firstQuestion(fields: FormField[]): BotResponse {
  const field = fields[0];
  if (!field) {
    return { type: "text", text: "No fields to collect." };
  }
  return fieldPrompt(field);
}

export async function resumeForm(
  state: FormState,
  fields: FormField[],
  userInput: string
): Promise<BotResponse> {
  const input = userInput.trim();
  const inputLower = input.toLowerCase();

  if (CANCEL_WORDS.has(inputLower)) {
    await clearFormState(state.platform, state.conversationKey);
    return { type: "text", text: "Cancelled." };
  }

  if (state.status === "confirming") {
    return handleConfirmation(state, fields, inputLower);
  }

  if (BACK_WORDS.has(inputLower) && state.currentFieldIndex > 0) {
    const prevIndex = state.currentFieldIndex - 1;
    const prevField = fields[prevIndex];
    if (!prevField) {
      return { type: "text", text: "Cannot go back further." };
    }
    const updated = { ...state, currentFieldIndex: prevIndex };
    await setFormState(updated);
    return fieldPrompt(prevField);
  }

  return handleCollecting(state, fields, input);
}

async function handleCollecting(
  state: FormState,
  fields: FormField[],
  input: string
): Promise<BotResponse> {
  const field = fields[state.currentFieldIndex];
  if (!field) {
    await clearFormState(state.platform, state.conversationKey);
    return { type: "text", text: "Form error. Please try again." };
  }

  const validation = validateField(field, input);
  if (!validation.ok) {
    return {
      type: "text",
      text: validation.hint ?? "Invalid input. Please try again.",
      followUps: field.options?.map((o) => o.label),
    };
  }

  const value = coerceValue(field, input);
  const collected = { ...state.collected, [field.id]: value };
  const nextIndex = state.currentFieldIndex + 1;

  if (nextIndex >= fields.length) {
    const updated = {
      ...state,
      collected,
      status: "confirming" as const,
      currentFieldIndex: nextIndex,
    };
    await setFormState(updated);
    return confirmationPrompt(state.actionId, fields, collected);
  }

  const nextField = fields[nextIndex];
  if (!nextField) {
    await clearFormState(state.platform, state.conversationKey);
    return { type: "text", text: "Form error. Please try again." };
  }

  const updated = { ...state, collected, currentFieldIndex: nextIndex };
  await setFormState(updated);
  return fieldPrompt(nextField);
}

async function handleConfirmation(
  state: FormState,
  fields: FormField[],
  input: string
): Promise<BotResponse> {
  if (["yes", "y", "confirm"].includes(input)) {
    const updated = { ...state, status: "executing" as const };
    await setFormState(updated);
    return {
      type: "action_result",
      text: `Executing ${state.actionId}...`,
      actionResult: {
        action: state.actionId,
        success: true,
        message: "Submitted",
      },
      _formResult: {
        connectorId: state.connectorId,
        actionId: state.actionId,
        params: state.collected,
      },
    } as BotResponse;
  }

  if (["no", "n"].includes(input)) {
    await clearFormState(state.platform, state.conversationKey);
    return { type: "text", text: "Cancelled." };
  }

  const editMatch = EDIT_RE.exec(input);
  if (editMatch) {
    const fieldName = (editMatch[1] ?? "").trim().toLowerCase();
    const idx = fields.findIndex(
      (f) =>
        f.id.toLowerCase() === fieldName || f.label.toLowerCase() === fieldName
    );
    if (idx >= 0) {
      const targetField = fields[idx];
      if (targetField) {
        const updated = {
          ...state,
          status: "collecting" as const,
          currentFieldIndex: idx,
        };
        await setFormState(updated);
        return fieldPrompt(targetField);
      }
    }
  }

  return {
    type: "text",
    text: "Reply yes to confirm, no to cancel, or edit <field> to change a value.",
    followUps: ["Yes", "No"],
  };
}

function fieldPrompt(field: FormField): BotResponse {
  return {
    type: "text",
    text: field.prompt,
    followUps: field.options?.slice(0, 5).map((o) => o.label),
  };
}

function confirmationPrompt(
  actionId: string,
  fields: FormField[],
  collected: Record<string, unknown>
): BotResponse {
  const summary = fields
    .map((f) => {
      const val = collected[f.id];
      return `  ${f.label}: ${val ?? "(empty)"}`;
    })
    .join("\n");

  return {
    type: "text",
    text: `Ready to run ${actionId}:\n${summary}\n\nConfirm?`,
    followUps: ["Yes", "No"],
  };
}
