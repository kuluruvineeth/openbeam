"use client";

import {
  BinaryMuxChannel,
  type BinaryMuxFrame,
  TerminalBinaryMessageType,
} from "@openplane/types/services/daemon";

export type BinaryFrameHandler = (frame: BinaryMuxFrame) => void;

export type TerminalOutputHandler = (
  streamId: number,
  text: string,
  offset: number,
  isReplay: boolean
) => void;

const textDecoder = new TextDecoder();

export function createBinaryDemuxer(handlers: {
  onTerminalOutput?: TerminalOutputHandler;
  onUnhandled?: BinaryFrameHandler;
}): BinaryFrameHandler {
  return (frame: BinaryMuxFrame) => {
    if (
      frame.channel === BinaryMuxChannel.Terminal &&
      frame.messageType === TerminalBinaryMessageType.OutputUtf8
    ) {
      const text = frame.payload ? textDecoder.decode(frame.payload) : "";
      // biome-ignore lint/suspicious/noBitwiseOperators: binary protocol flag extraction
      const isReplay = (frame.flags ?? 0) & 1;
      handlers.onTerminalOutput?.(
        frame.streamId,
        text,
        frame.offset,
        isReplay !== 0
      );
      return;
    }

    handlers.onUnhandled?.(frame);
  };
}
