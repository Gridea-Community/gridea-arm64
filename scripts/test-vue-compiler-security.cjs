const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), { spawnSync } = require('node:child_process')
const root = path.resolve(__dirname, '..')
const entries = ['@vue/compiler-sfc', '@vue/compiler-vue2', '@vue/compiler-vue2/browser.js', 'vue-template-compiler', 'vue-template-compiler/browser.js']
const templates = [
  '<div>中文 😀</div>', '<div id="safe">{{value}}</div>',
  '<div class="one two" :class="active" style="color:red" :style="style">{{value}}</div>',
  '<ul><li v-for="(item, index) in items" :key="item.id">{{index}} {{item.name}}</li></ul>',
  '<input v-model="value" :disabled="disabled" @input="onInput">',
  '<div><span v-if="ok">Yes</span><span v-else>No</span></div>',
  '<component :is="view"><template #default="slot">{{slot.value}}</template></component>',
  '<textarea>line one\n&lt;tag&gt;</textarea>', '<textarea>UPPER</TEXTAREA>',
  '<div><textarea>missing</script></div>', '<div><textarea>a</textarea data-extra><b>after</b></div>',
  '<div v-html="html" data-name="中文"></div>',
]
const fixture = path.join(root, 'tests/fixtures/vue-compiler-baseline.json')
function compile(entry, source) {
  const compiler = require(entry)
  if (entry === '@vue/compiler-sfc') {
    const value = compiler.compileTemplate({ source, filename: 'Probe.vue', id: 'probe' })
    return JSON.stringify({ code: value.code, errors: value.errors })
  }
  const value = compiler.compile(source)
  return JSON.stringify({ render: value.render, staticRenderFns: value.staticRenderFns, errors: value.errors })
}
const digest = value => crypto.createHash('sha256').update(value).digest('hex')
if (process.argv.includes('--capture-baseline')) {
  fs.writeFileSync(fixture, JSON.stringify(Object.fromEntries(entries.map(entry => [entry, templates.map(source => ({ source, sha256: digest(compile(entry, source)) }))])), null, 2) + '\n')
  console.log('Captured clean compiler output baseline')
  process.exit(0)
}
const baseline = JSON.parse(fs.readFileSync(fixture))
for (const entry of entries) {
  for (const item of baseline[entry]) assert.equal(digest(compile(entry, item.source)), item.sha256, `${entry}: existing template behavior changed`)
  for (const field of ['staticClass', 'staticStyle', 'classBinding', 'styleBinding']) {
    Object.prototype[field] = '(globalThis.__grideaCompilerProbe = true, "injected")'
    try { assert.equal(compile(entry, '<div id="safe">{{value}}</div>').includes('__grideaCompilerProbe'), false, `${entry}: inherited ${field} reached generated code`) }
    finally { delete Object.prototype[field] }
  }
  const child = spawnSync(process.execPath, ['-e', `const c=require(${JSON.stringify(entry)});const source='<div><textarea>'+'<'.repeat(1000000)+'</script></div>';const started=Date.now();${entry === '@vue/compiler-sfc' ? "c.compileTemplate({source,filename:'Probe.vue',id:'probe'})" : 'c.compile(source)'};console.log(Date.now()-started)`], { cwd: root, encoding: 'utf8', timeout: 5000, maxBuffer: 4096 })
  assert.equal(child.error, undefined, `${entry}: malformed raw text timed out`)
  assert.equal(child.status, 0, child.stderr)
  console.log(`PASS: ${entry} baseline, prototype pollution and 1MB malformed input (${child.stdout.trim()} ms)`)
}
