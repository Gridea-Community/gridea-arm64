const assert = require('node:assert/strict')
const fs = require('fs'), path = require('path'), ts = require('typescript'), vm = require('vm')
// A separate test-only DOM can be supplied without shipping it in the application.
const { JSDOM } = require(process.env.GRIDEA_JSDOM || 'jsdom')
const window = new JSDOM('').window
const purify = require('dompurify')(window)
const exportsObject = {}
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/helpers/preview-html.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText
vm.runInNewContext(code, { exports: exportsObject, require: name => { if (name === 'dompurify') return purify; throw new Error(name) } })
const clean = exportsObject.default('<h2 id="heading">Title</h2><img src="file:///tmp/test.png" onerror="require(\'fs\')"><a href="javascript:alert(1)">bad</a><script>alert(1)</script><iframe src="https://example.com"></iframe><svg onload="alert(1)"></svg><p>正文😀</p>')
const doc = new JSDOM(clean).window.document
assert.equal(doc.querySelector('h2').textContent, 'Title')
assert.equal(doc.querySelector('img').getAttribute('src'), 'file:///tmp/test.png')
assert.equal(doc.querySelector('a').hasAttribute('href'), false)
assert.equal(doc.querySelectorAll('script,iframe,[onerror],[onload]').length, 0)
assert.match(doc.body.textContent, /正文😀/)
window.close()
console.log('PASS: preview scripts/events/unsafe URLs removed; headings, text, Emoji and local images retained')
