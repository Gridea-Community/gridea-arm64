const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), { spawnSync } = require('node:child_process')
const root = path.resolve(__dirname, '..'), file = path.join(root, 'src/BuildGateProbe.vue')
assert.equal(fs.existsSync(file), false, 'Refuse to overwrite an existing source file')
try {
  fs.writeFileSync(file, '<template><div>{{ deliberatelyMissingProperty }}</div></template>\n<script lang="ts">import Vue from "vue"; export default Vue.extend({})\n</script>\n', { flag: 'wx' })
  const result = spawnSync(process.execPath, [path.join(__dirname, 'check-build.cjs')], { cwd: root, encoding: 'utf8' })
  assert.notEqual(result.status, 0, 'Invalid Vue template must fail the build gate')
  assert.match(result.stdout + result.stderr, /deliberatelyMissingProperty/)
  console.log('PASS: invalid Vue template stops the real build gate')
} finally { fs.rmSync(file, { force: true }) }
