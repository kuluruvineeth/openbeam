# OpenBeam CLI

Enterprise search and AI assistant from the command line.

## Install

```sh
curl -fsSL https://get.openbeam.com/install.sh | bash
```

See [installation docs](https://docs.openbeam.com/cli/install) for Homebrew, Scoop, Winget, npm, and Docker.

## Quick start

```sh
openbeam auth login
openbeam search "quarterly report"
openbeam computer run digest
openbeam agent list
```

## Shell completions

After install, enable completions for your shell:

```sh
# bash
openbeam completion bash > /etc/bash_completion.d/openbeam

# zsh
openbeam completion zsh > "${fpath[1]}/_openbeam"

# fish
openbeam completion fish > ~/.config/fish/completions/openbeam.fish
```

Linux packages (`.deb` / `.rpm` / `.apk` / `.pkg.tar.zst`) install completions and the manpage automatically.

## Manpage

```sh
man openbeam
```

## Verify a release

Every release is signed with cosign (keyless OIDC) and carries a GitHub build provenance attestation.

```sh
shasum -a 256 -c checksums.txt

cosign verify-blob \
  --certificate-identity-regexp "https://github.com/kuluruvineeth/openplane/.github/workflows/release-cli.yml@.*" \
  --certificate-oidc-issuer 'https://token.actions.githubusercontent.com' \
  --bundle checksums.txt.sigstore.json \
  checksums.txt

gh attestation verify openbeam_<version>_<os>_<arch>.tar.gz \
  --repo kuluruvineeth/openplane
```

## Documentation

Full reference: https://docs.openbeam.com/cli
