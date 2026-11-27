// Runs against disposable sites in the actual packaged renderer.
module.exports = async function checkUIResources(mode = 'light', baseline = false) {
  const find = (vm, predicate) => predicate(vm) ? vm : vm.$children.map(child => find(child, predicate)).find(Boolean)
  const root = document.querySelector('#app').__vue__
  const article = find(root, vm => typeof vm.handleEmojiSelect === 'function')
  const component = find(root, vm => vm.editor && typeof vm.updateAppearance === 'function')
  const editor = component.editor
  const pause = () => new Promise(resolve => setTimeout(resolve, 100))
  const equal = (actual, expected, label) => { if (actual !== expected) throw new Error(label + ': ' + JSON.stringify({actual,expected})) }
  document.documentElement.dataset.theme = mode
  component.updateAppearance()
  const toggle = document.querySelector('[aria-label="' + root.$t('insertEmoji') + '"]')
  let picker = document.querySelector('.emoji-card #EmojiPicker')
  if (!picker || !picker.getBoundingClientRect().width) toggle.click()
  for (let i = 0; i < 30; i++) {
    picker = document.querySelector('.emoji-card #EmojiPicker')
    if (picker?.getBoundingClientRect().width && picker.querySelector('.emoji')) break
    await pause()
  }
  equal(!!picker?.querySelector('.emoji'), true, 'Emoji panel populated')
  await new Promise(resolve => setTimeout(resolve, 350)) // Let the existing popover zoom finish before measuring.
  const categories = [...picker.querySelectorAll('.category')]
  // Preserve the initial people category while checking every populated category.
  const people = categories[1]
  if (!baseline) {
    for (const category of [people, ...categories]) {
      category.click(); await pause()
      const emoji = picker.querySelector('.emoji')
      equal(!!emoji?.textContent.trim(), true, 'Category has native emoji')
      const text = emoji.textContent.trim()
      editor.setValue('insert '); editor.setPosition({lineNumber:1,column:8})
      emoji.click(); await pause()
      equal(editor.getValue(), 'insert ' + text, 'Emoji selected through the panel')
    }
  }
  people.click(); await new Promise(resolve => setTimeout(resolve, 350))
  const first = picker.querySelector('.emoji')
  const style = getComputedStyle(picker)
  const rect = picker.getBoundingClientRect()
  const item = first.getBoundingClientRect()
  equal(Math.round(rect.width), 325, 'Panel width')
  equal(Math.round(item.width), 40, 'Emoji cell width')
  equal(Math.round(item.height), 40, 'Emoji cell height')
  equal(getComputedStyle(first).fontSize, '25px', 'Emoji font size')
  equal(style.backgroundColor, mode === 'dark' ? 'rgb(41, 41, 46)' : 'rgb(255, 255, 255)', 'Emoji background')
  if (!baseline) {
    equal(first.classList.contains('border'), false, 'No added emoji borders')
    const positions = [...picker.querySelectorAll('.emoji')].slice(0,9).map(el => el.getBoundingClientRect())
    equal(positions.slice(0,8).every(box => Math.abs(box.top - positions[0].top) < 1), true, 'Eight columns')
    equal(positions[8].top > positions[0].top, true, 'Next emoji row')
  }
  const noto = await document.fonts.load('400 16px "Noto Serif"', 'Gridea')
  const icons = await document.fonts.load('16px remixicon', '\uea01')
  equal(noto.some(face => face.status === 'loaded'), true, 'Noto Serif loaded')
  equal(icons.some(face => face.status === 'loaded'), true, 'Icon font loaded')
  editor.setValue('')
  return {mode, panel:{x:Math.floor(rect.x),y:Math.floor(rect.y),width:Math.ceil(rect.width),height:Math.ceil(rect.height)},categories:categories.length, emojiCount:picker.querySelectorAll('.emoji').length,background:style.backgroundColor,color:style.color,font:getComputedStyle(first).fontFamily}
}
