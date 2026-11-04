# Source-release preparation

Prepared 2026-11-03 from local preview baseline 0.9.3.8.

## Verified locally

- Full Vue/TypeScript and webpack ARM64 build passed.
- Security, persistence, file-access, preview and five compiler-entry-point regression checks passed.
- Invalid Vue templates stop the build gate.
- Portable sample-site tests passed for fly, notes, paper and simple (one synthetic published article and five HTML pages each); invalid LESS rejected.
- Renamed package passed ARM64, display-name, icon, resource and ad-hoc signature checks.
- Original MIT LICENSE preserved byte-for-byte.
- Limited scan for local home paths, personal identifiers, common GitHub/AWS token formats and private-key headers found no matches in the imported source snapshot. This is not a guarantee that every possible secret format is detected.

Validation reused an existing pinned dependency installation via a temporary symlink. The symlink and generated build outputs were removed afterward. A fresh network installation in an unrelated checkout has not been repeated for this snapshot. Before public binary distribution, perform that check plus full application and downloaded-install acceptance.

## Before GitHub hosting

- Choose the owner/repository and add its URL to project metadata and documentation; keep upstream attribution.
- Configure private vulnerability reporting and a contact.
- Review the complete staged source and licensing notices. This fork preserves upstream history; private local development history is not imported.
- Do not upload personal fixture directories, credentials, logs or node_modules.

## Before a binary release

Use `X.Y.Z-arm64.N` in package.json and in the app. `X.Y.Z` is the upstream Gridea baseline. Start `N` at 1 for each baseline and increment it with each ARM64 release. Keep the macOS build number separately.

Use `vX.Y.Z-arm64.N` for both the Git tag and the GitHub Release title. Name the download `Gridea-for-ARM64-X.Y.Z-arm64.N.zip` and use that exact filename in `SHA256SUMS.txt`.

Write the Chinese and English notes in natural language. List the changes with Markdown `-` bullets in each language, then close with a short introduction to Gridea for ARM64 based on the previous release. Share both drafts with the maintainer for approval before publishing. Use GitHub’s pre-release setting to identify test builds.

- Record the version and dependency audit for the exact release build.
- Complete Developer ID/Hardened Runtime signing and notarization, or explicitly label the download as an unnotarized test build.
- Verify clean install, upgrade/recovery, appearance and deployment paths with disposable test destinations.
- Publish application archives, checksums and installation notes separately from the source.

The visible application name is Gridea for ARM64. The old preview data folder and bundle identifier remain deliberately compatible. The public repository is https://github.com/Gridea-Community/gridea-arm64. Binary releases are explicitly marked as pre-releases until broader acceptance is complete.
