const path = require('node:path')
const webpack = require('webpack')
const VueLoaderPlugin = require('vue-loader/lib/plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const root = path.resolve(__dirname, '..')
const styles = [
  'style-loader',
  { loader: 'css-loader', options: { esModule: true, importLoaders: 1 } },
]
module.exports = {
  mode: 'production', target: ['web', 'es2020'],
  entry: path.join(root, 'src/main.ts'),
  output: { path: path.join(root, 'dist_electron/bundled'), filename: 'js/[name].[contenthash:8].js', chunkFilename: 'js/[name].[contenthash:8].js', publicPath: './', assetModuleFilename: 'assets/[name].[contenthash:8][ext]' },
  resolve: { extensions: ['.ts', '.js', '.vue', '.json'], alias: { '@': path.join(root, 'src'), vue$: 'vue/dist/vue.runtime.esm.js' } },
  module: { rules: [
    { test: /\.vue$/, loader: 'vue-loader' },
    { test: /\.ts$/, exclude: /node_modules/, loader: 'ts-loader', options: { transpileOnly: true, appendTsSuffixTo: [/\.vue$/] } },
    { test: /\.css$/, use: styles },
    { test: /\.less$/, use: [...styles, { loader: 'less-loader', options: { additionalData: `@import "${path.join(root, 'src/assets/styles/var.less').replace(/\\/g, '/')}";\n`, lessOptions: { javascriptEnabled: true, modifyVars: { 'primary-color': '@gridea-primary-color', 'btn-height-base': '30px', 'input-height-base': '30px' } } } }] },
    { test: /\.(png|jpe?g|gif|svg|ico|woff2?|eot|ttf|otf)$/i, type: 'asset/resource' },
  ] },
  plugins: [
    // Gridea accepts explicit image dimensions; imsize's optional disk autofill is unused.
    new webpack.NormalModuleReplacementPlugin(/^\.\/imsize$/, resource => {
      if (resource.context.endsWith(path.join('markdown-it-imsize', 'lib'))) {
        resource.request = path.join(root, 'scripts/no-image-autofill.cjs')
      }
    }),
    new VueLoaderPlugin(),
    new HtmlWebpackPlugin({ template: path.join(root, 'public/index.html'), templateParameters: { BASE_URL: './' }, scriptLoading: 'defer', minify: false }),
    new webpack.DefinePlugin({ 'process.env.NODE_ENV': JSON.stringify('production'), 'process.env.BASE_URL': JSON.stringify('./') }),
  ],
  optimization: { splitChunks: { chunks: 'all' } },
  performance: false,
  stats: { preset: 'errors-warnings' },
}
