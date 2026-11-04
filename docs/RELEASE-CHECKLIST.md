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

Use `X.Y.Z-arm64.N.alpha` for local test builds, `X.Y.Z-arm64.N.beta` for GitHub previews, and `X.Y.Z-arm64.N` for stable releases. `X.Y.Z` is the upstream Gridea baseline and `N` is the ARM64 release sequence. If a channel needs multiple revisions, append two numeric identifiers, as in `X.Y.Z-arm64.N.alpha.Y.Z` or `X.Y.Z-arm64.N.beta.Y.Z`.

Keep the full version in package.json. Prefix it with `v` in the app, Git tag and GitHub Release title. Name the ZIP `Gridea-for-ARM64-<version>.zip` using the package.json version and record the exact filename in `SHA256SUMS.txt`. Keep the macOS numeric build number separately.

Write the Chinese and English notes in natural language. List the changes with Markdown `-` bullets in each language, then close with a short introduction to Gridea for ARM64 based on the previous release. Share both drafts with the maintainer for approval before publishing. Use GitHub’s pre-release setting to identify test builds.

- Record the version and dependency audit for the exact release build.
- Complete Developer ID/Hardened Runtime signing and notarization, or explicitly label the download as an unnotarized test build.
- Verify clean install, upgrade/recovery, appearance and deployment paths with disposable test destinations.
- Publish application archives, checksums and installation notes separately from the source.

The visible application name is Gridea for ARM64. The old preview data folder and bundle identifier remain deliberately compatible. The public repository is https://github.com/Gridea-Community/gridea-arm64. Binary releases are explicitly marked as pre-releases until broader acceptance is complete.
