// Compile with the same checked pipeline, then run against disposable development data.
const { spawnSync } = require('node:child_process')
const fs = require('node:fs'), path = require('node:path')
const root = path.resolve(__dirname, '..')
const build = spawnSync(process.execPath, [path.join(__dirname, 'build-arm64.cjs')], { cwd: root, stdio: 'inherit' })
if (build.error) throw build.error
if (build.status !== 0) process.exit(build.status || 1)
const profile = path.join(root, 'dev-profile')
fs.mkdirSync(profile, { recursive: true })
const run = spawnSync(require('electron'), [path.join(root, 'dist_electron/bundled/background.js')], { cwd: root, env: { ...process.env, GRIDEA_TEST_HOME: profile }, stdio: 'inherit' })
if (run.error) throw run.error
process.exitCode = run.status || 0
