module.exports = async function checkShortcutColors(mode) {
  const root=document.querySelector('#app').__vue__
  localStorage.setItem('appearance',mode);window.gridea.send('app-appearance',mode)
  document.documentElement.style.colorScheme=mode
  document.documentElement.dataset.theme=mode
  window.dispatchEvent(new Event('gridea-appearance-changed'))
  await root.$nextTick()
  let panel=document.querySelector('.keyboard-container')
  if(!panel?.getBoundingClientRect().width) [...document.querySelectorAll('[aria-label]')].find(el=>el.getAttribute('aria-label')===root.$t('keyboardShortcuts')).click()
  for(let i=0;i<30;i++){panel=document.querySelector('.keyboard-container');if(panel?.getBoundingClientRect().width)break;await new Promise(resolve=>setTimeout(resolve,100))}
  await new Promise(resolve=>setTimeout(resolve,350))
  panel=document.querySelector('.keyboard-container')
  if(!panel?.getBoundingClientRect().width)throw new Error('Shortcut help did not open')
  const rgb=value=>value.match(/[\d.]+/g).slice(0,3).map(Number)
  const background=el=>{for(let p=el;p;p=p.parentElement){const color=getComputedStyle(p).backgroundColor;if(color!=='rgba(0, 0, 0, 0)' && color!=='transparent')return color}return 'rgb(255, 255, 255)'}
  const lum=value=>rgb(value).map(x=>{x/=255;return x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4}).reduce((sum,x,i)=>sum+x*[0.2126,0.7152,0.0722][i],0)
  const contrast=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05)}
  const groups=[...panel.querySelectorAll('.keyboard-group-title')],keys=[...panel.querySelectorAll('code')]
  for(const el of [...groups,...panel.querySelectorAll('.ant-divider-inner-text'),...keys])if(contrast(getComputedStyle(el).color,background(el))<4.5)throw new Error('Low shortcut contrast: '+el.textContent)
  const key=getComputedStyle(keys[0]),group=getComputedStyle(groups[0])
  if(mode==='light' && key.backgroundColor!=='rgb(237, 242, 247)')throw new Error('Light key style changed')
  if(mode==='dark' && key.backgroundColor!=='rgb(55, 55, 61)')throw new Error('Dark key background incorrect')
  const row=panel.querySelector('.list-item'),outer=panel.closest('.ant-popover-inner'),box=outer.getBoundingClientRect(),rowBox=row.getBoundingClientRect()
  return {mode,groups:groups.length,keys:keys.length,keyColor:key.color,keyBackground:key.backgroundColor,groupColor:group.color,border:getComputedStyle(groups[0],'::before').borderTopColor,panel:{x:Math.floor(box.x),y:Math.floor(box.y),width:Math.ceil(box.width),height:Math.ceil(box.height)},hover:{x:Math.round(rowBox.x+10),y:Math.round(rowBox.y+rowBox.height/2)}}
}
