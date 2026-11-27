module.exports = async function checkUITransition() {
  const root = document.querySelector('#app').__vue__
  const find = (vm, predicate) => predicate(vm) ? vm : vm.$children.map(child => find(child, predicate)).find(Boolean)
  const list = find(root, vm => typeof vm.newArticle === 'function' && typeof vm.close === 'function')
  const transition = find(list, vm => vm.$options.name === 'fade-transition')
  const pause = () => new Promise(resolve => setTimeout(resolve, 180))
  const equal = (actual, expected, label) => { if(actual !== expected) throw new Error(label + ': ' + JSON.stringify({actual,expected})) }
  equal(transition.duration, 100, 'Existing animation duration')
  for (let i = 0; i < 3; i++) {
    const editor = find(list, vm => vm.editor && typeof vm.updateAppearance === 'function')
    editor.editor.setValue(''); await root.$nextTick()
    list.close(); await root.$nextTick()
    equal(document.querySelector('.article-update-page').style.animationDuration, '100ms', 'Leave animation')
    for (let step = 0; step < 25 && document.querySelector('.article-update-page'); step++) await pause()
    equal(!!document.querySelector('.article-update-page'), false, 'Editor removed after fade')
    list.newArticle(); await root.$nextTick()
    equal(document.querySelector('.article-update-page').style.animationDuration, '100ms', 'Enter animation')
    await pause(); equal(!!document.querySelector('.monaco-editor'), true, 'Editor reopened')
  }
  return 'PASS Vue 2 fade transition: existing 100ms timing, three close/reopen cycles and editor recreation'
}
