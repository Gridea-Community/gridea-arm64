const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript'), Module = require('node:module')
const filename = path.resolve('src/server/plugins/markdown.ts')
const mod = new Module(filename, module); mod.filename = filename; mod.paths = module.paths
mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, filename)
const cases = {
  headings: '# 中文标题\n\n[[toc]]\n\n## Second\n\n## Second',
  inline: '**bold** *italic* ~~strike~~ ==mark== H~2~O x^2^\nline\n\n[link](https://example.com)',
  extensions: '*[HTML]: Hyper Text Markup Language\n\nHTML test[^1]\n\n[^1]: footnote\n\n- [x] done\n- [ ] todo\n\n| A | B |\n|---|---|\n| 1 | 2 |',
  images: '![alt](test.png =100x200)\n\n[![linked](other.png)](https://example.com)\n\ninline ![icon](icon.png) text',
  math: 'Inline $x^2$\n\n$$\n\\frac{a}{b}\n$$',
  emoji: ':smile: :heart: :+1: :) :unknown:',
  unsafe: '[bad](javascript:alert(1))\n\n![bad](data:text/html;base64,WA==)\n\n![ok](data:image/png;base64,WA==)',
  code: '```js\nconst x = 1\n```\n\n<div>HTML</div>',
}
const actual = Object.fromEntries(Object.entries(cases).map(([k,v]) => [k, mod.exports.default.render(v)]))
const snapshot = path.join(__dirname, 'fixtures/markdown-compat.json')
if (process.env.GRIDEA_CAPTURE_MARKDOWN === '1') { fs.mkdirSync(path.dirname(snapshot), {recursive:true}); fs.writeFileSync(snapshot, JSON.stringify(actual,null,2)+'\n') }
else for (const key of Object.keys(cases).filter(key => key !== 'math')) assert.equal(actual[key].replace(/task-item-\d+/g, 'task-item-ID'), JSON.parse(fs.readFileSync(snapshot))[key].replace(/task-item-\d+/g, 'task-item-ID'), key)

// KaTeX HTML internals change across versions; preserve the formula semantics and wrappers.
const { JSDOM } = require('jsdom')
const math = new JSDOM(actual.math).window.document
assert.deepEqual([...math.querySelectorAll('annotation')].map(el => el.textContent.trim()), ['x^2', '\\frac{a}{b}'])
assert.equal(math.querySelectorAll('.katex').length, 2)
assert.equal(math.querySelectorAll('.katex-block .katex-display').length, 1)
assert.equal(math.querySelectorAll('.katex-error').length, 0)

const toc = new JSDOM(mod.exports.default.render('# 标题\n\n@[toc]\n\n## Child')).window.document
assert.ok([...toc.querySelectorAll('a')].some(link => decodeURIComponent(link.getAttribute('href')) === '#标题'))
assert.ok(toc.querySelector('a[href="#child"]'))
const tasks = new JSDOM(actual.extensions).window.document
for (const checkbox of tasks.querySelectorAll('input[type=checkbox]')) assert.ok(tasks.querySelector('label[for="' + checkbox.id + '"]'))
console.log('PASS: Markdown compatibility fixtures, formula semantics, generated TOC and task labels')
