# Local Vue 2 compiler hardening

The Vue 2.7.16 compiler patches are project-local mitigations, not official Vue releases or extended support. Upstream advisory version metadata is unchanged.

- Compiler AST elements use a null prototype, preventing inherited `staticClass`, `staticStyle`, `classBinding` and `styleBinding` strings from entering code generation.
- Raw-text closing tags use a fixed-prefix search followed by one `>` scan, avoiding the unanchored wildcard expression's repeated backtracking. Existing valid and small malformed-template behavior is checked against pre-patch generated-output hashes.
- Apply to `@vue/compiler-sfc` (the Vue loader's actual compiler), `@vue/compiler-vue2` (the template type checker), and `vue-template-compiler` (existing component peer dependency), including both distributed build/browser entries where present.
- `scripts/test-vue-compiler-security.cjs` checks 60 baseline template cases, four prototype pollution properties and 1MB malformed input in isolated child processes. Do not regenerate the baseline without reviewing the compiler behavior changes.
- `scripts/build-renderer.cjs` rejects full Vue or template compiler modules in the browser bundle. The Vue runtime distribution's unused full-compiler files are not rewritten by these patches; they are outside this application's supported browser build path.

The earlier vue-loader patch only corrects CSS import code generation. All patches are pinned in package.json and pnpm-lock.yaml and included with their SHA-256 hashes in packaged BUILD-PATCHES.json.
