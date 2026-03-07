import type {
  BacnetConnectionConfig,
  BacnetDevice,
  BacnetObject,
} from "@openbeam/types/services/connectors/bacnet";
import { logger } from "../lib/logger";
import { BacnetApiError } from "./types";

const DEFAULT_DISCOVERY_TIMEOUT = 5000;
const DEFAULT_READ_TIMEOUT = 3000;
const BACNET_PROPERTY_OBJECT_LIST = 76;
const BACNET_PROPERTY_PRESENT_VALUE = 85;
const BACNET_PROPERTY_OBJECT_NAME = 77;
const BACNET_PROPERTY_DESCRIPTION = 28;
const BACNET_PROPERTY_UNITS = 117;
const BACNET_PROPERTY_STATUS_FLAGS = 111;
const BACNET_PROPERTY_COV_INCREMENT = 22;
const BACNET_PROPERTY_ACTIVE_TEXT = 4;
const BACNET_PROPERTY_INACTIVE_TEXT = 46;
const BACNET_PROPERTY_NUMBER_OF_STATES = 74;
const BACNET_PROPERTY_STATE_TEXT = 110;
const BACNET_PROPERTY_MODEL_NAME = 70;
const BACNET_PROPERTY_VENDOR_ID = 120;
const BACNET_PROPERTY_FIRMWARE_REVISION = 44;
const BACNET_PROPERTY_APP_SOFTWARE_VERSION = 12;
const BACNET_PROPERTY_LOCATION = 58;
const BACNET_OBJECT_TYPE_DEVICE = 8;

interface NodeBacnetClient {
  whoIs(options?: { lowLimit?: number; highLimit?: number }): void;
  readProperty(
    address: string,
    objectType: number,
    objectInstance: number,
    propertyId: number,
    callback: (err: Error | null, value: unknown) => void
  ): void;
  on(event: string, callback: (...args: unknown[]) => void): void;
  close(): void;
}

interface NodeBacnetModule {
  new (options?: {
    port?: number;
    interface?: string;
    broadcastAddress?: string;
  }): NodeBacnetClient;
}

function loadBacnetModule(): NodeBacnetModule {
  try {
    return require("node-bacnet") as NodeBacnetModule;
  } catch {
    throw new BacnetApiError({
      message: "node-bacnet module not installed — run: bun add node-bacnet",
      code: "DISCOVERY_FAILED",
      retryable: false,
    });
  }
}

interface ReadPropertyParams {
  client: NodeBacnetClient;
  address: string;
  objectType: number;
  objectInstance: number;
  propertyId: number;
  timeoutMs: number;
}

function readPropertyAsync(params: ReadPropertyParams): Promise<unknown> {
  const { client, address, objectType, objectInstance, propertyId, timeoutMs } =
    params;

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new BacnetApiError({
          message: `Read property timeout for ${address} type=${objectType} instance=${objectInstance}`,
          code: "TIMEOUT",
          retryable: true,
          deviceAddress: address,
        })
      );
    }, timeoutMs);

    client.readProperty(
      address,
      objectType,
      objectInstance,
      propertyId,
      (err: Error | null, value: unknown) => {
        clearTimeout(timer);
        if (err) {
          reject(
            new BacnetApiError({
              message: `Read failed: ${err.message}`,
              code: "READ_FAILED",
              retryable: true,
              deviceAddress: address,
            })
          );
          return;
        }
        resolve(value);
      }
    );
  });
}

function extractValue(result: unknown): unknown {
  if (result && typeof result === "object" && "values" in result) {
    const values = (result as { values: unknown[] }).values;
    if (Array.isArray(values) && values.length > 0) {
      const first = values[0];
      if (first && typeof first === "object" && "value" in first) {
        return (first as { value: unknown }).value;
      }
      return first;
    }
  }
  return result;
}

export interface BacnetClient {
  readonly connectorId: string;
  discoverDevices(timeout?: number): Promise<BacnetDevice[]>;
  readObjectList(
    deviceAddress: string,
    deviceId: number
  ): Promise<BacnetObject[]>;
  readObjectValue(
    deviceAddress: string,
    objectType: number,
    objectInstance: number
  ): Promise<unknown>;
  healthCheck(): Promise<boolean>;
  close(): void;
}

export function createBacnetClient(
  config: BacnetConnectionConfig
): BacnetClient {
  const { connectorId } = config;
  const BACnet = loadBacnetModule();
  const bacnetClient = new BACnet({
    port: config.port,
    interface: config.interface,
    broadcastAddress: config.broadcastAddress,
  });

  function discoverDevices(timeout?: number): Promise<BacnetDevice[]> {
    const discoveryTimeout =
      timeout ?? config.discoveryTimeout ?? DEFAULT_DISCOVERY_TIMEOUT;
    const devices: BacnetDevice[] = [];

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        resolve(devices);
      }, discoveryTimeout);

      bacnetClient.on("iAm", (...args: unknown[]) => {
        const device = args[0] as
          | {
              address?: string;
              deviceId?: number;
              maxApdu?: number;
              segmentation?: number;
              vendorId?: number;
            }
          | undefined;

        if (!device?.address || device.deviceId == null) {
          return;
        }

        devices.push({
          address: device.address,
          deviceId: device.deviceId,
          maxApdu: device.maxApdu ?? 1476,
          segmentation: device.segmentation ?? 0,
          vendorId: device.vendorId ?? 0,
        });
      });

      try {
        bacnetClient.whoIs();
      } catch (err) {
        clearTimeout(timer);
        reject(
          new BacnetApiError({
            message: `Discovery broadcast failed: ${err instanceof Error ? err.message : String(err)}`,
            code: "DISCOVERY_FAILED",
            retryable: true,
          })
        );
      }
    });
  }

  async function enrichDevice(device: BacnetDevice): Promise<BacnetDevice> {
    const readTimeout = config.readTimeout ?? DEFAULT_READ_TIMEOUT;
    const enriched = { ...device };

    const propertyReads: Array<{
      propertyId: number;
      field: keyof BacnetDevice;
    }> = [
      { propertyId: BACNET_PROPERTY_OBJECT_NAME, field: "objectName" },
      { propertyId: BACNET_PROPERTY_MODEL_NAME, field: "modelName" },
      { propertyId: BACNET_PROPERTY_VENDOR_ID, field: "vendorId" },
      {
        propertyId: BACNET_PROPERTY_FIRMWARE_REVISION,
        field: "firmwareRevision",
      },
      {
        propertyId: BACNET_PROPERTY_APP_SOFTWARE_VERSION,
        field: "applicationSoftwareVersion",
      },
      { propertyId: BACNET_PROPERTY_LOCATION, field: "location" },
      { propertyId: BACNET_PROPERTY_DESCRIPTION, field: "description" },
    ];

    const results = await Promise.allSettled(
      propertyReads.map((prop) =>
        readPropertyAsync({
          client: bacnetClient,
          address: device.address,
          objectType: BACNET_OBJECT_TYPE_DEVICE,
          objectInstance: device.deviceId,
          propertyId: prop.propertyId,
          timeoutMs: readTimeout,
        })
      )
    );

    for (let i = 0; i < results.length; i += 1) {
      const result = results[i];
      const propDef = propertyReads[i];
      if (!(result && propDef) || result.status !== "fulfilled") {
        continue;
      }
      const value = extractValue(result.value);
      if (value != null) {
        (enriched as unknown as Record<string, unknown>)[propDef.field] =
          typeof value === "number" && propDef.field === "vendorId"
            ? value
            : String(value);
      }
    }

    return enriched;
  }

  async function readObjectList(
    deviceAddress: string,
    deviceId: number
  ): Promise<BacnetObject[]> {
    const readTimeout = config.readTimeout ?? DEFAULT_READ_TIMEOUT;

    let objectListRaw: unknown;
    try {
      objectListRaw = await readPropertyAsync({
        client: bacnetClient,
        address: deviceAddress,
        objectType: BACNET_OBJECT_TYPE_DEVICE,
        objectInstance: deviceId,
        propertyId: BACNET_PROPERTY_OBJECT_LIST,
        timeoutMs: readTimeout,
      });
    } catch (err) {
      logger.warn(
        {
          deviceAddress,
          deviceId,
          error: err instanceof Error ? err.message : String(err),
        },
        "Failed to read object list from device"
      );
      return [];
    }

    const rawValues = extractValue(objectListRaw);
    if (!Array.isArray(rawValues)) {
      return [];
    }

    const objects: BacnetObject[] = [];

    for (const entry of rawValues) {
      if (!entry || typeof entry !== "object") {
        continue;
      }

      const typed = entry as { type?: number; instance?: number };
      if (typed.type == null || typed.instance == null) {
        continue;
      }

      const objType = typed.type;
      const objInstance = typed.instance;

      if (objType === BACNET_OBJECT_TYPE_DEVICE) {
        continue;
      }

      const obj: BacnetObject = {
        type: objType,
        instance: objInstance,
      };

      const propReads = [
        { propertyId: BACNET_PROPERTY_OBJECT_NAME, field: "objectName" },
        { propertyId: BACNET_PROPERTY_DESCRIPTION, field: "description" },
        { propertyId: BACNET_PROPERTY_PRESENT_VALUE, field: "presentValue" },
        { propertyId: BACNET_PROPERTY_UNITS, field: "units" },
        { propertyId: BACNET_PROPERTY_STATUS_FLAGS, field: "statusFlags" },
        { propertyId: BACNET_PROPERTY_COV_INCREMENT, field: "covIncrement" },
        { propertyId: BACNET_PROPERTY_ACTIVE_TEXT, field: "activeText" },
        { propertyId: BACNET_PROPERTY_INACTIVE_TEXT, field: "inactiveText" },
        {
          propertyId: BACNET_PROPERTY_NUMBER_OF_STATES,
          field: "numberOfStates",
        },
        { propertyId: BACNET_PROPERTY_STATE_TEXT, field: "stateText" },
      ];

      const propResults = await Promise.allSettled(
        propReads.map((prop) =>
          readPropertyAsync({
            client: bacnetClient,
            address: deviceAddress,
            objectType: objType,
            objectInstance: objInstance,
            propertyId: prop.propertyId,
            timeoutMs: readTimeout,
          })
        )
      );

      for (let i = 0; i < propResults.length; i += 1) {
        const result = propResults[i];
        const propDef = propReads[i];
        if (!(result && propDef) || result.status !== "fulfilled") {
          continue;
        }
        const value = extractValue(result.value);
        if (value != null) {
          (obj as unknown as Record<string, unknown>)[propDef.field] = value;
        }
      }

      objects.push(obj);
    }

    return objects;
  }

  async function readObjectValue(
    deviceAddress: string,
    objectType: number,
    objectInstance: number
  ): Promise<unknown> {
    const readTimeout = config.readTimeout ?? DEFAULT_READ_TIMEOUT;
    const raw = await readPropertyAsync({
      client: bacnetClient,
      address: deviceAddress,
      objectType,
      objectInstance,
      propertyId: BACNET_PROPERTY_PRESENT_VALUE,
      timeoutMs: readTimeout,
    });
    return extractValue(raw);
  }

  async function healthCheck(): Promise<boolean> {
    try {
      const devices = await discoverDevices(2000);
      return devices.length > 0;
    } catch {
      return false;
    }
  }

  function close(): void {
    bacnetClient.close();
  }

  return {
    connectorId,
    discoverDevices: async (timeout?: number) => {
      const rawDevices = await discoverDevices(timeout);
      const enriched = await Promise.allSettled(rawDevices.map(enrichDevice));
      return enriched
        .filter(
          (r): r is PromiseFulfilledResult<BacnetDevice> =>
            r.status === "fulfilled"
        )
        .map((r) => r.value);
    },
    readObjectList,
    readObjectValue,
    healthCheck,
    close,
  };
}
