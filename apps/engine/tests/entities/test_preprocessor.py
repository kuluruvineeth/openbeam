from __future__ import annotations

import pytest

from engine.entities.preprocessor import TextPreprocessor


@pytest.fixture
def preprocessor() -> TextPreprocessor:
    return TextPreprocessor()


class TestEmptyInput:
    def test_empty_string(self, preprocessor: TextPreprocessor) -> None:
        result = preprocessor.clean("")
        assert result.cleaned == ""
        assert result.masks == []

    def test_none_like_empty(self, preprocessor: TextPreprocessor) -> None:
        result = preprocessor.clean("")
        assert result.cleaned == ""


class TestFencedCodeBlocks:
    def test_backtick_code_block(self, preprocessor: TextPreprocessor) -> None:
        text = "Before ```python\nprint('hello')\n``` after"
        result = preprocessor.clean(text)
        assert "print" not in result.cleaned
        assert "Before" in result.cleaned
        assert "after" in result.cleaned

    def test_tilde_code_block(self, preprocessor: TextPreprocessor) -> None:
        text = "Before ~~~\ncode here\n~~~ after"
        result = preprocessor.clean(text)
        assert "code here" not in result.cleaned

    def test_inline_code(self, preprocessor: TextPreprocessor) -> None:
        text = "Use `kubectl apply` to deploy"
        result = preprocessor.clean(text)
        assert "kubectl apply" not in result.cleaned
        assert "deploy" in result.cleaned


class TestConnectionStrings:
    def test_mongodb_uri(self, preprocessor: TextPreprocessor) -> None:
        text = "Connect to mongodb://user:pass@host:27017/db for data"
        result = preprocessor.clean(text)
        assert "mongodb://" not in result.cleaned
        assert "Connect to" in result.cleaned

    def test_mongodb_srv(self, preprocessor: TextPreprocessor) -> None:
        text = "Use mongodb+srv://cluster.abc.net/mydb"
        result = preprocessor.clean(text)
        assert "mongodb+srv" not in result.cleaned

    def test_postgresql_uri(self, preprocessor: TextPreprocessor) -> None:
        text = "Database: postgresql://localhost:5432/openbeam"
        result = preprocessor.clean(text)
        assert "postgresql://" not in result.cleaned

    def test_redis_uri(self, preprocessor: TextPreprocessor) -> None:
        text = "Cache at redis://localhost:6379/0"
        result = preprocessor.clean(text)
        assert "redis://" not in result.cleaned


class TestTokensAndSecrets:
    def test_jwt_token(self, preprocessor: TextPreprocessor) -> None:
        jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U"
        text = f"Bearer {jwt}"
        result = preprocessor.clean(text)
        assert "eyJ" not in result.cleaned

    def test_aws_arn(self, preprocessor: TextPreprocessor) -> None:
        text = "Resource arn:aws:s3:::my-bucket/path is protected"
        result = preprocessor.clean(text)
        assert "arn:aws" not in result.cleaned

    def test_api_key_assignment(self, preprocessor: TextPreprocessor) -> None:
        text = "api_key = sk_live_1234567890abcdefghijklmnop"
        result = preprocessor.clean(text)
        assert "sk_live" not in result.cleaned

    def test_github_pat(self, preprocessor: TextPreprocessor) -> None:
        text = f"Token: ghp_{'a' * 36}"
        result = preprocessor.clean(text)
        assert "ghp_" not in result.cleaned

    def test_slack_token(self, preprocessor: TextPreprocessor) -> None:
        text = "Token: xoxb-1234567890-1234567890-abcdefghijklmnopqrstuvwxyz"
        result = preprocessor.clean(text)
        assert "xoxb-" not in result.cleaned

    def test_pem_block(self, preprocessor: TextPreprocessor) -> None:
        text = "-----BEGIN RSA PRIVATE KEY-----\nMIIBogIBAAJ\n-----END RSA PRIVATE KEY-----"
        result = preprocessor.clean(text)
        assert "PRIVATE KEY" not in result.cleaned


class TestHashesAndDigests:
    def test_sha256_digest(self, preprocessor: TextPreprocessor) -> None:
        text = "Image: nginx@sha256:" + "a" * 64
        result = preprocessor.clean(text)
        assert "sha256" not in result.cleaned

    def test_git_sha(self, preprocessor: TextPreprocessor) -> None:
        text = f"Commit {('a' * 40)} merged"
        result = preprocessor.clean(text)
        assert "a" * 40 not in result.cleaned


class TestUrlsAndPaths:
    def test_url(self, preprocessor: TextPreprocessor) -> None:
        text = "Visit https://example.com/path?q=1 for info"
        result = preprocessor.clean(text)
        assert "https://example.com" not in result.cleaned
        assert "Visit" in result.cleaned

    def test_email_masked(self, preprocessor: TextPreprocessor) -> None:
        text = "Contact john@example.com please"
        result = preprocessor.clean(text)
        assert "john@example.com" not in result.cleaned
        assert "Contact" in result.cleaned

    def test_file_path(self, preprocessor: TextPreprocessor) -> None:
        text = "Error in /var/log/app/error.log"
        result = preprocessor.clean(text)
        assert "/var/log/app/error.log" not in result.cleaned

    def test_windows_path(self, preprocessor: TextPreprocessor) -> None:
        text = r"File at C:\Users\admin\Documents\config.json"
        result = preprocessor.clean(text)
        assert "Users" not in result.cleaned


class TestStackTraces:
    def test_java_stack_trace(self, preprocessor: TextPreprocessor) -> None:
        text = "Error occurred\n    at com.example.Main.run(Main.java:42)"
        result = preprocessor.clean(text)
        assert "Main.java" not in result.cleaned

    def test_python_traceback(self, preprocessor: TextPreprocessor) -> None:
        text = 'Traceback:\n  File "/app/main.py", line 10'
        result = preprocessor.clean(text)
        assert "/app/main.py" not in result.cleaned


class TestMarkdownCleaning:
    def test_markdown_links_preserve_text(self, preprocessor: TextPreprocessor) -> None:
        text = "Read the [documentation](https://docs.example.com) now"
        result = preprocessor.clean(text)
        assert "documentation" in result.cleaned
        assert "https://" not in result.cleaned

    def test_markdown_headings_stripped(self, preprocessor: TextPreprocessor) -> None:
        text = "## Section Title\nContent here"
        result = preprocessor.clean(text)
        assert "Section Title" in result.cleaned
        assert "##" not in result.cleaned

    def test_markdown_emphasis_stripped(self, preprocessor: TextPreprocessor) -> None:
        text = "This is **bold** and *italic*"
        result = preprocessor.clean(text)
        assert "bold" in result.cleaned
        assert "italic" in result.cleaned
        assert "**" not in result.cleaned
        assert "*italic*" not in result.cleaned

    def test_markdown_images_removed(self, preprocessor: TextPreprocessor) -> None:
        text = "See ![diagram](https://img.example.com/arch.png) below"
        result = preprocessor.clean(text)
        assert "img.example.com" not in result.cleaned


class TestWhitespaceNormalization:
    def test_multiple_spaces_collapsed(self, preprocessor: TextPreprocessor) -> None:
        text = "too    many     spaces"
        result = preprocessor.clean(text)
        assert result.cleaned == "too many spaces"

    def test_excess_blank_lines_collapsed(self, preprocessor: TextPreprocessor) -> None:
        text = "para1\n\n\n\n\npara2"
        result = preprocessor.clean(text)
        assert result.cleaned == "para1\n\npara2"


class TestMaskTracking:
    def test_masks_populated(self, preprocessor: TextPreprocessor) -> None:
        text = "See https://example.com for details"
        result = preprocessor.clean(text)
        assert len(result.masks) >= 1
        assert any("https://example.com" in m.original for m in result.masks)

    def test_no_masks_for_clean_text(self, preprocessor: TextPreprocessor) -> None:
        text = "John Smith works at Acme Corp in New York"
        result = preprocessor.clean(text)
        assert result.masks == []
        assert "John Smith" in result.cleaned


class TestRealWorldEnterprise:
    def test_mixed_enterprise_document(self, preprocessor: TextPreprocessor) -> None:
        text = (
            "## Deployment Notes\n\n"
            "John Smith deployed v2.3.1 to production.\n\n"
            "```yaml\napiVersion: apps/v1\nkind: Deployment\n```\n\n"
            "Connected to mongodb+srv://prod-cluster.abc.net/app\n"
            "API key: sk_live_abcdefghijklmnopqrstuvwxyz1234\n\n"
            "Contact john@company.com or @alice for issues.\n"
            "See [runbook](https://wiki.internal/deploy) for details."
        )
        result = preprocessor.clean(text)

        assert "John Smith" in result.cleaned
        assert "deployed" in result.cleaned
        assert "production" in result.cleaned
        assert "runbook" in result.cleaned

        assert "mongodb+srv" not in result.cleaned
        assert "sk_live" not in result.cleaned
        assert "apiVersion" not in result.cleaned
        assert "https://wiki" not in result.cleaned
