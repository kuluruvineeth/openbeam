import { readFile } from "node:fs/promises";
import { Connection } from "@temporalio/client";
import { NativeConnection, type TLSConfig } from "@temporalio/worker";

type EnvironmentName = "production" | "staging" | "development" | "test";

const NAMESPACE_BY_ENVIRONMENT: Record<EnvironmentName, string> = {
  production: "openbeam-prod",
  staging: "openbeam-staging",
  development: "openbeam-dev",
  test: "openbeam-test",
};

function getEnvironment(): EnvironmentName {
  const env = process.env.NODE_ENV;
  if (env === "production" || env === "staging" || env === "test") {
    return env;
  }
  return "development";
}

function isProductionLike(): boolean {
  const env = getEnvironment();
  return env === "production" || env === "staging";
}

function loadCertificate(
  envVar: string | undefined,
  filePath: string | undefined
): Promise<Buffer | undefined> | undefined {
  if (envVar) {
    return Promise.resolve(Buffer.from(envVar, "base64"));
  }

  if (filePath) {
    return readFile(filePath);
  }

  return;
}

async function buildTlsConfig(): Promise<TLSConfig | undefined> {
  const certBase64 = process.env.TEMPORAL_CLIENT_CERT;
  const keyBase64 = process.env.TEMPORAL_CLIENT_KEY;
  const caBase64 = process.env.TEMPORAL_CA_CERT;

  const certPath = process.env.TEMPORAL_TLS_CERT;
  const keyPath = process.env.TEMPORAL_TLS_KEY;
  const caPath = process.env.TEMPORAL_TLS_CA;

  const hasCert = certBase64 || certPath;
  const hasKey = keyBase64 || keyPath;

  if (!(hasCert || hasKey)) {
    return;
  }

  const crt = await loadCertificate(certBase64, certPath);
  const key = await loadCertificate(keyBase64, keyPath);

  if (!(crt && key)) {
    return;
  }

  const serverRootCACertificate = await loadCertificate(caBase64, caPath);

  return {
    clientCertPair: { crt, key },
    serverRootCACertificate,
  };
}

function getAddress(addressOverride?: string): string {
  return addressOverride || process.env.TEMPORAL_ADDRESS || "localhost:7233";
}

function validateProductionConfig(): void {
  const hasCertBase64 = Boolean(process.env.TEMPORAL_CLIENT_CERT);
  const hasKeyBase64 = Boolean(process.env.TEMPORAL_CLIENT_KEY);
  const hasCertPath = Boolean(process.env.TEMPORAL_TLS_CERT);
  const hasKeyPath = Boolean(process.env.TEMPORAL_TLS_KEY);

  const hasCert = hasCertBase64 || hasCertPath;
  const hasKey = hasKeyBase64 || hasKeyPath;

  if (!hasCert) {
    throw new Error(
      "TEMPORAL_CLIENT_CERT or TEMPORAL_TLS_CERT required in production"
    );
  }

  if (!hasKey) {
    throw new Error(
      "TEMPORAL_CLIENT_KEY or TEMPORAL_TLS_KEY required in production"
    );
  }
}

export function getNamespace(): string {
  const explicitNamespace = process.env.TEMPORAL_NAMESPACE;
  if (explicitNamespace) {
    return explicitNamespace;
  }

  const env = getEnvironment();
  return NAMESPACE_BY_ENVIRONMENT[env];
}

export async function createWorkerConnection(options?: {
  address?: string;
}): Promise<NativeConnection> {
  const address = getAddress(options?.address);

  if (isProductionLike()) {
    validateProductionConfig();
  }

  const tls = await buildTlsConfig();

  return NativeConnection.connect({ address, tls });
}

export async function createClientConnection(options?: {
  address?: string;
}): Promise<Connection> {
  const address = getAddress(options?.address);

  if (isProductionLike()) {
    validateProductionConfig();
  }

  const tls = await buildTlsConfig();

  return Connection.connect({ address, tls });
}
