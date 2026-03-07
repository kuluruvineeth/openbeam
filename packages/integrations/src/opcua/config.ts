import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const opcuaApp: UnifiedApp = {
  id: AppType.OPCUA,
  name: "OPC-UA",
  category: "Industrial IoT & Protocols",
  active: true,
  logo: AppType.OPCUA,
  short_description:
    "Browse OPC-UA address spaces and index node values, alarms, and historical data.",
  description:
    "Connect to OPC-UA servers to browse address spaces, subscribe to node value changes, and index historical data. Supports companion specifications (MTConnect, PackML, PLCopen) and X.509 certificate authentication.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "OpenBeam",
  website: "https://opcfoundation.org",

  searchDisplay: {
    defaultIconKey: "ServerIcon",
    documentTypes: {
      sensor_reading: {
        label: "reading",
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
    },
  },

  features: [
    "OPC-UA 1.05 address space browsing",
    "Server-push subscriptions for real-time data",
    "Historical data access (HDA) for backfill",
    "X.509 certificate and username/password authentication",
    "Companion spec support (MTConnect, PackML)",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "Authorization",
      documentationUrl:
        "https://opcfoundation.org/about/opc-technologies/opc-ua/",
    },
  },

  streams: [
    {
      name: "nodes",
      label: "Node Values",
      description: "Real-time node value changes from subscriptions",
      entityType: "resource",
      dataPoints: ["NodeId", "Value", "StatusCode", "Timestamp"],
      isPii: false,
      syncMode: SyncMode.REALTIME,
      defaultInterval: 60,
      supportsBackfill: true,
    },
    {
      name: "alarms",
      label: "Alarms & Conditions",
      description: "OPC-UA alarm and condition events",
      entityType: "activity",
      dataPoints: ["Type", "Severity", "Source", "Message"],
      isPii: false,
      syncMode: SyncMode.REALTIME,
      defaultInterval: 0,
      supportsBackfill: false,
    },
  ],

  settings: [
    {
      id: "endpoint_url",
      label: "Endpoint URL",
      description: "OPC-UA server endpoint address",
      type: "text",
      required: true,
      value: "",
      placeholder: "opc.tcp://server:4840",
    },
    {
      id: "security_mode",
      label: "Security Mode",
      description: "OPC-UA message security mode",
      type: "select",
      required: true,
      value: "SignAndEncrypt",
      options: [
        { label: "None", value: "None" },
        { label: "Sign", value: "Sign" },
        { label: "Sign & Encrypt", value: "SignAndEncrypt" },
      ],
    },
    {
      id: "security_policy",
      label: "Security Policy",
      description: "Cryptographic security policy for the connection",
      type: "select",
      required: true,
      value: "Basic256Sha256",
      options: [
        { label: "None", value: "None" },
        { label: "Basic256", value: "Basic256" },
        { label: "Basic256Sha256", value: "Basic256Sha256" },
        { label: "AES-128 SHA-256 RSA-OAEP", value: "Aes128_Sha256_RsaOaep" },
      ],
    },
    {
      id: "username",
      label: "Username",
      description: "OPC-UA server username (leave empty for anonymous)",
      type: "text",
      required: false,
      value: "",
    },
    {
      id: "password",
      label: "Password",
      description: "OPC-UA server password",
      type: "password",
      required: false,
      value: "",
    },
  ],
};
