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

const VIDEO_MIMES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-msvideo",
  "video/x-matroska",
  "video/mpeg",
  "video/ogg",
] as const;

const VIDEO_EXTENSIONS = [
  "mp4",
  "mov",
  "webm",
  "avi",
  "mkv",
  "mpeg",
  "ogv",
] as const;

const AUDIO_MIMES = [
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/webm",
  "audio/flac",
  "audio/aac",
  "audio/x-m4a",
] as const;

const AUDIO_EXTENSIONS = [
  "mp3",
  "m4a",
  "wav",
  "ogg",
  "webm",
  "flac",
  "aac",
  "wma",
] as const;

export function getSupportedFileTypes(): SupportedFileTypes {
  return {
    mimes: [...SUPPORTED_MIMES],
    extensions: [...SUPPORTED_EXTENSIONS],
  };
}

export function getSupportedVideoTypes(): SupportedFileTypes {
  return {
    mimes: [...VIDEO_MIMES],
    extensions: [...VIDEO_EXTENSIONS],
  };
}

export function getSupportedAudioTypes(): SupportedFileTypes {
  return {
    mimes: [...AUDIO_MIMES],
    extensions: [...AUDIO_EXTENSIONS],
  };
}

export function getSupportedMediaTypes(): SupportedFileTypes {
  return {
    mimes: [...VIDEO_MIMES, ...AUDIO_MIMES],
    extensions: [...VIDEO_EXTENSIONS, ...AUDIO_EXTENSIONS],
  };
}

export function getAllSupportedTypes(): SupportedFileTypes {
  return {
    mimes: [...SUPPORTED_MIMES, ...VIDEO_MIMES, ...AUDIO_MIMES],
    extensions: [
      ...SUPPORTED_EXTENSIONS,
      ...VIDEO_EXTENSIONS,
      ...AUDIO_EXTENSIONS,
    ],
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

export function isVideoMime(mimeType: string): boolean {
  return (VIDEO_MIMES as readonly string[]).includes(mimeType);
}

export function isVideoExtension(extension: string): boolean {
  return (VIDEO_EXTENSIONS as readonly string[]).includes(
    extension.toLowerCase()
  );
}

export function isVideoFile(
  mimeType?: string | null,
  extension?: string | null
): boolean {
  if (mimeType && isVideoMime(mimeType)) {
    return true;
  }
  if (extension && isVideoExtension(extension)) {
    return true;
  }
  return false;
}

export function isAudioMime(mimeType: string): boolean {
  return (AUDIO_MIMES as readonly string[]).includes(mimeType);
}

export function isAudioExtension(extension: string): boolean {
  return (AUDIO_EXTENSIONS as readonly string[]).includes(
    extension.toLowerCase()
  );
}

export function isAudioFile(
  mimeType?: string | null,
  extension?: string | null
): boolean {
  if (mimeType && isAudioMime(mimeType)) {
    return true;
  }
  if (extension && isAudioExtension(extension)) {
    return true;
  }
  return false;
}

export function isMediaFile(
  mimeType?: string | null,
  extension?: string | null
): boolean {
  return isVideoFile(mimeType, extension) || isAudioFile(mimeType, extension);
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

export function isAnyFileSupported(
  mimeType?: string | null,
  extension?: string | null
): boolean {
  return (
    isFileSupported(mimeType, extension) || isMediaFile(mimeType, extension)
  );
}
