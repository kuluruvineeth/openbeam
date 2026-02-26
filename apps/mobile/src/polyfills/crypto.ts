import { Buffer } from "buffer";
import * as ExpoCrypto from "expo-crypto";

declare global {
  interface Crypto {
    randomUUID(): `${string}-${string}-${string}-${string}-${string}`;
  }
}

export function polyfillCrypto(): void {
  // Ensure TextEncoder/TextDecoder exist for shared E2EE code (tweetnacl + relay transport).
  // Hermes may not provide them in all configurations.
  // biome-ignore lint/suspicious/noExplicitAny: React Native type interop
  if (typeof (globalThis as any).TextEncoder !== "function") {
    class BufferTextEncoder {
      encode(input = ""): Uint8Array {
        return Uint8Array.from(Buffer.from(String(input), "utf8"));
      }
    }
    // biome-ignore lint/suspicious/noExplicitAny: React Native type interop
    (globalThis as any).TextEncoder = BufferTextEncoder as any;
  }

  // biome-ignore lint/suspicious/noExplicitAny: React Native type interop
  if (typeof (globalThis as any).TextDecoder !== "function") {
    class BufferTextDecoder {
      decode(input?: ArrayBuffer | ArrayBufferView): string {
        if (input == null) {
          return "";
        }
        if (input instanceof ArrayBuffer) {
          return Buffer.from(input).toString("utf8");
        }
        if (ArrayBuffer.isView(input)) {
          return Buffer.from(
            input.buffer,
            input.byteOffset,
            input.byteLength
          ).toString("utf8");
        }
        return Buffer.from(String(input), "utf8").toString("utf8");
      }
    }
    // biome-ignore lint/suspicious/noExplicitAny: React Native type interop
    (globalThis as any).TextDecoder = BufferTextDecoder as any;
  }

  // biome-ignore lint/suspicious/noExplicitAny: React Native type interop
  const existing = (globalThis as any).crypto as Crypto | null | undefined;
  let target = existing;
  if (!target) {
    target = {} as Crypto;
    // biome-ignore lint/suspicious/noExplicitAny: React Native type interop
    (globalThis as any).crypto = target;
  }

  // biome-ignore lint/suspicious/noExplicitAny: React Native type interop
  if (typeof (globalThis as any).crypto?.randomUUID !== "function") {
    if (!globalThis.crypto) {
      // biome-ignore lint/suspicious/noExplicitAny: React Native type interop
      (globalThis as any).crypto = {} as Crypto;
    }
    globalThis.crypto.randomUUID = () =>
      ExpoCrypto.randomUUID() as `${string}-${string}-${string}-${string}-${string}`;
  }

  // biome-ignore lint/suspicious/noExplicitAny: React Native type interop
  if (typeof (globalThis as any).crypto?.getRandomValues !== "function") {
    if (!globalThis.crypto) {
      // biome-ignore lint/suspicious/noExplicitAny: React Native type interop
      (globalThis as any).crypto = {} as Crypto;
    }
    globalThis.crypto.getRandomValues = <T extends ArrayBufferView>(
      array: T
      // biome-ignore lint/suspicious/noExplicitAny: React Native type interop
    ): T => ExpoCrypto.getRandomValues(array as any) as T;
  }
}
