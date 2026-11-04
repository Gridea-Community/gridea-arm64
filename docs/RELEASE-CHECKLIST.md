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

Use `vX.Y.Z-arm64.N.alpha.Y` for numbered local test builds, `vX.Y.Z-arm64.N.beta.Y` for numbered GitHub previews, and `vX.Y.Z-arm64.N` for stable releases. `X.Y.Z` identifies the upstream Gridea version and `N` identifies the ARM64 release sequence. Increment `Y` for a new round in the same channel. For a small follow-up on the same round, append or increment `.Z`, for example `v0.9.3-arm64.1.alpha.2.1` after `v0.9.3-arm64.1.alpha.2`.

Use package.json as the source for the full version without the leading `v`. Prefix it with `v` in the app, current-build references in both READMEs, Git tags, and GitHub Release titles. Name the ZIP `Gridea-for-ARM64-<version>.zip` using the package.json version and record the exact filename in `SHA256SUMS.txt`. Verify these names against the built app and archive before delivery. Keep the numeric macOS bundle version fields separate, and preserve historical version references and upstream dependency versions.

Write the Chinese and English notes in natural language. List the changes with Markdown `-` bullets in each language, then close with a short introduction to Gridea for ARM64 based on the previous release. Share both drafts with the maintainer for approval before publishing. Use GitHub’s pre-release setting to identify test builds.

- Record the version and dependency audit for the exact release build.
- Complete Developer ID/Hardened Runtime signing and notarization, or explicitly label the download as an unnotarized test build.
- Verify clean install, upgrade/recovery, appearance and deployment paths with disposable test destinations.
- Compare the bundled sample site with the upstream default files. The only bundled themes must be fly, notes, paper and simple. Inspect the finished archive for local site data, custom themes, local paths and credential files before uploading.
- Publish application archives, checksums and installation notes separately from the source.

The visible application name is Gridea for ARM64. The old preview data folder and bundle identifier remain deliberately compatible. The public repository is https://github.com/Gridea-Community/gridea-arm64. Binary releases are explicitly marked as pre-releases until broader acceptance is complete.
