export function injectTextIntoActiveField(text: string): boolean {
  const el = document.activeElement;

  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    const start = el.selectionStart ?? el.value.length;
    const before = el.value.slice(0, start);
    const separator = before.length > 0 && !before.endsWith(" ") ? " " : "";

    el.focus();
    document.execCommand("insertText", false, separator + text);
    return true;
  }

  if (el?.getAttribute("contenteditable") === "true") {
    document.execCommand("insertText", false, text);
    return true;
  }

  return false;
}
