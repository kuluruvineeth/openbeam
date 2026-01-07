from __future__ import annotations

from engine.utils.mime import (
    MIME_TO_EXTENSION,
    SUPPORTED_MIME_TYPES,
    get_extension_from_mime,
    get_supported_mimes,
    is_supported_mime,
)


class TestSupportedMimeTypes:
    def test_contains_pdf(self):
        assert "pdf" in SUPPORTED_MIME_TYPES
        assert "application/pdf" in SUPPORTED_MIME_TYPES["pdf"]

    def test_contains_docx(self):
        assert "docx" in SUPPORTED_MIME_TYPES

    def test_contains_images(self):
        assert "png" in SUPPORTED_MIME_TYPES
        assert "jpg" in SUPPORTED_MIME_TYPES
        assert "gif" in SUPPORTED_MIME_TYPES


class TestMimeToExtension:
    def test_pdf_mime_maps_to_pdf(self):
        assert MIME_TO_EXTENSION["application/pdf"] == "pdf"

    def test_jpeg_mime_maps_to_jpg(self):
        assert MIME_TO_EXTENSION["image/jpeg"] == "jpg"

    def test_multiple_mimes_same_extension(self):
        assert MIME_TO_EXTENSION["text/markdown"] == "md"
        assert MIME_TO_EXTENSION["text/x-markdown"] == "md"


class TestGetExtensionFromMime:
    def test_returns_extension_for_known_mime(self):
        assert get_extension_from_mime("application/pdf") == "pdf"

    def test_returns_none_for_unknown_mime(self):
        assert get_extension_from_mime("application/unknown") is None

    def test_handles_text_plain(self):
        assert get_extension_from_mime("text/plain") == "txt"

    def test_handles_image_types(self):
        assert get_extension_from_mime("image/png") == "png"
        assert get_extension_from_mime("image/jpeg") == "jpg"


class TestIsSupportedMime:
    def test_returns_true_for_supported(self):
        assert is_supported_mime("application/pdf") is True
        assert is_supported_mime("text/plain") is True
        assert is_supported_mime("image/png") is True

    def test_returns_false_for_unsupported(self):
        assert is_supported_mime("application/unknown") is False
        assert is_supported_mime("video/mp4") is False
        assert is_supported_mime("") is False


class TestGetSupportedMimes:
    def test_returns_list(self):
        mimes = get_supported_mimes()
        assert isinstance(mimes, list)

    def test_contains_common_mimes(self):
        mimes = get_supported_mimes()
        assert "application/pdf" in mimes
        assert "text/plain" in mimes
        assert "image/png" in mimes

    def test_count_matches_dict(self):
        mimes = get_supported_mimes()
        assert len(mimes) == len(MIME_TO_EXTENSION)
