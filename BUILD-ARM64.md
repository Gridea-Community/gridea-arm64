# Build notes

See README.md for current build commands. Packaging is explicit and does not publish. The default output is release/ inside this repository. `--output PATH` may select another destination.

The build runs mandatory Vue/TypeScript checks, webpack 5 renderer/main/preload/worker builds and runtime-only Vue module auditing. No Vue CLI or OpenSSL legacy-provider flag is used.

pnpm-lock.yaml and patchedDependencies are required. Use frozen-lockfile; postinstall applies the legacy Markdown compatibility patch. Only Electron dependency build scripts are enabled. Verify patches as part of pnpm test. Compiled legacy Tailwind CSS is retained with provenance and an MIT notice under docs/legacy and licenses.

`verify-arm64-package.py --app PATH` checks ARM64, display name, icon, expected resources, sample themes and signature integrity. It does not assert Developer ID identity, Hardened Runtime, notarization or complete runtime acceptance.
