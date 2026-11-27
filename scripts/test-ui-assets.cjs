const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict')
const root = path.resolve(__dirname, '..')
const classes = new Set()
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(file)
    else if (/\.(vue|ts|less|css)$/.test(file)) for (const match of fs.readFileSync(file, 'utf8').matchAll(/\bri-[a-z0-9-]+/g)) classes.add(match[0])
  }
}
walk(path.join(root, 'src'))
const css = fs.readFileSync(require.resolve('remixicon/fonts/remixicon.css'), 'utf8')
const glyphs = require('remixicon/fonts/remixicon.glyph.json')
for (const name of classes) {
  assert.ok(glyphs[name.slice(3)], 'Missing icon: ' + name)
  const rule = css.match(new RegExp('\\.' + name + ':(?::)?before\\s*\\{[^}]+\\}'))
  assert.ok(rule, 'Missing icon style: ' + name)
  const unicode = glyphs[name.slice(3)].unicode.match(/&#x([a-f0-9]+);/i)[1]
  assert.ok(rule[0].toLowerCase().includes('\\' + unicode.toLowerCase()), 'Glyph mapping: ' + name)
}
const fontCSS = fs.readFileSync(require.resolve('@fontsource/noto-serif/index.css'), 'utf8')
assert.match(fontCSS, /font-family:\s*'Noto Serif'/)
assert.match(fontCSS, /font-weight:\s*400/)
assert.match(fontCSS, /font-style:\s*normal/)
for (const match of fontCSS.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)) assert.ok(fs.existsSync(path.join(path.dirname(require.resolve('@fontsource/noto-serif/index.css')), match[1])), 'Missing font: ' + match[1])
console.log(`PASS UI resources: ${classes.size} icon names and glyph mappings, Noto Serif family/weight and all CSS font files`)
