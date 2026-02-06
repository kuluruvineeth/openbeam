import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
}));

vi.mock("@temporalio/client", () => ({
  Connection: {
    connect: vi.fn().mockResolvedValue({ close: vi.fn() }),
  },
}));

vi.mock("@temporalio/worker", () => ({
  NativeConnection: {
    connect: vi.fn().mockResolvedValue({ close: vi.fn() }),
  },
}));

import { Connection } from "@temporalio/client";
import { NativeConnection } from "@temporalio/worker";
import { createClientConnection, createWorkerConnection } from "../connection";

const mockNativeConnect = vi.mocked(NativeConnection.connect);
const mockClientConnect = vi.mocked(Connection.connect);

const CERT_REQUIRED_RE = /TEMPORAL_CLIENT_CERT.*required in production/;
const KEY_REQUIRED_RE = /TEMPORAL_CLIENT_KEY.*required in production/;
const TLS_REQUIRED_RE = /required in production/;

describe("createWorkerConnection", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.TEMPORAL_ADDRESS = undefined;
    process.env.TEMPORAL_CLIENT_CERT = undefined;
    process.env.TEMPORAL_CLIENT_KEY = undefined;
    process.env.TEMPORAL_CA_CERT = undefined;
    process.env.TEMPORAL_TLS_CERT = undefined;
    process.env.TEMPORAL_TLS_KEY = undefined;
    process.env.TEMPORAL_TLS_CA = undefined;
    process.env.NODE_ENV = "development";
    mockNativeConnect.mockClear();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("connects to default address in development", async () => {
    await createWorkerConnection();

    expect(mockNativeConnect).toHaveBeenCalledWith({
      address: "localhost:7233",
      tls: undefined,
    });
  });

  it("uses TEMPORAL_ADDRESS when set", async () => {
    process.env.TEMPORAL_ADDRESS = "temporal.example.com:7233";

    await createWorkerConnection();

    expect(mockNativeConnect).toHaveBeenCalledWith({
      address: "temporal.example.com:7233",
      tls: undefined,
    });
  });

  it("throws in production without TLS cert", async () => {
    process.env.NODE_ENV = "production";

    await expect(createWorkerConnection()).rejects.toThrow(CERT_REQUIRED_RE);
  });

  it("throws in production without TLS key", async () => {
    process.env.NODE_ENV = "production";
    process.env.TEMPORAL_CLIENT_CERT = Buffer.from("cert").toString("base64");

    await expect(createWorkerConnection()).rejects.toThrow(KEY_REQUIRED_RE);
  });

  it("throws in staging without TLS config", async () => {
    process.env.NODE_ENV = "staging";

    await expect(createWorkerConnection()).rejects.toThrow(TLS_REQUIRED_RE);
  });

  it("connects with base64 TLS config", async () => {
    process.env.NODE_ENV = "production";
    process.env.TEMPORAL_CLIENT_CERT =
      Buffer.from("cert-data").toString("base64");
    process.env.TEMPORAL_CLIENT_KEY =
      Buffer.from("key-data").toString("base64");

    await createWorkerConnection();

    expect(mockNativeConnect).toHaveBeenCalledWith({
      address: "localhost:7233",
      tls: {
        clientCertPair: {
          crt: Buffer.from("cert-data"),
          key: Buffer.from("key-data"),
        },
        serverRootCACertificate: undefined,
      },
    });
  });

  it("includes CA cert when provided", async () => {
    process.env.NODE_ENV = "production";
    process.env.TEMPORAL_CLIENT_CERT = Buffer.from("cert").toString("base64");
    process.env.TEMPORAL_CLIENT_KEY = Buffer.from("key").toString("base64");
    process.env.TEMPORAL_CA_CERT = Buffer.from("ca-cert").toString("base64");

    await createWorkerConnection();

    const call = mockNativeConnect.mock.calls[0]?.[0] ?? {};
    const tls = (call as Record<string, unknown>).tls as Record<
      string,
      unknown
    >;
    expect(tls.serverRootCACertificate).toEqual(Buffer.from("ca-cert"));
  });
});

describe("createClientConnection", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.TEMPORAL_ADDRESS = undefined;
    process.env.TEMPORAL_CLIENT_CERT = undefined;
    process.env.TEMPORAL_CLIENT_KEY = undefined;
    process.env.NODE_ENV = "development";
    mockClientConnect.mockClear();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("connects to default address in development", async () => {
    await createClientConnection();

    expect(mockClientConnect).toHaveBeenCalledWith({
      address: "localhost:7233",
      tls: undefined,
    });
  });

  it("throws in production without TLS", async () => {
    process.env.NODE_ENV = "production";

    await expect(createClientConnection()).rejects.toThrow(TLS_REQUIRED_RE);
  });
});
