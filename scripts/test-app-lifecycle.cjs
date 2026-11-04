const assert = require('node:assert/strict'), fs = require('fs'), path = require('path'), vm = require('vm'), { EventEmitter } = require('events'), ts = require('typescript')
function launch(primary = true) {
 const app = new EventEmitter(), commands = {}, windows = [], servers = []; let quits = 0
 Object.assign(app, { requestSingleInstanceLock: () => primary, quit: () => quits++, relaunch: () => assert.fail('unexpected process relaunch'), isReady: () => true, getLocale: () => 'zh-CN', dock: { setIcon() {} } })
 class Window extends EventEmitter {
  constructor() { super(); this.destroyed = false; this.reloads = 0; this.webContents = new EventEmitter(); Object.assign(this.webContents, { reload: () => this.reloads++, send() {}, setWindowOpenHandler() {}, session: { setPermissionRequestHandler() {}, setPermissionCheckHandler() {} } }); windows.push(this) }
  isDestroyed() { return this.destroyed } isMinimized() { return false } show() {} focus() {} setTitle() {} loadURL() {}
 }
 const ipc = { on: (n, f) => { commands[n] = f }, handle() {} }
 const mocks = { './helpers/process-diagnostics': () => {}, electron: { app, BrowserWindow: Window, protocol: { registerSchemesAsPrivileged() {} }, Menu: { buildFromTemplate: () => ({}), setApplicationMenu() {} }, dialog: {}, nativeTheme: {} }, './helpers/file-access': { grantFolder() {} }, './helpers/editor-permissions': () => false, './helpers/trusted-ipc': { ...ipc, default: ipc, __esModule: true, setTrustedWindow() {} }, './helpers/external-link': { openExternal: () => Promise.resolve() }, './helpers/protocol': () => {}, './helpers/media-protocol': { registerMediaProtocol() {}, grantImage() {} }, './server/app': class {}, './assets/locales-menu': { 'zh-CN': {} }, './server': () => { const s = { app: {}, closes: 0, close() { this.closes++ } }; servers.push(s); return s }, path }
 const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/background.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText
 vm.runInNewContext(code, { exports: {}, require: n => { assert.ok(n in mocks, n); return mocks[n] }, process: { platform: 'darwin', env: { NODE_ENV: 'production' } }, __dirname: '/test-app', console: { log() {}, error() {} } })
 return { app, commands, windows, servers, get quits() { return quits } }
}
const m = launch(); m.app.emit('ready'); assert.equal(m.windows.length, 1)
for (let i = 0; i < 5; i++) m.commands['app-refresh']()
assert.equal(m.windows[0].reloads, 5); assert.equal(m.quits, 0)
m.app.emit('second-instance'); m.app.emit('activate'); assert.equal(m.windows.length, 1)
const old = m.windows[0]; old.destroyed = true; old.emit('closed'); m.app.emit('window-all-closed'); assert.equal(m.servers[0].closes, 1)
m.app.emit('activate'); assert.equal(m.windows.length, 2)
old.emit('closed'); m.app.emit('activate'); assert.equal(m.windows.length, 2)
m.app.emit('before-quit'); m.app.emit('activate'); m.app.emit('second-instance'); m.commands['app-refresh'](); m.app.emit('will-quit')
assert.equal(m.windows.length, 2); assert.equal(m.windows[1].reloads, 0); assert.equal(m.servers[1].closes, 1)
const secondary = launch(false); secondary.app.emit('ready'); secondary.app.emit('activate'); secondary.app.emit('second-instance')
assert.equal(secondary.quits, 1); assert.equal(secondary.windows.length, 0); assert.equal(secondary.servers.length, 0)
console.log('PASS: refresh without relaunch, single-window guards, reopen, stale closed callback and quit cleanup')
