// Mandatory validation for every supported build entry point.
const { spawnSync } = require('child_process')
const path = require('path')
const result = spawnSync(process.execPath, [require.resolve('vue-tsc/bin/vue-tsc.js'), '--noEmit', '--pretty', 'false'], { cwd: path.resolve(__dirname, '..'), stdio: 'inherit' })
if (result.error) throw result.error
if (result.status !== 0) throw new Error('Vue/TypeScript validation failed; build stopped')

// This project uses Vue 2.7's bundled SFC compiler, never the older loader fallback.
const compiler = require('vue-loader/lib/compiler').resolveCompiler(path.resolve(__dirname, '..'))
if (!compiler.is27 || !require('vue/package.json').version.startsWith('2.7.')) throw new Error('This build requires Vue 2.7 and its bundled SFC compiler')
