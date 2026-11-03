# Security and preview status

This is an unofficial test candidate, not a security-audited stable release.

Vue 2 is end-of-life. Local pnpm patches protect the supported compiler entry points; upstream version-based warnings remain. Do not remove the patches or bypass mandatory type/template checks. See patches/README.md.

The renderer uses context isolation and no Node integration. The preload still requires sandbox:false for the legacy Markdown integration. Local trusted themes retain Node/EJS capabilities; do not install untrusted themes.

Back up full source sites before testing. All deployment providers, upgrade/recovery paths, macOS versions and appearance states have not been fully accepted. Ad-hoc signing is for local testing and is not Apple notarization.

No project security contact has been configured yet. Before public hosting, configure a private vulnerability-reporting channel. Do not post exploitable details or credentials to a public issue. Never include tokens, passwords, private keys or personal site contents in reports.
