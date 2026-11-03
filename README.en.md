# Gridea for ARM64

[简体中文](README.md) | English

An unofficial Apple Silicon maintenance fork of [Gridea](https://github.com/getgridea/gridea). Built with Electron and runs natively on ARM64 without Rosetta. This is separate from the SwiftUI client and is not an upstream official release.

Baseline: Gridea 0.9.3, internal build 0.9.3.8. **Pre-release software**, not a stable release.

[Download test builds](https://github.com/Gridea-Community/gridea-arm64/releases) · [Installation and backups](docs/INSTALL.md)

## Changes

- Native Apple Silicon runtime and Gridea app icon.
- System, light and dark appearance, preserving Gridea workflows and theme interfaces.
- webpack 5 with mandatory Vue/TypeScript checks.
- Isolated renderer, restricted IPC, local-file and preview hardening.
- Atomic article/JSON writes and local Vue 2 compiler mitigations with regression tests.

## Build and test

Requires Apple Silicon macOS 13+, Node.js 22+, pnpm 10.20.0 and Python 3. First installation needs network access for dependencies and Electron.

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm test:build
pnpm test:sites
pnpm build:arm64
python3 scripts/package-arm64.py
codesign --force --deep --sign - 'release/Gridea for ARM64.app'
python3 scripts/verify-arm64-package.py
```

Output: `release/Gridea for ARM64.app`. The command above creates an ad-hoc local signature, **not Developer ID signing or Apple notarization**. Downloads may be blocked by Gatekeeper. See the installation guide before using a test build.

`pnpm electron:serve` uses the ignored local `dev-profile`. `pnpm test:sites` renders disposable fixtures for four bundled themes; set `GRIDEA_SITE_FIXTURES` to a directory of additional site folders if needed. The command never deploys.

## Data and limitations

Back up the complete source site and test a copy first. Do not edit the same site in upstream Gridea and this app simultaneously. The existing preview bundle identifier `dev.gridea.arm-preview` and data directory `~/Library/Application Support/Gridea ARM Preview` are deliberately retained for compatibility after renaming.

Use trusted themes only: Gridea themes retain Node/EJS capabilities. Full deployment-provider, upgrade/recovery, macOS-version and light/dark UI acceptance is incomplete.

Vue 2 is end-of-life. Two upstream version-based advisories remain; supported compiler paths have local mitigations, not a comprehensive upstream fix. See [patch scope](patches/README.md) and [security notes](SECURITY.md).

## License and provenance

MIT; original `Copyright (c) 2019 EryouHao` is retained in [LICENSE](LICENSE). Dependencies and assets retain their respective licenses. See [PROVENANCE.md](PROVENANCE.md) for the import baseline.

This repository excludes personal sites, deployment credentials, installed dependencies, build outputs and work logs. Remove secrets and personal content before reporting problems.
