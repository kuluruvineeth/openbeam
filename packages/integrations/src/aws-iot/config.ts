import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const awsIotApp: UnifiedApp = {
  id: AppType.AWS_IOT_CORE,
  name: "AWS IoT Core",
  category: "IoT",
  active: true,
  logo: AppType.AWS_IOT_CORE,
  short_description:
    "Search across IoT things, device shadows, and thing groups.",
  description:
    "Connect AWS IoT Core to search across IoT things, device shadows, thing groups, and device metadata. Supports polling-based full and incremental sync via the AWS SDK.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Amazon Web Services",
  website: "https://aws.amazon.com/iot-core/",

  searchDisplay: {
    defaultIconKey: "CpuIcon",
    documentTypes: {
      device: { label: "thing", iconKey: "CpuIcon", category: "device" },
      device_group: {
        label: "thing group",
        iconKey: "FolderIcon",
        category: "group",
      },
    },
  },

  features: [
    "IoT thing registry search",
    "Device shadow state inspection",
    "Thing group hierarchy browsing",
    "Device attribute and metadata search",
    "Multi-region support",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "Authorization",
      documentationUrl:
        "https://docs.aws.amazon.com/iot/latest/developerguide/security-iam.html",
    },
  },

  streams: [
    {
      name: "things",
      label: "Things",
      description: "IoT devices registered in the thing registry",
      entityType: "resource",
      dataPoints: [
        "Name",
        "Thing Type",
        "Attributes",
        "ARN",
        "Connectivity",
        "Shadow",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 30,
      supportsBackfill: true,
    },
    {
      name: "thing_groups",
      label: "Thing Groups",
      description: "Organizational groups for IoT things",
      entityType: "resource",
      dataPoints: ["Name", "Description", "Parent Group", "ARN", "Attributes"],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "access_key_id",
      label: "AWS Access Key ID",
      description: "IAM access key with IoT read permissions",
      type: "text",
      required: true,
      value: "",
      placeholder: "AKIA...",
    },
    {
      id: "secret_access_key",
      label: "AWS Secret Access Key",
      description: "Corresponding secret key for the access key ID",
      type: "password",
      required: true,
      value: "",
      placeholder: "Secret key",
    },
    {
      id: "region",
      label: "AWS Region",
      description: "AWS region where your IoT resources are deployed",
      type: "select",
      required: true,
      value: "us-east-1",
      options: [
        { label: "US East (N. Virginia)", value: "us-east-1" },
        { label: "US East (Ohio)", value: "us-east-2" },
        { label: "US West (N. California)", value: "us-west-1" },
        { label: "US West (Oregon)", value: "us-west-2" },
        { label: "EU (Ireland)", value: "eu-west-1" },
        { label: "EU (London)", value: "eu-west-2" },
        { label: "EU (Frankfurt)", value: "eu-central-1" },
        { label: "Asia Pacific (Tokyo)", value: "ap-northeast-1" },
        { label: "Asia Pacific (Singapore)", value: "ap-southeast-1" },
        { label: "Asia Pacific (Sydney)", value: "ap-southeast-2" },
      ],
    },
    {
      id: "sync_thing_groups",
      label: "Sync Thing Groups",
      description: "Include thing groups in search index",
      type: "switch",
      required: false,
      value: true,
    },
    {
      id: "sync_shadows",
      label: "Sync Device Shadows",
      description: "Include device shadow state in thing documents",
      type: "switch",
      required: false,
      value: true,
    },
  ],
};

export default awsIotApp;
