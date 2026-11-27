// Exercise the application's real decorators using disposable site data only.
module.exports = async function checkVue2Bindings() {
  const root = document.querySelector('#app').__vue__
  const find = (vm, predicate) => predicate(vm) ? vm : vm.$children.map(child => find(child, predicate)).find(Boolean)
  const equal = (actual, expected, label) => { if(actual !== expected) throw new Error(label + ': ' + JSON.stringify({actual,expected})) }
  const wait = async predicate => { for(let i=0;i<60;i++){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,50))}throw new Error('Vue binding timed out') }
  const component = find(root, vm => vm.editor && typeof vm.updateAppearance === 'function')
  const article = find(root, vm => typeof vm.handleEmojiSelect === 'function')
  const editor = component.editor
  equal(article.visible, true, 'Article visible prop')
  equal(component.isPostPage, true, 'Editor layout prop')
  article.form.content = 'Parent binding 中文'
  await root.$nextTick(); equal(editor.getValue(), 'Parent binding 中文', 'Prop watcher updates editor')
  editor.setPosition({lineNumber:1,column:editor.getValue().length+1})
  editor.trigger('keyboard','type',{text:'😀'})
  await root.$nextTick(); equal(article.form.content, 'Parent binding 中文😀', 'Model event updates parent')
  const language = root.$i18n.locale
  root.$i18n.locale = language === 'en' ? 'zhHans' : 'en'
  await root.$nextTick()
  equal(document.querySelector('.monaco-editor [role=textbox][aria-label]').getAttribute('aria-label').includes(root.$t('draftRecoveryBody')), true, 'Locale watcher updates accessible label')
  root.$i18n.locale = language
  editor.setValue(''); await root.$nextTick()
  const list = find(root, vm => typeof vm.newArticle === 'function')
  list.currentPage = 3; list.keyword = 'decorator-filter-fixture'
  await root.$nextTick(); equal(list.currentPage, 1, 'Search watcher resets pagination')
  list.keyword = ''; list.close(); await root.$nextTick()
  const original = JSON.parse(JSON.stringify(root.$store.state.site.setting))
  const route = async path => { await root.$router.push(path).catch(()=>{}); await root.$nextTick() }
  const save = data => new Promise(resolve => { window.gridea.receive('setting-saved',resolve,true); window.gridea.send('setting-save',data) })
  try {
    await route('/setting')
    await wait(()=>find(root,vm=>typeof vm.onTokenChanged==='function'))
    const setting = find(root,vm=>typeof vm.onTokenChanged==='function')
    setting.protocol = 'https://'
    Object.assign(setting.form,{platform:'github',domain:'vue-binding.example.test',repository:'fixture',branch:'main',username:'fixture',email:'fixture@example.test',token:'  synthetic-not-a-real-token  '})
    await root.$nextTick(); equal(setting.form.token,'synthetic-not-a-real-token','Nested token watcher')
    equal(Boolean(setting.canSubmit),true,'Computed form validation')
    const saved = new Promise(resolve=>window.gridea.receive('setting-saved',resolve,true))
    setting.submit(); equal(await saved,true,'Setting save event')
    await wait(()=>root.$store.state.site.setting.domain==='https://vue-binding.example.test')
    await route('/articles'); await route('/setting')
    await wait(()=>find(root,vm=>typeof vm.onTokenChanged==='function'))
    const restored = find(root,vm=>typeof vm.onTokenChanged==='function')
    equal(restored.form.domain,'vue-binding.example.test','Saved form restored after remount')
    equal(restored.form.token,'synthetic-not-a-real-token','Trimmed field persisted')
  } finally {
    equal(await save(original),true,'Restore disposable configuration')
    root.$bus.$emit('site-reload')
    await wait(()=>root.$store.state.site.setting.domain===original.domain)
  }
  return 'PASS Vue 2 decorators: props, two-way editor binding, nested/locale/search watchers, computed validation and settings save/remount'
}
