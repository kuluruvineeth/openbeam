export function injectTextIntoActiveField(text: string): boolean {
  const el = document.activeElement;

  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const before = el.value.slice(0, start);
    const after = el.value.slice(end);
    const separator = before.length > 0 && !before.endsWith(" ") ? " " : "";

    el.focus();
    document.execCommand("insertText", false, separator + text);

    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(el),
      "value"
    )?.set;

    if (nativeInputValueSetter) {
      const newValue = before + separator + text + after;
      nativeInputValueSetter.call(el, newValue);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }

    return true;
  }

  if (el?.getAttribute("contenteditable") === "true") {
    document.execCommand("insertText", false, text);
    return true;
  }

  return false;
}
