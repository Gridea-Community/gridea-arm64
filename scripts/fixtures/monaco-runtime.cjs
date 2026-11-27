// Executed inside the isolated packaged renderer, never against a user's site.
module.exports = async function checkMonaco() {
  const find = (vm, predicate) => predicate(vm) ? vm : vm.$children.map(child => find(child, predicate)).find(Boolean)
  const root = document.querySelector('#app').__vue__
  const component = find(root, vm => vm.editor && typeof vm.updateAppearance === 'function')
  const article = find(root, vm => typeof vm.handleEmojiSelect === 'function')
  const editor = component.editor
  const pause = () => new Promise(resolve => setTimeout(resolve, 80))
  const equal = (actual, expected, label) => { if (actual !== expected) throw new Error(label + ': ' + JSON.stringify({ actual, expected })) }
  const action = async name => { console.log('Monaco regression action:', name); const a = editor.getAction(name); if (!a) throw new Error('Missing editor action: ' + name); await a.run(); await pause() }
  equal(editor.getModel().getLanguageId(), 'markdown-math', 'Markdown language')
  editor.setValue('word'); editor.setSelection({startLineNumber:1,startColumn:1,endLineNumber:1,endColumn:5})
  await action('markdown.extension.editing.toggleBold')
  equal(editor.getValue(), '**word**', 'Bold command')
  editor.setValue('first'); editor.setPosition({lineNumber:1,column:6}); editor.pushUndoStop()
  editor.trigger('keyboard', 'type', { text: ' 中文😀' }); editor.pushUndoStop(); await pause()
  equal(editor.getValue(), 'first 中文😀', 'Unicode input')
  editor.trigger('keyboard','undo'); await pause(); equal(editor.getValue(), 'first', 'Undo')
  editor.trigger('keyboard','redo'); await pause(); equal(editor.getValue(), 'first 中文😀', 'Redo')
  editor.setValue('- first'); editor.setPosition({lineNumber:1,column:8})
  await action('markdown.extension.editing.onEnterKey')
  equal(editor.getValue(), '- first\n- ', 'List continuation')
  editor.setValue('- [x] done'); editor.setPosition({lineNumber:1,column:11})
  await action('markdown.extension.editing.onEnterKey')
  equal(editor.getValue(), '- [x] done\n- [ ] ', 'Task continuation')
  editor.setValue('text'); editor.setPosition({lineNumber:1,column:5}); article.insertMore(); await pause()
  equal(editor.getValue(), 'text\n<!-- more -->\n', 'More insertion')
  article.handleEmojiSelect('😀'); await pause(); equal(editor.getValue().includes('😀'), true, 'Emoji insertion')
  editor.setValue('| A | B |\n|---|---|\n| x | y |')
  await action('editor.action.formatDocument')
  equal(editor.getValue().includes('A'), true, 'Table formatting')
  for (const theme of ['dark', 'light', 'dark', 'light']) {
    document.documentElement.dataset.theme = theme; component.updateAppearance(); await pause()
    equal(!!document.querySelector('.monaco-editor.' + (theme === 'dark' ? 'vs-dark' : 'vs')), true, 'Editor theme')
  }
  equal(typeof editor.getAction('actions.find').run, 'function', 'Find command')
  editor.setValue('https://example.test/path')
  for (let i = 0; i < 60 && !document.querySelector('.monaco-editor .detected-link'); i++) await pause()
  equal(!!document.querySelector('.monaco-editor .detected-link'), true, 'Worker link detection')
  equal(window.__grideaWorkerCheck.started.includes('editorWorkerService'), true, 'Editor worker started')
  equal(window.__grideaWorkerCheck.ready.includes('editorWorkerService'), true, 'Editor worker ready')
  equal(window.__grideaWorkerCheck.errors.length, 0, 'Editor worker errors')
  editor.setValue('')
  return 'PASS upgraded Monaco: formatting, Unicode, undo/redo, lists, tasks, insertions, tables, themes, find and worker link detection'
}
