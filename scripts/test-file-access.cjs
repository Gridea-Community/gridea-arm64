const assert = require('node:assert/strict')
const fs = require('fs'), os = require('os'), path = require('path'), ts = require('typescript')
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2019 } }).outputText, file)
const policy = require('../src/helpers/file-access.ts')
const { atomicWrite } = require('../src/helpers/atomic-file.ts')
const Store = require('../src/helpers/atomic-json-store.ts').default
async function main() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gridea-file-policy-'))
  try {
    const site = path.join(root, 'site'), other = path.join(root, 'other')
    fs.mkdirSync(site); fs.mkdirSync(other)
    const picture = path.join(other, 'chosen.png'), privateFile = path.join(other, 'secret.json')
    fs.writeFileSync(picture, 'image'); fs.writeFileSync(privateFile, '{}')
    assert.throws(() => policy.assertImageAccess(picture, [site]))
    assert.equal(policy.grantImage(privateFile), false)
    assert.equal(policy.grantImage(picture), true)
    assert.equal(policy.assertImageAccess(picture, [site]), fs.realpathSync(picture))
    fs.symlinkSync(other, path.join(site, 'escape'))
    assert.throws(() => policy.assertDestination(site, path.join(site, 'escape/overwrite.json')))
    assert.throws(() => policy.assertDestination(site, path.join(other, 'overwrite.json')))
    assert.equal(policy.assertDestination(site, path.join(site, 'new/image.png')), path.join(site, 'new/image.png'))
    assert.throws(() => policy.assertSelectedFolder(other, site))
    policy.grantFolder(other)
    assert.equal(policy.assertSelectedFolder(other, site), fs.realpathSync(other))
    const config = path.join(site, 'config.json'), store = new Store(config)
    assert.deepEqual(store.read(), {})
    store.write({ title: '中文 😀', folder: 'a"b' })
    assert.deepEqual(store.read(), { title: '中文 😀', folder: 'a"b' })
    const before = fs.readFileSync(config, 'utf8')
    const rename = fs.renameSync
    try {
      fs.renameSync = () => { throw new Error('simulated disk failure') }
      assert.throws(() => store.write({ title: 'lost' }), /simulated disk failure/)
    } finally { fs.renameSync = rename }
    assert.equal(fs.readFileSync(config, 'utf8'), before)
    assert.equal(fs.readdirSync(site).some(name => name.endsWith('.tmp')), false)
    fs.writeFileSync(config, '{broken')
    assert.throws(() => store.read())
    assert.equal(fs.readFileSync(config, 'utf8'), '{broken')
    fs.writeFileSync(config, '')
    assert.throws(() => store.read(), /Empty JSON/)
    atomicWrite(config, JSON.stringify({ restored: true }))
    assert.deepEqual(store.read(), { restored: true })
    const fse = require('fs-extra')
    const fixture = path.join(root, 'fixture')
    fse.copySync(path.resolve(__dirname, '../public/default-files'), fixture)
    const Theme = require('../src/server/theme.ts').default
    const instanceTheme = new Theme({ appDir: fixture, db: { themeConfig: { themeName: 'notes' } } })
    instanceTheme.$theme.set('customConfig', { keep: '中文 😀' }).write()
    const configBefore = instanceTheme.$theme.get('config').value()
    await instanceTheme.saveThemeConfig({ ...configBefore, themeName: 'notes', siteName: 'Changed' })
    assert.deepEqual(instanceTheme.$theme.get('customConfig').value(), { keep: '中文 😀' })
    await instanceTheme.saveThemeConfig({ ...configBefore, themeName: 'paper' })
    assert.deepEqual(instanceTheme.$theme.get('customConfig').value(), {})
    await assert.rejects(instanceTheme.saveThemeConfig({ ...configBefore, themeName: '../escape' }))
    global.__non_webpack_require__ = require
    const App = require('../src/server/app.ts').default
    const home = path.join(root, 'home'); fs.mkdirSync(home); fs.mkdirSync(path.join(home, '.gridea'))
    const appConfig = path.join(home, '.gridea/config.json')
    const previous = fs.realpathSync(site)
    atomicWrite(appConfig, JSON.stringify({ sourceFolder: previous }))
    const instance = { appDir: previous, app: { getPath: () => home }, initEvents() {}, updateStaticServer() {}, checkDir() { this.appDir = JSON.parse(fs.readFileSync(appConfig)).sourceFolder } }
    const changeFolder = folder => App.prototype.saveSourceFolderSetting.call(instance, folder)
    // A granted non-site folder containing unrelated files is not initialized.
    assert.equal(await changeFolder(other), false)
    assert.equal(instance.appDir, previous)
    const broken = path.join(root, 'broken'); fs.mkdirSync(broken); fs.mkdirSync(path.join(broken, 'config'))
    fs.writeFileSync(path.join(broken, 'config/theme.json'), '{broken')
    policy.grantFolder(broken)
    assert.equal(await changeFolder(broken), false)
    assert.equal(JSON.parse(fs.readFileSync(appConfig)).sourceFolder, previous)
    const empty = path.join(root, '中文 "site"'); fs.mkdirSync(empty); policy.grantFolder(empty)
    assert.equal(await changeFolder(empty), true)
    assert.equal(JSON.parse(fs.readFileSync(appConfig)).sourceFolder, fs.realpathSync(empty))
    const beforeFailure = instance.appDir
    instance.checkDir = () => false
    const next = path.join(root, 'next'); fs.mkdirSync(next); policy.grantFolder(next)
    assert.equal(await changeFolder(next), false)
    assert.equal(instance.appDir, beforeFailure)
    assert.equal(JSON.parse(fs.readFileSync(appConfig)).sourceFolder, beforeFailure)
    console.log('PASS: selected-image/folder permissions, symlink writes, atomic failure retention, corrupt config preservation')
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
