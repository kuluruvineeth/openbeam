import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const mqttApp: UnifiedApp = {
  id: AppType.MQTT,
  name: "MQTT Broker",
  category: "Industrial IoT & Protocols",
  active: true,
  logo: AppType.MQTT,
  short_description:
    "Subscribe to MQTT topics and index sensor readings, device states, and alarms.",
  description:
    "Connect to any MQTT broker (Mosquitto, EMQX, HiveMQ) to index industrial IoT data. Supports MQTT 5.0, Sparkplug B, TLS, and time-series aggregation with ISA-95 hierarchy enrichment.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "OpenPlane",
  website: "https://mqtt.org",

  searchDisplay: {
    defaultIconKey: "RadioIcon",
    documentTypes: {
      sensor_reading: {
        label: "sensor",
        iconKey: "ThermometerIcon",
        category: "sensor_reading",
      },
      device_state: {
        label: "state",
        iconKey: "CpuIcon",
        category: "device_state",
      },
      alarm: {
        label: "alarm",
        iconKey: "AlertCircleIcon",
        category: "alert",
      },
      device_birth: {
        label: "device",
        iconKey: "ServerIcon",
        category: "device_birth",
      },
    },
  },

  features: [
    "MQTT 5.0 and 3.1.1 protocol support",
    "Sparkplug B payload decoding (NBIRTH, DBIRTH, NDATA, DDATA)",
    "Time-series aggregation with configurable windows",
    "ISA-95 hierarchy enrichment from topic paths",
    "TLS/mTLS certificate authentication",
    "Wildcard topic subscriptions (+ and #)",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "Authorization",
      documentationUrl: "https://mqtt.org/mqtt-specification/",
    },
  },

  streams: [
    {
      name: "telemetry",
      label: "Sensor Telemetry",
      description: "Real-time sensor readings aggregated into time windows",
      entityType: "resource",
      dataPoints: ["Value", "Min", "Max", "Average", "Unit"],
      isPii: false,
      syncMode: SyncMode.REALTIME,
      defaultInterval: 60,
      supportsBackfill: false,
    },
    {
      name: "events",
      label: "Device Events",
      description: "State changes, alarms, birth/death certificates",
      entityType: "activity",
      dataPoints: ["Type", "Severity", "Device", "Timestamp"],
      isPii: false,
      syncMode: SyncMode.REALTIME,
      defaultInterval: 0,
      supportsBackfill: false,
    },
  ],

  settings: [
    {
      id: "broker_url",
      label: "Broker URL",
      description: "MQTT broker connection URL with protocol prefix",
      type: "text",
      required: true,
      value: "",
      placeholder: "mqtts://broker.example.com",
    },
    {
      id: "port",
      label: "Port",
      description: "MQTT broker port (8883 for TLS, 1883 for plain)",
      type: "number",
      required: true,
      value: 8883,
    },
    {
      id: "username",
      label: "Username",
      description: "MQTT broker username for authentication",
      type: "text",
      required: false,
      value: "",
    },
    {
      id: "password",
      label: "Password",
      description: "MQTT broker password for authentication",
      type: "password",
      required: false,
      value: "",
    },
    {
      id: "topics",
      label: "Topic Subscriptions",
      description:
        "MQTT topic patterns, one per line. Supports + and # wildcards",
      type: "textarea",
      required: true,
      value: "",
      placeholder: "plant/+/sensors/#",
    },
    {
      id: "payload_format",
      label: "Payload Format",
      description: "How to decode incoming MQTT message payloads",
      type: "select",
      required: true,
      value: "json",
      options: [
        { label: "JSON", value: "json" },
        { label: "Sparkplug B", value: "sparkplug_b" },
        { label: "CBOR", value: "cbor" },
        { label: "Raw", value: "raw" },
      ],
    },
    {
      id: "aggregation_window",
      label: "Aggregation Window (seconds)",
      description: "Time window for aggregating sensor readings (0 to disable)",
      type: "number",
      required: false,
      value: 60,
    },
  ],
};
