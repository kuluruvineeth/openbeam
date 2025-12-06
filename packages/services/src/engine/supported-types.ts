export interface SupportedFileTypes {
  mimes: string[];
  extensions: string[];
}

const SUPPORTED_MIMES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/rtf",
  "text/rtf",
  "application/vnd.oasis.opendocument.text",
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  "text/html",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.oasis.opendocument.spreadsheet",
  "text/csv",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.oasis.opendocument.presentation",
  "application/json",
  "application/xml",
  "text/xml",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/tiff",
  "image/bmp",
] as const;

const SUPPORTED_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "rtf",
  "odt",
  "txt",
  "md",
  "html",
  "htm",
  "xls",
  "xlsx",
  "ods",
  "csv",
  "ppt",
  "pptx",
  "odp",
  "json",
  "xml",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "tiff",
  "tif",
  "bmp",
] as const;

export function getSupportedFileTypes(): SupportedFileTypes {
  return {
    mimes: [...SUPPORTED_MIMES],
    extensions: [...SUPPORTED_EXTENSIONS],
  };
}

export function isSupportedMime(mimeType: string): boolean {
  return (SUPPORTED_MIMES as readonly string[]).includes(mimeType);
}

export function isSupportedExtension(extension: string): boolean {
  return (SUPPORTED_EXTENSIONS as readonly string[]).includes(
    extension.toLowerCase()
  );
}

export function isFileSupported(
  mimeType?: string | null,
  extension?: string | null
): boolean {
  if (mimeType && isSupportedMime(mimeType)) {
    return true;
  }
  if (extension && isSupportedExtension(extension)) {
    return true;
  }
  return false;
}
