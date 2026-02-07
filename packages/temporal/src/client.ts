import { readFile } from "node:fs/promises";
import { Client, Connection } from "@temporalio/client";
import { loadTemporalConfig, type TemporalConfig } from "./config";

let clientInstance: Client | null = null;

async function createConnection(config: TemporalConfig): Promise<Connection> {
  const tls =
    config.tls?.certPath && config.tls?.keyPath
      ? {
          clientCertPair: {
            crt: await readFile(config.tls.certPath),
            key: await readFile(config.tls.keyPath),
          },
          serverRootCACertificate: config.tls.caPath
            ? await readFile(config.tls.caPath)
            : undefined,
        }
      : undefined;

  return Connection.connect({
    address: config.address,
    tls,
  });
}

export async function getTemporalClient(
  config?: TemporalConfig
): Promise<Client> {
  if (clientInstance) {
    return clientInstance;
  }

  const resolvedConfig = config ?? loadTemporalConfig();
  const connection = await createConnection(resolvedConfig);

  clientInstance = new Client({
    connection,
    namespace: resolvedConfig.namespace,
  });

  return clientInstance;
}

export async function closeTemporalClient(): Promise<void> {
  if (clientInstance) {
    await clientInstance.connection.close();
    clientInstance = null;
  }
}

export { Client, Connection };
