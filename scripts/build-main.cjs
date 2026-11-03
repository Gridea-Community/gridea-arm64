require('./check-build.cjs')
const webpack = require('webpack')
const path = require('path')
webpack([{
  mode: 'production', target: 'electron-main', entry: { background: './src/background.ts', preload: './src/preload.ts' },
  output: { path: path.resolve('dist_electron/bundled'), filename: '[name].js' },
  node: { __dirname: false, __filename: false },
  resolve: { extensions: ['.ts', '.js'], alias: { '@': path.resolve('src') } },
  externals: ({ request }, cb) => !request.startsWith('.') && !request.startsWith('@/') && !path.isAbsolute(request) ? cb(null, 'commonjs ' + request) : cb(),
  module: { rules: [{ test: /\.ts$/, loader: 'ts-loader', options: { transpileOnly: true } }] },
  plugins: [new webpack.DefinePlugin({ __static: '__dirname', 'process.env.NODE_ENV': JSON.stringify('production') })],
}, {
  mode: 'production', target: 'webworker',
  entry: './node_modules/monaco-editor/esm/vs/editor/editor.worker.js',
  output: { path: path.resolve('dist_electron/bundled'), filename: 'editor.worker.js' },
}], (err, stats) => { if(err) throw err; console.log(stats.toString({ colors: false, modules: false })); if(stats.hasErrors()) process.exitCode=1 })
