# Gridea for ARM64

[简体中文](README.md) | English

Gridea for ARM64 is a community-maintained fork of Gridea for Apple Silicon Macs. It uses Electron, runs without Rosetta, keeps the familiar writing and publishing workflow, and lets you choose light mode, dark mode, or follow your Mac’s appearance.

This preview is based on Gridea 0.9.3 and has an internal build number of 0.9.3.9.

[Download test builds](https://github.com/Gridea-Community/gridea-arm64/releases) · [Installation and backups](docs/INSTALL.md)

## Build from source

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

You’ll find the app at `release/Gridea for ARM64.app`. The command above uses ad-hoc signing. Our preview downloads are signed the same way and have yet to be notarized by Apple.

`pnpm electron:serve` uses the ignored local `dev-profile`. `pnpm test:sites` renders disposable fixtures for four bundled themes; set `GRIDEA_SITE_FIXTURES` to a directory of additional site folders if needed. The command never deploys.

## Using an existing site

Back up the complete source site and test a copy first. Do not edit the same site in upstream Gridea and this app simultaneously. The existing preview bundle identifier `dev.gridea.arm-preview` and data directory `~/Library/Application Support/Gridea ARM Preview` are deliberately retained for compatibility after renaming.

Use trusted themes only: Gridea themes retain Node/EJS capabilities. Full deployment-provider, upgrade/recovery, macOS-version and light/dark UI acceptance is incomplete.

Vue 2 is end-of-life. Two upstream version-based advisories remain; supported compiler paths have local mitigations, not a comprehensive upstream fix. See [patch scope](patches/README.md) and [security notes](SECURITY.md).

## License and provenance

MIT; original `Copyright (c) 2019 EryouHao` is retained in [LICENSE](LICENSE). Dependencies and assets retain their respective licenses. See [PROVENANCE.md](PROVENANCE.md) for the import baseline.

This repository excludes personal sites, deployment credentials, installed dependencies, build outputs and work logs. Remove secrets and personal content before reporting problems.
