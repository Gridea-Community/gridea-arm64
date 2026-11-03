// Build every process after mandatory full Vue/TypeScript validation.
const { spawnSync } = require('node:child_process')
const path = require('node:path'), fs = require('node:fs')
const root = path.resolve(__dirname, '..')
require('./check-build.cjs')
const output = path.join(root, 'dist_electron/bundled')
fs.rmSync(output, { recursive: true, force: true })
for (const script of ['patch-markdown.cjs', 'build-renderer.cjs', 'build-main.cjs']) {
  const result = spawnSync(process.execPath, [path.join(__dirname, script)], { cwd: root, env: { ...process.env, NODE_ENV: 'production' }, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status || 1)
}
for (const file of ['index.html', 'background.js', 'preload.js', 'editor.worker.js']) {
  if (!fs.existsSync(path.join(output, file))) throw new Error(`Build output missing: ${file}`)
}
