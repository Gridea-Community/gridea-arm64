const assert = require('assert/strict'), fs = require('fs'), path = require('path'), vm = require('vm'), ts = require('typescript')
const text = fs.readFileSync(path.join(__dirname, '../src/components/MonacoMarkdownEditor/Index.vue'), 'utf8').match(/<script lang="ts">([\s\S]*?)<\/script>/)[1]
const pending = new Map(); let next = 0, editors = 0, disposedEditors = 0, disposedModels = 0, changed
class Vue { constructor() { this.value = 'test'; this.$el = { querySelectorAll: () => [] }; this.$emit = () => {} } }
const decorator = () => () => {}, mocks = { 'vue-property-decorator': { Vue, Component: c => c, Prop: decorator, Watch: decorator, Model: decorator }, 'monaco-editor': { editor: { defineTheme() {}, setTheme() {}, create() { editors++; return { getModel: () => ({ dispose() { disposedModels++ } }), dispose() { disposedEditors++ }, getValue: () => 'test', onDidChangeModelContent(f) { changed = f }, onKeyDown() {} } } } }, 'monaco-markdown': { MonacoMarkdownExtension: class { activate() {} } }, './theme': {} }
const context = { exports: {}, require: n => mocks[n], window: { addEventListener() {}, removeEventListener() {} }, document: { documentElement: { dataset: {} } }, URL, setTimeout: f => { pending.set(++next, f); return next }, clearTimeout: id => pending.delete(id) }
vm.runInNewContext(ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2019, module: ts.ModuleKind.CommonJS, experimentalDecorators: true, esModuleInterop: true } }).outputText, context)
const Editor = context.exports.default
for (let i = 0; i < 20; i++) {
 const e = new Editor(); e.mounted(); changed(); changed(); assert.equal(pending.size, 1)
 e.setEditorHeight() // empty DOM must be harmless
 e.beforeDestroy(); assert.equal(pending.size, 0); assert.equal(e.editor, null)
 e.setEditorHeight(); e.beforeDestroy() // late callback / repeated disposal must be harmless
}
assert.equal(editors, 20); assert.equal(disposedEditors, 20); assert.equal(disposedModels, 20)
console.log('PASS editor: 20 mount/dispose cycles, model release, coalesced/cancelled timers and empty DOM')
