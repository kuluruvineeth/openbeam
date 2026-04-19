# Release Runbook

Full process for cutting an `openbeam` CLI release. For user-facing install docs see [/docs/cli/install](../docs/content/docs/cli/install.mdx).

## Pre-flight (one-time setup)

### 1. GitHub repositories

Create these under the `kuluruvineeth` account (or wherever the tap/bucket/fork should live):

```sh
gh repo create kuluruvineeth/homebrew-tap --public \
  --description "Homebrew tap for OpenBeam tools"

gh repo create kuluruvineeth/scoop-bucket --public \
  --description "Scoop bucket for OpenBeam tools"

gh repo fork microsoft/winget-pkgs --clone=false
```

All three are push targets for GoReleaser on each release.

### 2. Secrets

In the monorepo's GitHub → Settings → Secrets → Actions:

| Secret | Purpose | Scope |
|--------|---------|-------|
| `HOMEBREW_TAP_PAT` | Fine-grained PAT with `contents: write` on `homebrew-tap`, `scoop-bucket`, and `winget-pkgs` fork | 3 repos |
| `NPM_TOKEN` | npm automation token for `@openbeam` scope | optional, only if publishing npm wrapper |

No cosign key — we use keyless OIDC via `id-token: write` in the workflow.

### 3. Local toolchain (for dry-runs only)

```sh
brew install goreleaser cosign syft
```

## Cutting a release

```sh
git checkout dev
git pull

# Pick a version — follow semver
VERSION=0.2.0

git tag "cli-v${VERSION}"
git push origin "cli-v${VERSION}"
```

Tag triggers `.github/workflows/release-cli.yml` within ~30 seconds. Monitor:

```sh
gh run watch
```

## Tag format (enforced by workflow)

| Pattern | Type |
|---------|------|
| `cli-vX.Y.Z` | Stable |
| `cli-vX.Y.Z-rc.N` | Release candidate (marked pre-release) |
| `cli-vX.Y.Z-beta.N` | Beta |
| `cli-vX.Y.Z-alpha.N` | Alpha |

## What the workflow produces

Artifacts attached to the GitHub Release:

| Artifact | Purpose |
|----------|---------|
| `openbeam_<version>_{darwin,linux,windows}_{arm64,x86_64}.{tar.gz,zip}` | 6 platform archives |
| `openbeam_<version>_linux_{amd64,arm64}.{deb,rpm,apk,pkg.tar.zst}` | 8 Linux packages |
| `*.sbom.json` | SPDX SBOM per archive |
| `checksums.txt` | SHA256 of all artifacts |
| `checksums.txt.sigstore.json` | cosign keyless signature bundle |

Auto-published:

| Target | Where |
|--------|-------|
| Homebrew cask | `kuluruvineeth/homebrew-tap/Casks/openbeam.rb` |
| Scoop manifest | `kuluruvineeth/scoop-bucket/bucket/openbeam.json` |
| Winget PR | `microsoft/winget-pkgs#<new PR>` |

## Verify after release

```sh
VERSION=0.2.0
cd "$(mktemp -d)"

curl -LO "https://github.com/kuluruvineeth/openplane/releases/download/cli-v${VERSION}/openbeam_${VERSION}_linux_x86_64.tar.gz"
curl -LO "https://github.com/kuluruvineeth/openplane/releases/download/cli-v${VERSION}/checksums.txt"
curl -LO "https://github.com/kuluruvineeth/openplane/releases/download/cli-v${VERSION}/checksums.txt.sigstore.json"

shasum -a 256 -c checksums.txt --ignore-missing

cosign verify-blob \
  --certificate-identity "https://github.com/kuluruvineeth/openplane/.github/workflows/release-cli.yml@refs/tags/cli-v${VERSION}" \
  --certificate-oidc-issuer 'https://token.actions.githubusercontent.com' \
  --bundle checksums.txt.sigstore.json \
  checksums.txt

gh attestation verify "openbeam_${VERSION}_linux_x86_64.tar.gz" \
  --repo kuluruvineeth/openplane
```

The workflow's `verify` job runs this same chain automatically — its failure blocks the release from being considered done.

## Rollback

Never re-tag. Always roll forward.

```sh
BAD_VERSION=0.2.0
NEXT_VERSION=0.2.1

gh release delete "cli-v${BAD_VERSION}" --cleanup-tag --yes --repo kuluruvineeth/openplane

git -C ~/src/homebrew-tap revert HEAD --no-edit && git -C ~/src/homebrew-tap push

git tag "cli-v${NEXT_VERSION}"
git push origin "cli-v${NEXT_VERSION}"
```

## Local dry-run

```sh
cd apps/cli
goreleaser check
HOMEBREW_TAP_PAT=dummy goreleaser release \
  --snapshot --clean \
  --skip=publish,sign,sbom,homebrew,scoop,winget
```

`dist/` will hold all archives, packages, and `checksums.txt`. Binaries can be inspected directly.

## Windows install script hosting

`install.sh` and `install.ps1` live in `apps/cli/scripts/`. To host at `https://get.openbeam.com/install.{sh,ps1}`:

1. Set up a Cloudflare Worker (or equivalent) that redirects `get.openbeam.com/install.sh` → `raw.githubusercontent.com/kuluruvineeth/openplane/dev/apps/cli/scripts/install.sh`.
2. Same for `install.ps1`.
3. Serve with `content-type: text/plain` and cache for no more than 5 minutes.

Users should pin a SHA for the curl-pipe path (`OPENBEAM_VERSION=cli-v0.2.0`) when scripting around it — the installer resolves `latest` via the GitHub API.

## Reference

- [GoReleaser config](./.goreleaser.yaml)
- [Release workflow](../../.github/workflows/release-cli.yml)
- [docgen generator](./cmd/docgen/main.go)
- [install.sh](./scripts/install.sh)
- [install.ps1](./scripts/install.ps1)
