SUPPORTED_MIME_TYPES: dict[str, list[str]] = {
    "pdf": ["application/pdf"],
    "docx": [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ],
    "doc": ["application/msword"],
    "xlsx": [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ],
    "xls": ["application/vnd.ms-excel"],
    "pptx": [
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    ],
    "ppt": ["application/vnd.ms-powerpoint"],
    "txt": ["text/plain"],
    "md": ["text/markdown", "text/x-markdown"],
    "html": ["text/html"],
    "csv": ["text/csv"],
    "json": ["application/json"],
    "xml": ["application/xml", "text/xml"],
    "rtf": ["application/rtf", "text/rtf"],
    "odt": ["application/vnd.oasis.opendocument.text"],
    "ods": ["application/vnd.oasis.opendocument.spreadsheet"],
    "odp": ["application/vnd.oasis.opendocument.presentation"],
    "png": ["image/png"],
    "jpg": ["image/jpeg"],
    "gif": ["image/gif"],
    "webp": ["image/webp"],
    "tiff": ["image/tiff"],
    "bmp": ["image/bmp"],
}

MIME_TO_EXTENSION: dict[str, str] = {
    mime: ext for ext, mimes in SUPPORTED_MIME_TYPES.items() for mime in mimes
}


def get_extension_from_mime(mime_type: str) -> str | None:
    return MIME_TO_EXTENSION.get(mime_type)


def is_supported_mime(mime_type: str) -> bool:
    return mime_type in MIME_TO_EXTENSION


def get_supported_mimes() -> list[str]:
    return list(MIME_TO_EXTENSION.keys())

