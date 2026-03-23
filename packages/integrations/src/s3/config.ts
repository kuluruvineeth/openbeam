import {
  AppType,
  AuthType,
  ConnectorType,
  SyncMode,
  type UnifiedApp,
} from "../types";

export const s3App: UnifiedApp = {
  id: AppType.S3,
  name: "Amazon S3",
  category: "Cloud Storage",
  active: true,
  logo: AppType.S3,
  short_description:
    "Search across objects and files stored in Amazon S3 buckets.",
  description:
    "Connect Amazon S3 to index and search objects in your buckets. Supports prefix filtering, file type filtering, and incremental sync via LastModified timestamps.",
  images: [],
  installed: false,
  type: "official",
  connectorType: ConnectorType.SOURCE,
  developerName: "Amazon Web Services",
  website: "https://aws.amazon.com/s3/",
  searchDisplay: {
    defaultIconKey: "FolderIcon",
    documentTypes: {
      file: { label: "file", iconKey: "FileIcon", category: "file" },
    },
  },

  features: [
    "Object listing and metadata search",
    "Prefix-based filtering",
    "File type filtering",
    "File size limits",
    "Multi-region support",
    "Incremental sync via LastModified",
  ],

  auth: {
    type: AuthType.API_KEY,
    config: {
      headerName: "Authorization",
      documentationUrl:
        "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html",
    },
  },

  streams: [
    {
      name: "objects",
      label: "Objects",
      description: "Files and objects stored in the S3 bucket",
      entityType: "resource",
      dataPoints: [
        "Key",
        "Size",
        "LastModified",
        "ETag",
        "ContentType",
        "StorageClass",
      ],
      syncMode: SyncMode.PERIODIC,
      defaultInterval: 60,
      supportsBackfill: true,
    },
  ],

  settings: [
    {
      id: "access_key_id",
      label: "AWS Access Key ID",
      description: "IAM access key with S3 read permissions",
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
      description: "AWS region where your S3 bucket is located",
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
        { label: "EU (Paris)", value: "eu-west-3" },
        { label: "EU (Frankfurt)", value: "eu-central-1" },
        { label: "EU (Stockholm)", value: "eu-north-1" },
        { label: "Asia Pacific (Tokyo)", value: "ap-northeast-1" },
        { label: "Asia Pacific (Seoul)", value: "ap-northeast-2" },
        { label: "Asia Pacific (Singapore)", value: "ap-southeast-1" },
        { label: "Asia Pacific (Sydney)", value: "ap-southeast-2" },
        { label: "Asia Pacific (Mumbai)", value: "ap-south-1" },
        { label: "South America (Sao Paulo)", value: "sa-east-1" },
        { label: "Canada (Central)", value: "ca-central-1" },
        { label: "Middle East (Bahrain)", value: "me-south-1" },
        { label: "Africa (Cape Town)", value: "af-south-1" },
      ],
    },
    {
      id: "bucket_name",
      label: "Bucket Name",
      description: "Name of the S3 bucket to sync",
      type: "text",
      required: true,
      value: "",
      placeholder: "my-bucket",
    },
    {
      id: "prefix_filter",
      label: "Prefix Filter",
      description: "Only sync objects with keys starting with this prefix",
      type: "text",
      required: false,
      value: "",
      placeholder: "documents/",
    },
    {
      id: "exclude_prefixes",
      label: "Exclude Prefixes",
      description:
        "Comma-separated prefixes to exclude (e.g. tmp/,logs/,backups/)",
      type: "text",
      required: false,
      value: "",
      placeholder: "tmp/,logs/",
    },
    {
      id: "file_types_filter",
      label: "File Types Filter",
      description:
        "Comma-separated file extensions to include (e.g. pdf,txt,docx). Empty means all files.",
      type: "text",
      required: false,
      value: "",
      placeholder: "pdf,txt,docx,csv,json",
    },
    {
      id: "max_file_size_mb",
      label: "Max File Size (MB)",
      description: "Skip objects larger than this size",
      type: "number",
      required: false,
      value: 100,
    },
    {
      id: "lookback_days",
      label: "Lookback Days",
      description:
        "Only sync objects modified within this many days. 0 means all objects.",
      type: "number",
      required: false,
      value: 0,
    },
  ],
};

export default s3App;
