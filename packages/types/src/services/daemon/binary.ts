export const BinaryMuxConstants = {
  MUX_MAGIC_1: 0x50,
  MUX_MAGIC_2: 0x58,
  MUX_VERSION: 1,
  HEADER_SIZE: 24,
} as const;

export enum BinaryMuxChannel {
  Terminal = 1,
  FileTransfer = 2,
}

export enum TerminalBinaryMessageType {
  InputUtf8 = 1,
  OutputUtf8 = 2,
  Ack = 3,
}

export enum TerminalBinaryFlags {
  Replay = 1,
}

export interface BinaryMuxFrame {
  channel: BinaryMuxChannel;
  messageType: number;
  streamId: number;
  offset: number;
  flags?: number;
  payload?: Uint8Array;
}

export function asUint8Array(data: ArrayBuffer | ArrayBufferView): Uint8Array {
  if (data instanceof Uint8Array) {
    return data;
  }
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  return new Uint8Array(data);
}

export function isLikelyBinaryMuxFrame(data: Uint8Array): boolean {
  return (
    data.length >= BinaryMuxConstants.HEADER_SIZE &&
    data[0] === BinaryMuxConstants.MUX_MAGIC_1 &&
    data[1] === BinaryMuxConstants.MUX_MAGIC_2
  );
}

export function encodeBinaryMuxFrame(frame: BinaryMuxFrame): Uint8Array {
  const payloadLen = frame.payload?.length ?? 0;
  const buf = new Uint8Array(BinaryMuxConstants.HEADER_SIZE + payloadLen);
  const view = new DataView(buf.buffer);

  buf[0] = BinaryMuxConstants.MUX_MAGIC_1;
  buf[1] = BinaryMuxConstants.MUX_MAGIC_2;
  buf[2] = BinaryMuxConstants.MUX_VERSION;
  buf[3] = frame.channel;

  view.setUint16(4, frame.messageType, false);
  view.setUint16(6, frame.flags ?? 0, false);
  view.setUint32(8, frame.streamId, false);
  view.setUint32(12, frame.offset, false);
  view.setUint32(16, payloadLen, false);

  if (frame.payload && payloadLen > 0) {
    buf.set(frame.payload, BinaryMuxConstants.HEADER_SIZE);
  }

  return buf;
}

export function decodeBinaryMuxFrame(data: Uint8Array): BinaryMuxFrame {
  if (data.length < BinaryMuxConstants.HEADER_SIZE) {
    throw new Error(
      `Frame too short: ${data.length} < ${BinaryMuxConstants.HEADER_SIZE}`
    );
  }

  if (
    data[0] !== BinaryMuxConstants.MUX_MAGIC_1 ||
    data[1] !== BinaryMuxConstants.MUX_MAGIC_2
  ) {
    throw new Error("Invalid magic bytes");
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  const channel = data[3] as BinaryMuxChannel;
  const messageType = view.getUint16(4, false);
  const flags = view.getUint16(6, false);
  const streamId = view.getUint32(8, false);
  const offset = view.getUint32(12, false);
  const payloadLen = view.getUint32(16, false);

  const payload =
    payloadLen > 0
      ? data.slice(
          BinaryMuxConstants.HEADER_SIZE,
          BinaryMuxConstants.HEADER_SIZE + payloadLen
        )
      : undefined;

  return { channel, messageType, streamId, offset, flags, payload };
}
