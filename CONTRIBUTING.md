# Contributing

Use Node.js 22.12+ and the pinned pnpm version. Install with frozen-lockfile and keep local dependency patches. Run pnpm test, pnpm test:sftp, pnpm test:build, pnpm test:sites and pnpm build:arm64 before submitting changes. A macOS ARM64 machine is required for package checks.

Keep generated output, local profiles, third-party site backups and credentials out of Git. Use the public sample themes for tests. Report appearance changes with light/dark screenshots, and distinguish automated checks from actual application testing.

This repository does not automatically publish or deploy. Developer identity, repository URL and private security reporting must be configured by the owner before public hosting. Contributions remain under the repository MIT license; preserve third-party license notices.

For Markdown or editor changes, run pnpm test:markdown and the packaged runtime checks with GRIDEA_TEST_MONACO=1. Keep the editor and Markdown extension on the shared ESM entry, and verify matching KaTeX styles and fonts in generated pages.

For interface resource changes, run pnpm test:ui-assets and the packaged runtime checks with GRIDEA_TEST_UI_RESOURCES=1. Verify font loading, icon mappings, emoji selection and light/dark styling, plus the existing transition timing.

For Vue 2 component/decorator upgrades, run packaged runtime checks with GRIDEA_TEST_VUE2_BINDINGS=1 and GRIDEA_TEST_DRAFT_RECOVERY=1 separately to verify actual props, model events, watchers, settings persistence and recovery.

For preview/feed/URL dependency changes, run pnpm test:preview:http and pnpm test:publishing-deps. Preserve existing URL shapes and verify localhost, port retry, static-directory switching, Atom full text/excerpts, and ESM dependency loading in the packaged runtime.
