from __future__ import annotations

import ipaddress
import socket
from typing import TYPE_CHECKING
from urllib.parse import urlparse

if TYPE_CHECKING:
    from starlette.requests import Request

PRIVATE_IP_RANGES = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
]

BLOCKED_HOSTNAMES = {
    "localhost",
    "localhost.localdomain",
    "metadata.google.internal",
    "metadata",
}


def get_client_ip(request: Request) -> str:
    if hasattr(request.state, "trusted_proxy") and request.state.trusted_proxy:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def is_private_ip(ip_str: str) -> bool:
    try:
        ip = ipaddress.ip_address(ip_str)
        return any(ip in network for network in PRIVATE_IP_RANGES)
    except ValueError:
        return False


def is_safe_url(url: str) -> tuple[bool, str]:
    try:
        parsed = urlparse(url)

        if parsed.scheme not in ("http", "https"):
            return False, f"Invalid scheme: {parsed.scheme}"

        hostname = parsed.hostname
        if not hostname:
            return False, "No hostname provided"

        hostname_lower = hostname.lower()
        if hostname_lower in BLOCKED_HOSTNAMES:
            return False, f"Blocked hostname: {hostname}"

        try:
            resolved_ips = socket.getaddrinfo(hostname, None)
            for _, _, _, _, sockaddr in resolved_ips:
                ip = str(sockaddr[0])
                if is_private_ip(ip):
                    return False, f"URL resolves to private IP: {ip}"
        except socket.gaierror:
            pass

        if is_private_ip(hostname):
            return False, f"Direct private IP not allowed: {hostname}"

        return True, ""
    except Exception as e:
        return False, f"URL validation error: {e}"
