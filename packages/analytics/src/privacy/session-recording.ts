import { getBrowserClient } from "../clients/browser";

export const PRIVACY_CLASSES = {
  noCapture: "ph-no-capture",
  mask: "ph-mask",
} as const;

export interface SessionRecordingConfig {
  maskAllInputs: boolean;
  maskAllText: boolean;
  maskTextSelector?: string;
  blockSelector?: string;
  recordCrossOriginIframes: boolean;
}

export const defaultSessionRecordingConfig: SessionRecordingConfig = {
  maskAllInputs: true,
  maskAllText: false,
  maskTextSelector: ".ph-mask, .sensitive-data",
  blockSelector: ".ph-no-capture, .private-content",
  recordCrossOriginIframes: false,
};

export function startSessionRecording(): void {
  const client = getBrowserClient();
  client.startSessionRecording();
}

export function stopSessionRecording(): void {
  const client = getBrowserClient();
  client.stopSessionRecording();
}

export function isSessionRecordingActive(): boolean {
  const client = getBrowserClient();
  return client.sessionRecordingStarted();
}

export function maskElement(element: HTMLElement): void {
  element.classList.add(PRIVACY_CLASSES.mask);
}

export function unmaskElement(element: HTMLElement): void {
  element.classList.remove(PRIVACY_CLASSES.mask);
}

export function excludeElement(element: HTMLElement): void {
  element.classList.add(PRIVACY_CLASSES.noCapture);
}

export function includeElement(element: HTMLElement): void {
  element.classList.remove(PRIVACY_CLASSES.noCapture);
}

export function getPrivacyAttributeForSensitiveData(): Record<string, string> {
  return {
    className: PRIVACY_CLASSES.noCapture,
    "data-ph-capture": "false",
  };
}

export function getPrivacyAttributeForMaskedData(): Record<string, string> {
  return {
    className: PRIVACY_CLASSES.mask,
    "data-ph-mask": "true",
  };
}

export const sensitiveFieldTypes = [
  "password",
  "email",
  "tel",
  "ssn",
  "credit-card",
  "cvv",
  "date-of-birth",
  "address",
] as const;

export type SensitiveFieldType = (typeof sensitiveFieldTypes)[number];

export function getSensitiveInputSelector(): string {
  return sensitiveFieldTypes.map((type) => `input[type="${type}"]`).join(", ");
}

export function tagSessionRecording(
  key: string,
  value: string | number | boolean
): void {
  const client = getBrowserClient();
  client.capture("$session_recording_tag", {
    [key]: value,
  });
}

export function markSessionAsImportant(reason: string): void {
  tagSessionRecording("important", true);
  tagSessionRecording("importance_reason", reason);
}
