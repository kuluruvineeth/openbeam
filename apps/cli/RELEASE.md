# Release Runbook

Full process for cutting an `openbeam` CLI release. For user-facing install docs see [/docs/cli/install](../docs/content/docs/cli/install.mdx).

## Pre-flight

**Minimum to cut the first release: nothing.**

The release workflow succeeds with just `GITHUB_TOKEN` (provided automatically). That ships: GitHub Releases with binaries, Linux packages (`.deb`/`.rpm`/`.apk`/`.pkg.tar.zst`), SBOMs, cosign signatures, build provenance attestations, and the multi-arch `ghcr.io/kuluruvineeth/openbeam-cli` Docker image.

### Optional channels (add when you want them)

Each publisher below is gated on env presence — missing one just skips that channel, it does not fail the release.

| Channel | Needs | How to enable |
|---------|-------|---------------|
| Homebrew tap | `HOMEBREW_TAP_PAT` + `kuluruvineeth/homebrew-tap` repo | see below |
| Scoop bucket | `HOMEBREW_TAP_PAT` + `kuluruvineeth/scoop-bucket` repo | same PAT |
| Winget | `HOMEBREW_TAP_PAT` + fork of `microsoft/winget-pkgs` | same PAT |

Commands to bootstrap the tap/bucket/fork:

```sh
gh repo create kuluruvineeth/homebrew-tap --public \
  --description "Homebrew tap for OpenBeam tools"

gh repo create kuluruvineeth/scoop-bucket --public \
  --description "Scoop bucket for OpenBeam tools"

gh repo fork microsoft/winget-pkgs --clone=false
```

`HOMEBREW_TAP_PAT` is a fine-grained PAT with `contents: write` + `pull-requests: write` scoped to those three repos. Set via:

```sh
gh secret set HOMEBREW_TAP_PAT --repo kuluruvineeth/openbeam
```

No cosign key — keyless OIDC via `id-token: write`.

### Local toolchain (dry-runs only)

```sh
brew install goreleaser cosign syft
```

## Cutting a release

```sh
git checkout dev
git pull

# Pick a version — follow semver
VERSION=0.2.0

git tag "v${VERSION}"
git push origin "v${VERSION}"
```

Tag triggers `.github/workflows/release-cli.yml` within ~30 seconds. Monitor:

```sh
gh run watch
```

## Tag format (enforced by workflow)

| Pattern | Type |
|---------|------|
| `vX.Y.Z` | Stable |
| `vX.Y.Z-rc.N` | Release candidate (marked pre-release) |
| `vX.Y.Z-beta.N` | Beta |
| `vX.Y.Z-alpha.N` | Alpha |

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

curl -LO "https://github.com/kuluruvineeth/openbeam/releases/download/v${VERSION}/openbeam_${VERSION}_linux_x86_64.tar.gz"
curl -LO "https://github.com/kuluruvineeth/openbeam/releases/download/v${VERSION}/checksums.txt"
curl -LO "https://github.com/kuluruvineeth/openbeam/releases/download/v${VERSION}/checksums.txt.sigstore.json"

shasum -a 256 -c checksums.txt --ignore-missing

cosign verify-blob \
  --certificate-identity "https://github.com/kuluruvineeth/openbeam/.github/workflows/release-cli.yml@refs/tags/v${VERSION}" \
  --certificate-oidc-issuer 'https://token.actions.githubusercontent.com' \
  --bundle checksums.txt.sigstore.json \
  checksums.txt

gh attestation verify "openbeam_${VERSION}_linux_x86_64.tar.gz" \
  --repo kuluruvineeth/openbeam
```

The workflow's `verify` job runs this same chain automatically — its failure blocks the release from being considered done.

## Rollback

Never re-tag. Always roll forward.

```sh
BAD_VERSION=0.2.0
NEXT_VERSION=0.2.1

gh release delete "v${BAD_VERSION}" --cleanup-tag --yes --repo kuluruvineeth/openbeam

git -C ~/src/homebrew-tap revert HEAD --no-edit && git -C ~/src/homebrew-tap push

git tag "v${NEXT_VERSION}"
git push origin "v${NEXT_VERSION}"
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

`install.sh` and `install.ps1` live in `apps/cli/scripts/`. To host at `https://get.openbeam.work/install.{sh,ps1}`:

1. Set up a Cloudflare Worker (or equivalent) that redirects `get.openbeam.work/install.sh` → `raw.githubusercontent.com/kuluruvineeth/openbeam/dev/apps/cli/scripts/install.sh`.
2. Same for `install.ps1`.
3. Serve with `content-type: text/plain` and cache for no more than 5 minutes.

Users should pin a SHA for the curl-pipe path (`OPENBEAM_VERSION=v0.2.0`) when scripting around it — the installer resolves `latest` via the GitHub API.

## Reference

- [GoReleaser config](./.goreleaser.yaml)
- [Release workflow](../../.github/workflows/release-cli.yml)
- [docgen generator](./cmd/docgen/main.go)
- [install.sh](./scripts/install.sh)
- [install.ps1](./scripts/install.ps1)
