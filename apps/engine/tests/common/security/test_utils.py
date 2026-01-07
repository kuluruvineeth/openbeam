from __future__ import annotations

from unittest.mock import MagicMock

from engine.common.security.utils import get_client_ip


class TestGetClientIp:
    def test_from_forwarded_header(self):
        request = MagicMock()
        request.headers.get.return_value = "203.0.113.195, 70.41.3.18, 150.172.238.178"
        result = get_client_ip(request)
        assert result == "203.0.113.195"
        request.headers.get.assert_called_with("X-Forwarded-For")

    def test_single_forwarded_ip(self):
        request = MagicMock()
        request.headers.get.return_value = "192.168.1.100"
        result = get_client_ip(request)
        assert result == "192.168.1.100"

    def test_forwarded_with_spaces(self):
        request = MagicMock()
        request.headers.get.return_value = "  10.0.0.1  ,  10.0.0.2  "
        result = get_client_ip(request)
        assert result == "10.0.0.1"

    def test_from_client_host(self):
        request = MagicMock()
        request.headers.get.return_value = None
        request.client.host = "127.0.0.1"
        result = get_client_ip(request)
        assert result == "127.0.0.1"

    def test_no_client(self):
        request = MagicMock()
        request.headers.get.return_value = None
        request.client = None
        result = get_client_ip(request)
        assert result == "unknown"

    def test_forwarded_priority(self):
        request = MagicMock()
        request.headers.get.return_value = "10.0.0.1"
        request.client.host = "127.0.0.1"
        result = get_client_ip(request)
        assert result == "10.0.0.1"
