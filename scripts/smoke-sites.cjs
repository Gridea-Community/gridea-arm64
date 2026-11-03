// Render only disposable copies. Never deploy or instantiate the deployment client.
const fs = require('fs'), path = require('path'), os = require('os'), ts = require('typescript')
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2019 } }).outputText, file)
global.__non_webpack_require__ = require
const Renderer = require('../src/server/renderer.ts').default
const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gridea-arm64-sites-'))
const externalRoot = process.env.GRIDEA_SITE_FIXTURES && path.resolve(process.env.GRIDEA_SITE_FIXTURES)
const siteNames = externalRoot
  ? fs.readdirSync(externalRoot, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name)
  : ['fly', 'notes', 'paper', 'simple']
if (!siteNames.length) throw new Error('No site fixtures found')
async function main() {
  const results = []
  for (const name of siteNames) {
    const source = externalRoot ? path.join(externalRoot, name) : path.resolve(__dirname, '../public/default-files')
    const blog = path.join(fixtureRoot, name)
    if (!fs.existsSync(source)) throw new Error(`Missing fixture: ${name}`)
    fs.mkdirSync(blog, { recursive: true })
    fs.cpSync(source, blog, { recursive: true, filter: file => !['.git', 'output', 'node_modules'].includes(path.basename(file)) })
    const read = file => JSON.parse(fs.readFileSync(path.join(blog, 'config', file)))
    const theme = read('theme.json'), posts = read('posts.json'), setting = read('setting.json')
    if (!externalRoot) {
      theme.config.themeName = name
      setting.config.domain = 'https://example.invalid'
      posts.posts = [{ fileName: 'release-smoke', content: '# Heading\n\nHello **Gridea** 😀', abstract: 'Hello Gridea', data: { title: 'Smoke test 中文 😀', date: '2026-01-01 12:00:00', tags: [], published: true, hideInList: false, isTop: false, feature: '' } }]
    }
    // Test copies do not retain deployment secrets.
    for (const key of ['token', 'password', 'privateKey', 'netlifyAccessToken']) setting.config[key] = ''
    fs.writeFileSync(path.join(blog, 'config/setting.json'), JSON.stringify(setting))
    const definition = JSON.parse(fs.readFileSync(path.join(blog, 'themes', theme.config.themeName, 'config.json')))
    const errors = []
    const instance = { appDir: blog, buildDir: path.join(blog, 'output'), db: { ...posts, themeConfig: { archivesPath: 'archives', postPath: 'post', tagPath: 'tag', ...theme.config }, themeCustomConfig: theme.customConfig, currentThemeConfig: definition.customConfig, setting: setting.config, commentSetting: setting.comment }, mainWindow: { webContents: { send: channel => errors.push(channel) } }, previewServer: { get: () => 4000 } }
    const renderer = new Renderer(instance)
    await renderer.preview()
    if (errors.length) throw new Error(`${name} render errors: ${errors.join(',')}`)
    const html = []
    function walk(dir) { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const file = path.join(dir, entry.name); if (entry.isDirectory()) walk(file); else if (file.endsWith('.html')) html.push(file) } }
    walk(instance.buildDir)
    if (!fs.existsSync(path.join(instance.buildDir, 'index.html')) || !html.length) throw new Error(`${name}: missing generated homepage`)
    results.push({ site: name, theme: theme.config.themeName, posts: posts.posts.length, html: html.length, status: 'passed' })
    // Invalid LESS must reject instead of leaving the render pending or throwing later.
    if (name === siteNames[siteNames.length - 1]) {
      const lessFile = path.join(blog, 'themes', theme.config.themeName, 'assets/styles/main.less')
      const original = fs.readFileSync(lessFile)
      try {
        fs.writeFileSync(lessFile, '.broken { color: @undefined-stability-test; }')
        let rejected = false
        try { await renderer.buildCss() } catch (_) { rejected = true }
        if (!rejected) throw new Error('Invalid LESS did not reject')
        results.push({ test: 'invalid-less-rejection', status: 'passed' })
      } finally { fs.writeFileSync(lessFile, original) }
    }
  }
  fs.writeFileSync(path.join(fixtureRoot, 'results.json'), JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
}
main().catch(error => { console.error(error.message); process.exitCode = 1 }).finally(() => fs.rmSync(fixtureRoot, { recursive: true, force: true }))
