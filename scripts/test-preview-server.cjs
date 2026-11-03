const assert = require('node:assert/strict')
const fs = require('fs'), path = require('path'), ts = require('typescript'), vm = require('vm')
const { EventEmitter } = require('events')
const attempts = []
const app = {
  settings: {},
  set(key, value) { this.settings[key] = value },
  listen(port, host) {
    const server = new EventEmitter()
    server.closed = false
    server.close = () => { server.closed = true }
    attempts.push({ port, host, server })
    return server
  },
}
const exportsObject = {}
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/server.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText
vm.runInNewContext(code, { exports: exportsObject, console: { log() {}, error() {} }, require: name => { if (name === 'express') return () => app; return require(name) } })
const service = exportsObject.default()
attempts[0].server.emit('error', { code: 'EADDRINUSE' })
assert.deepEqual(attempts.map(item => item.port), [4000, 4001])
assert.equal(attempts[1].host, '127.0.0.1')
attempts[1].server.emit('listening')
assert.equal(service.app.settings.port, 4001)
assert.equal(service.server, attempts[1].server)
service.close()
assert.equal(attempts[1].server.closed, true)
attempts[1].server.emit('error', { code: 'EADDRINUSE' })
assert.equal(attempts.length, 2)
const other = exportsObject.default()
attempts[2].server.emit('error', { code: 'EACCES' })
assert.equal(attempts.length, 3)
other.close()
console.log('PASS: IPv4 loopback, busy-port retry, retry-server cleanup, stop retry after close and no retry on permissions failure')
