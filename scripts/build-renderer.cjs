const fs = require('node:fs'), path = require('node:path'), webpack = require('webpack')
const config = require('./webpack-renderer.cjs')
const root = path.resolve(__dirname, '..')
fs.mkdirSync(config.output.path, { recursive: true })
fs.cpSync(path.join(root, 'public'), config.output.path, { recursive: true })
const compiler = webpack(config)
compiler.run((error, stats) => {
  compiler.close(closeError => {
    if (error || closeError) { console.error(error || closeError); process.exitCode = 1; return }
    const resources = new Set()
    const seen = new Set()
    function collect(module) {
      if (seen.has(module)) return
      seen.add(module)
      if (module.resource) resources.add(module.resource.replace(/\\/g, '/'))
      if (module.modules) for (const child of module.modules) collect(child)
    }
    for (const module of stats.compilation.modules) collect(module)
    const forbidden = [...resources].filter(file => /node_modules\/(?:@vue\/compiler-[^/]+|vue-template-compiler)\//.test(file) || /node_modules\/vue\/dist\/vue\.(?!runtime\.)/.test(file))
    const runtimeOnly = [...resources].filter(file => file.endsWith('/vue/dist/vue.runtime.esm.js'))
    fs.writeFileSync(path.join(root, 'dist_electron/renderer-module-audit.json'), JSON.stringify({ runtimeOnly, forbidden }, null, 2))
    if (forbidden.length || !runtimeOnly.length) {
      console.error('Renderer must contain the runtime-only Vue build and no template compiler', forbidden)
      process.exitCode = 1
      return
    }
    console.log(stats.toString(config.stats))
    if (stats.hasErrors()) process.exitCode = 1
  })
})
