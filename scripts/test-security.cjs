const assert = require('node:assert/strict')
const fs = require('fs'), os = require('os'), path = require('path'), ts = require('typescript')
const vm = require('vm')
function load(file, electron, cache = new Map()) {
  if (cache.has(file)) return cache.get(file)
  const exports = {}
  cache.set(file, exports)
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/helpers', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2020 } }).outputText
  vm.runInNewContext(code, { exports, require: name => name === 'electron' ? electron : name.startsWith('./') ? load(name.slice(2) + (name.endsWith('.ts') ? '' : '.ts'), electron, cache) : require(name), URL, Response, Headers, Promise })
  return exports
}
async function main() {
  const permission = load('editor-permissions.ts', {}).default
  assert.equal(permission('clipboard-read', 'app://./index.html#/articles', true), true)
  assert.equal(permission('clipboard-read', 'https://example.com/', true), false)
  assert.equal(permission('clipboard-read', 'app://./index.html', false), false)
  assert.equal(permission('media', 'app://./index.html', true), false)
  const opened = []
  const link = load('external-link.ts', { shell: { openExternal: url => { opened.push(url); return Promise.resolve() } } })
  for (const url of ['javascript:alert(1)', 'file:///etc/passwd', 'data:text/html,test', 'https://user:secret@example.com', 'smb://host/share', 'not-a-url']) await link.default.openExternal(url)
  assert.equal(opened.length, 0)
  await link.default.openExternal('https://example.com/')
  assert.deepEqual(opened, ['https://example.com/'])
  const handlers = {}
  const ipc = load('trusted-ipc.ts', { ipcMain: { on: (channel, handler) => { handlers[channel] = handler } } })
  const contents = { mainFrame: {} }
  ipc.setTrustedWindow({ isDestroyed: () => false, webContents: contents })
  let calls = 0
  ipc.default.on('save', () => calls++)
  handlers.save({ sender: contents, senderFrame: contents.mainFrame })
  handlers.save({ sender: contents, senderFrame: {} })
  handlers.save({ sender: {}, senderFrame: contents.mainFrame })
  assert.equal(calls, 1)
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gridea-protocol-'))
  let route
  try {
    fs.mkdirSync(path.join(root, 'app'))
    fs.writeFileSync(path.join(root, 'app/index.html'), 'ok')
    fs.writeFileSync(path.join(root, 'outside.txt'), 'private')
    fs.symlinkSync(path.join(root, 'outside.txt'), path.join(root, 'app/escape'))
    const protocol = load('protocol.ts', { protocol: { handle: (_scheme, handler) => { route = handler } }, net: { fetch: async () => new Response('ok') } })
    protocol.default('app', path.join(root, 'app'))
    let mediaRoute
    const media = load('media-protocol.ts', { protocol: { handle: (_scheme, handler) => { mediaRoute = handler } }, net: { fetch: async () => new Response('image') } })
    fs.writeFileSync(path.join(root, 'app/cover.png'), 'image')
    fs.writeFileSync(path.join(root, 'outside.png'), 'image')
    fs.symlinkSync(path.join(root, 'outside.png'), path.join(root, 'app/escape.png'))
    media.registerMediaProtocol(() => [path.join(root, 'app')])
    const requestImage = file => mediaRoute({ method: 'GET', url: 'app-media://file/image?path=' + encodeURIComponent(file) })
    assert.equal((await requestImage(path.join(root, 'app/cover.png'))).status, 200)
    assert.equal((await requestImage(path.join(root, 'outside.png'))).status, 403)
    assert.equal((await requestImage(path.join(root, 'app/escape.png'))).status, 403)
    assert.equal(media.grantImage(path.join(root, 'outside.txt')), false)
    assert.equal(media.grantImage(path.join(root, 'outside.png')), true)
    assert.equal((await requestImage(path.join(root, 'outside.png'))).status, 200)

    for (const [url, status] of [['app://./index.html', 200], ['app://evil/index.html', 403], ['app://./%2e%2e%2foutside.txt', 403], ['app://./escape', 403], ['app://./%zz', 400], ['app://./missing', 404]]) {
      assert.equal((await route({ url, method: 'GET' })).status, status, url)
    }
    assert.equal((await route({ url: 'app://./index.html', method: 'POST' })).status, 405)
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
  console.log('PASS: external links, main-frame IPC, protocol traversal/symlink/malformed URL checks')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
