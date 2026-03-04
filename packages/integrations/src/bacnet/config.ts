import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const bacnetApp: UnifiedApp = {
  id: AppType.BACNET,
  name: "BACnet",
  category: "Building Automation",
  active: true,
  logo: AppType.BACNET,
  short_description:
    "Discover BACnet devices and index HVAC readings, schedules, and alarms.",
  description:
    "Connect to BACnet/IP networks to discover devices, poll object values (temperature, humidity, setpoints), and subscribe to Change of Value (COV) notifications. Ideal for building management and HVAC monitoring.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "OpenPlane",
  website: "https://www.bacnet.org",

  searchDisplay: {
    defaultIconKey: "Building2Icon",
    documentTypes: {
      sensor_reading: {
        label: "reading",
        iconKey: "ThermometerIcon",
        category: "sensor_reading",
      },
      schedule: {
        label: "schedule",
        iconKey: "CalendarIcon",
        category: "schedule",
      },
      alarm: {
        label: "alarm",
        iconKey: "AlertCircleIcon",
        category: "alert",
      },
    },
  },

  features: [
    "BACnet/IP device discovery via Who-Is broadcast",
    "Object polling (analog/binary/multistate inputs/outputs)",
    "Change of Value (COV) subscriptions",
    "Schedule and calendar object reading",
    "Trend log data extraction",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "Authorization",
      documentationUrl:
        "https://www.bacnet.org/Bibliography/EC-9-96/EC-9-96.html",
    },
  },

  streams: [
    {
      name: "objects",
      label: "BACnet Objects",
      description: "Polled values from analog, binary, and multistate objects",
      entityType: "resource",
      dataPoints: ["ObjectType", "Value", "Units", "StatusFlags"],
      isPii: false,
      syncMode: SyncMode.REALTIME,
      defaultInterval: 30,
      supportsBackfill: false,
    },
    {
      name: "schedules",
      label: "Schedules",
      description: "HVAC and lighting schedule definitions",
      entityType: "resource",
      dataPoints: ["Name", "EffectivePeriod", "WeeklySchedule"],
      isPii: false,
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 3600,
      supportsBackfill: false,
    },
  ],

  settings: [
    {
      id: "interface",
      label: "Network Interface",
      description: "Network interface for BACnet/IP communication",
      type: "text",
      required: false,
      value: "",
      placeholder: "eth0",
    },
    {
      id: "port",
      label: "BACnet Port",
      description: "BACnet/IP UDP port (default 47808)",
      type: "number",
      required: true,
      value: 47_808,
    },
    {
      id: "device_ids",
      label: "Device IDs",
      description:
        "Comma-separated BACnet device IDs, or empty to discover all",
      type: "text",
      required: false,
      value: "",
    },
    {
      id: "poll_interval",
      label: "Poll Interval (seconds)",
      description: "How often to poll device object values",
      type: "number",
      required: false,
      value: 30,
    },
  ],
};
