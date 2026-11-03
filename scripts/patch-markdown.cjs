// Legacy TOC plugin used a private markdown-it path removed in modern releases.
// Obtain the same Token class through the supported parser API instead.
const fs = require('fs')
const file = require.resolve('markdown-it-toc-and-anchor/dist/index.js')
let code = fs.readFileSync(file, 'utf8')
code = code.replace('var _token = _interopRequireDefault(require("markdown-it/lib/token"));', 'var _token = { default: require("markdown-it")().parse("x", {})[0].constructor };')
fs.writeFileSync(file, code)
