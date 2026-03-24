const EXTENSION_SUBTYPE_MAP: Record<string, string> = {
  doc: "document",
  docx: "document",
  odt: "document",
  rtf: "document",
  txt: "document",
  md: "document",
  pdf: "document",
  xls: "spreadsheet",
  xlsx: "spreadsheet",
  csv: "spreadsheet",
  ods: "spreadsheet",
  tsv: "spreadsheet",
  ppt: "presentation",
  pptx: "presentation",
  odp: "presentation",
  key: "presentation",
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  bmp: "image",
  svg: "image",
  webp: "image",
  tiff: "image",
  heic: "image",
};

export function getExtension(name: string): string {
  const dotIndex = name.lastIndexOf(".");
  if (dotIndex === -1 || dotIndex === name.length - 1) {
    return "";
  }
  return name.slice(dotIndex + 1).toLowerCase();
}

export function getSubtypeFromExtension(ext: string): string {
  return EXTENSION_SUBTYPE_MAP[ext] ?? "file";
}

export function formatSize(bytes: number | undefined): string | undefined {
  if (bytes === undefined) {
    return;
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1_048_576) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  if (bytes < 1_073_741_824) {
    return `${(bytes / 1_048_576).toFixed(1)} MB`;
  }
  return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
}

export function buildEgnyteUrl(domain: string, path: string): string {
  const encodedPath = encodeURIComponent(path).replace(/%2F/g, "/");
  return `https://${domain}.egnyte.com/navigate/folder/${encodedPath}`;
}
