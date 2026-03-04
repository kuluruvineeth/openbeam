import { createBacnetAdapter } from "../adapters/bacnet-adapter";
import type { AdapterConfig, ProtocolAdapter } from "../adapters/base-adapter";
import { createMqttAdapter } from "../adapters/mqtt-adapter";
import { createOpcuaAdapter } from "../adapters/opcua-adapter";
import logger from "../logger";

type AdapterFactory = (config: AdapterConfig) => ProtocolAdapter;

const ADAPTER_FACTORIES: Record<string, AdapterFactory> = {
  mqtt: createMqttAdapter,
  opcua: createOpcuaAdapter,
  bacnet: createBacnetAdapter,
};

export function createAdapter(config: AdapterConfig): ProtocolAdapter {
  const factory = ADAPTER_FACTORIES[config.protocol];
  if (!factory) {
    throw new Error(`Unsupported protocol: ${config.protocol}`);
  }

  logger.info(
    { protocol: config.protocol, connectorId: config.connectorId },
    "Creating protocol adapter"
  );

  return factory(config);
}

export function getSupportedProtocols(): string[] {
  return Object.keys(ADAPTER_FACTORIES);
}
