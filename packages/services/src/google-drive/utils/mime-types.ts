import { GOOGLE_WORKSPACE_MIME_TYPES } from "@openplane/types/services/connectors/google-drive";

const LEADING_DOT_REGEX = /^\./;

export const DOCUMENT_TYPES = {
  folder: "folder",
  file: "file",
  document: "document",
  spreadsheet: "spreadsheet",
  presentation: "presentation",
  form: "form",
  drawing: "drawing",
  pdf: "pdf",
  image: "image",
  video: "video",
  audio: "audio",
  archive: "archive",
  code: "code",
  text: "text",
  shortcut: "shortcut",
} as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[keyof typeof DOCUMENT_TYPES];

const MIME_TYPE_TO_DOCUMENT_TYPE: Record<string, DocumentType> = {
  [GOOGLE_WORKSPACE_MIME_TYPES.FOLDER]: DOCUMENT_TYPES.folder,
  [GOOGLE_WORKSPACE_MIME_TYPES.DOCUMENT]: DOCUMENT_TYPES.document,
  [GOOGLE_WORKSPACE_MIME_TYPES.SPREADSHEET]: DOCUMENT_TYPES.spreadsheet,
  [GOOGLE_WORKSPACE_MIME_TYPES.PRESENTATION]: DOCUMENT_TYPES.presentation,
  [GOOGLE_WORKSPACE_MIME_TYPES.FORM]: DOCUMENT_TYPES.form,
  [GOOGLE_WORKSPACE_MIME_TYPES.DRAWING]: DOCUMENT_TYPES.drawing,
  [GOOGLE_WORKSPACE_MIME_TYPES.SHORTCUT]: DOCUMENT_TYPES.shortcut,

  "application/pdf": DOCUMENT_TYPES.pdf,

  "image/jpeg": DOCUMENT_TYPES.image,
  "image/png": DOCUMENT_TYPES.image,
  "image/gif": DOCUMENT_TYPES.image,
  "image/webp": DOCUMENT_TYPES.image,
  "image/svg+xml": DOCUMENT_TYPES.image,
  "image/bmp": DOCUMENT_TYPES.image,
  "image/tiff": DOCUMENT_TYPES.image,

  "video/mp4": DOCUMENT_TYPES.video,
  "video/quicktime": DOCUMENT_TYPES.video,
  "video/x-msvideo": DOCUMENT_TYPES.video,
  "video/webm": DOCUMENT_TYPES.video,
  "video/x-matroska": DOCUMENT_TYPES.video,
  "video/x-flv": DOCUMENT_TYPES.video,

  "audio/mpeg": DOCUMENT_TYPES.audio,
  "audio/wav": DOCUMENT_TYPES.audio,
  "audio/mp4": DOCUMENT_TYPES.audio,
  "audio/webm": DOCUMENT_TYPES.audio,
  "audio/ogg": DOCUMENT_TYPES.audio,
  "audio/flac": DOCUMENT_TYPES.audio,

  "application/zip": DOCUMENT_TYPES.archive,
  "application/x-rar-compressed": DOCUMENT_TYPES.archive,
  "application/x-tar": DOCUMENT_TYPES.archive,
  "application/gzip": DOCUMENT_TYPES.archive,
  "application/x-7z-compressed": DOCUMENT_TYPES.archive,

  "text/plain": DOCUMENT_TYPES.text,
  "text/csv": DOCUMENT_TYPES.text,
  "text/markdown": DOCUMENT_TYPES.text,
  "text/html": DOCUMENT_TYPES.text,
  "text/xml": DOCUMENT_TYPES.text,

  "application/javascript": DOCUMENT_TYPES.code,
  "application/typescript": DOCUMENT_TYPES.code,
  "application/json": DOCUMENT_TYPES.code,
  "text/javascript": DOCUMENT_TYPES.code,
  "text/typescript": DOCUMENT_TYPES.code,
  "text/x-python": DOCUMENT_TYPES.code,
  "text/x-java": DOCUMENT_TYPES.code,
  "text/x-c": DOCUMENT_TYPES.code,
  "text/x-csharp": DOCUMENT_TYPES.code,
  "text/x-go": DOCUMENT_TYPES.code,
  "text/x-rust": DOCUMENT_TYPES.code,
};

export function getDocumentType(mimeType: string): DocumentType {
  const exactMatch = MIME_TYPE_TO_DOCUMENT_TYPE[mimeType];
  if (exactMatch) {
    return exactMatch;
  }

  if (mimeType.startsWith("image/")) {
    return DOCUMENT_TYPES.image;
  }
  if (mimeType.startsWith("video/")) {
    return DOCUMENT_TYPES.video;
  }
  if (mimeType.startsWith("audio/")) {
    return DOCUMENT_TYPES.audio;
  }
  if (mimeType.startsWith("text/")) {
    return DOCUMENT_TYPES.text;
  }
  if (mimeType.includes("document") || mimeType.includes("word")) {
    return DOCUMENT_TYPES.document;
  }
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) {
    return DOCUMENT_TYPES.spreadsheet;
  }
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) {
    return DOCUMENT_TYPES.presentation;
  }
  if (
    mimeType.includes("zip") ||
    mimeType.includes("archive") ||
    mimeType.includes("compressed")
  ) {
    return DOCUMENT_TYPES.archive;
  }

  return DOCUMENT_TYPES.file;
}

export function isMediaType(mimeType: string): boolean {
  return (
    mimeType.startsWith("video/") ||
    mimeType.startsWith("audio/") ||
    mimeType.startsWith("image/")
  );
}

export function isVideoType(mimeType: string): boolean {
  return mimeType.startsWith("video/");
}

export function isAudioType(mimeType: string): boolean {
  return mimeType.startsWith("audio/");
}

export function isImageType(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

export function isTextExtractable(mimeType: string): boolean {
  return (
    mimeType === GOOGLE_WORKSPACE_MIME_TYPES.DOCUMENT ||
    mimeType === GOOGLE_WORKSPACE_MIME_TYPES.SPREADSHEET ||
    mimeType === GOOGLE_WORKSPACE_MIME_TYPES.PRESENTATION ||
    mimeType === "application/pdf" ||
    mimeType.startsWith("text/")
  );
}

export function getFileExtension(mimeType: string): string | null {
  const extensions: Record<string, string> = {
    [GOOGLE_WORKSPACE_MIME_TYPES.DOCUMENT]: "gdoc",
    [GOOGLE_WORKSPACE_MIME_TYPES.SPREADSHEET]: "gsheet",
    [GOOGLE_WORKSPACE_MIME_TYPES.PRESENTATION]: "gslides",
    [GOOGLE_WORKSPACE_MIME_TYPES.FORM]: "gform",
    [GOOGLE_WORKSPACE_MIME_TYPES.DRAWING]: "gdraw",
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/webm": "webm",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "text/plain": "txt",
    "text/csv": "csv",
    "text/markdown": "md",
    "text/html": "html",
    "application/json": "json",
    "application/javascript": "js",
    "application/zip": "zip",
  };

  return extensions[mimeType] ?? null;
}

/**
 * Check if a file type can be parsed by the engine for text extraction.
 * Archives, executables, and other binary formats that can't be parsed should be skipped.
 */
export function isParseableFileType(mimeType: string): boolean {
  const docType = getDocumentType(mimeType);

  // Skip archives - they can't be parsed
  if (docType === DOCUMENT_TYPES.archive) {
    return false;
  }

  // Skip media files - they go through media pipeline, not file parsing
  if (docType === DOCUMENT_TYPES.video || docType === DOCUMENT_TYPES.audio) {
    return false;
  }

  // Images are handled separately (OCR or skip)
  if (docType === DOCUMENT_TYPES.image) {
    return false;
  }

  // Skip known unparsable binary formats
  const unparsable = [
    "application/octet-stream",
    "application/x-msdownload",
    "application/x-executable",
    "application/x-mach-binary",
    "application/x-sharedlib",
  ];
  if (unparsable.includes(mimeType)) {
    return false;
  }

  return true;
}

export function getMimeTypeFromExtension(extension: string): string | null {
  const ext = extension.toLowerCase().replace(LEADING_DOT_REGEX, "");

  const mimeTypes: Record<string, string> = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    mp4: "video/mp4",
    mov: "video/quicktime",
    webm: "video/webm",
    avi: "video/x-msvideo",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    flac: "audio/flac",
    txt: "text/plain",
    csv: "text/csv",
    md: "text/markdown",
    html: "text/html",
    htm: "text/html",
    xml: "text/xml",
    json: "application/json",
    js: "application/javascript",
    ts: "application/typescript",
    zip: "application/zip",
    rar: "application/x-rar-compressed",
    tar: "application/x-tar",
    gz: "application/gzip",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  };

  return mimeTypes[ext] ?? null;
}
