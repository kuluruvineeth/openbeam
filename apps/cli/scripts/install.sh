#!/usr/bin/env bash
set -euo pipefail

REPO="${OPENBEAM_REPO:-kuluruvineeth/openplane}"
VERSION="${OPENBEAM_VERSION:-latest}"
INSTALL_DIR="${OPENBEAM_INSTALL:-$HOME/.openbeam}"
BIN_DIR="$INSTALL_DIR/bin"

red()    { printf '\033[0;31m%s\033[0m\n' "$*" >&2; }
green()  { printf '\033[0;32m%s\033[0m\n' "$*"; }
yellow() { printf '\033[0;33m%s\033[0m\n' "$*"; }
info()   { printf '%s\n' "$*"; }
error()  { red "error: $*"; exit 1; }

command -v curl >/dev/null || error "curl is required"
command -v tar  >/dev/null || command -v unzip >/dev/null || error "tar or unzip is required"

platform=$(uname -ms)
case "$platform" in
  'Darwin x86_64')   target=darwin_x86_64; archive_ext=tar.gz ;;
  'Darwin arm64')    target=darwin_arm64;  archive_ext=tar.gz ;;
  'Linux x86_64')    target=linux_x86_64;  archive_ext=tar.gz ;;
  'Linux aarch64'|'Linux arm64') target=linux_arm64; archive_ext=tar.gz ;;
  MINGW*|MSYS*|CYGWIN*|Windows*) error "Run install.ps1 on Windows (irm https://get.openbeam.com/install.ps1 | iex)" ;;
  *) error "Unsupported platform: $platform" ;;
esac

if [ "$target" = "darwin_x86_64" ] && [ "$(sysctl -n sysctl.proc_translated 2>/dev/null || echo 0)" = "1" ]; then
  yellow "Detected Rosetta 2 — installing native darwin_arm64 build instead"
  target=darwin_arm64
fi

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

if [ "$VERSION" = "latest" ]; then
  yellow "Resolving latest release..."
  resolved_tag="$(
    curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" \
      | sed -n 's/.*"tag_name": *"\(cli-v[^"]*\)".*/\1/p' \
      | head -n1
  )"
  if [ -z "$resolved_tag" ]; then
    yellow "No 'cli-v*' release marked as latest — falling back to the most recent cli- tag"
    resolved_tag="$(
      curl -fsSL "https://api.github.com/repos/$REPO/releases?per_page=20" \
        | sed -n 's/.*"tag_name": *"\(cli-v[^"]*\)".*/\1/p' \
        | head -n1
    )"
  fi
  [ -n "$resolved_tag" ] || error "Could not resolve a cli-v* release for $REPO"
  tag="$resolved_tag"
else
  tag="$VERSION"
fi

resolved_version="${tag#cli-v}"
archive="openbeam_${resolved_version}_${target}.${archive_ext}"
base="https://github.com/$REPO/releases/download/$tag"

info "Downloading $archive"
curl --fail --location --progress-bar -o "$tmp_dir/$archive" "$base/$archive"
curl --fail --location --silent --show-error -o "$tmp_dir/checksums.txt" "$base/checksums.txt"

info "Verifying checksum"
(cd "$tmp_dir" && shasum -a 256 --check --ignore-missing checksums.txt | grep -F "$archive")

if command -v cosign >/dev/null; then
  if curl --fail --location --silent --show-error -o "$tmp_dir/checksums.txt.sigstore.json" "$base/checksums.txt.sigstore.json"; then
    info "Verifying cosign signature"
    cosign verify-blob \
      --certificate-identity-regexp "https://github.com/$REPO/.github/workflows/release-cli.yml@.*" \
      --certificate-oidc-issuer 'https://token.actions.githubusercontent.com' \
      --bundle "$tmp_dir/checksums.txt.sigstore.json" \
      "$tmp_dir/checksums.txt" \
      >/dev/null 2>&1 && green "cosign signature verified"
  fi
fi

mkdir -p "$BIN_DIR"
tar -C "$tmp_dir" -xzf "$tmp_dir/$archive"
[ -f "$tmp_dir/openbeam" ] || error "openbeam binary not found in archive"
chmod +x "$tmp_dir/openbeam"
mv -f "$tmp_dir/openbeam" "$BIN_DIR/openbeam"

green "openbeam $resolved_version installed to $BIN_DIR/openbeam"

case ":$PATH:" in
  *":$BIN_DIR:"*) ;;
  *)
    shell_name="$(basename "${SHELL:-sh}")"
    rc_file=""
    case "$shell_name" in
      bash) rc_file="$HOME/.bashrc" ;;
      zsh)  rc_file="$HOME/.zshrc" ;;
      fish) rc_file="$HOME/.config/fish/config.fish" ;;
    esac

    if [ -n "$rc_file" ] && [ "${OPENBEAM_NO_PATH_UPDATE:-0}" != "1" ]; then
      mkdir -p "$(dirname "$rc_file")"
      touch "$rc_file"
      if ! grep -q "OPENBEAM_INSTALL" "$rc_file" 2>/dev/null; then
        if [ "$shell_name" = "fish" ]; then
          {
            printf '\n# openbeam\n'
            printf 'set -gx OPENBEAM_INSTALL %s\n' "$INSTALL_DIR"
            printf 'fish_add_path %s/bin\n' "$INSTALL_DIR"
          } >> "$rc_file"
        else
          {
            printf '\n# openbeam\n'
            printf 'export OPENBEAM_INSTALL="%s"\n' "$INSTALL_DIR"
            printf 'export PATH="$OPENBEAM_INSTALL/bin:$PATH"\n'
          } >> "$rc_file"
        fi
        yellow "Added openbeam to PATH in $rc_file — restart your shell or run:"
        yellow "  source $rc_file"
      fi
    else
      yellow "Add this to your shell profile:"
      yellow "  export PATH=\"$BIN_DIR:\$PATH\""
    fi
    ;;
esac

green "Run 'openbeam --help' to get started."
