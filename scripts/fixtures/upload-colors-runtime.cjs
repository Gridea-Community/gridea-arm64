module.exports=async function checkUploadColors(mode){
  const root=document.querySelector('#app').__vue__
  const find=vm=>typeof vm.handlePostSettingClick==='function'?vm:vm.$children.map(find).find(Boolean)
  const article=find(root);article.handlePostSettingClick();await root.$nextTick()
  const group=[...document.querySelectorAll('.post-setting-group')].find(el=>el.querySelector('summary').textContent===root.$t('featureImage'))
  group.open=true
  localStorage.setItem('appearance',mode);window.gridea.send('app-appearance',mode)
  document.documentElement.style.colorScheme=mode
  document.documentElement.dataset.theme=mode;window.dispatchEvent(new Event('gridea-appearance-changed'))
  await new Promise(resolve=>setTimeout(resolve,450))
  const card=document.querySelector('.feature-uploader .ant-upload-select-picture-card'),icon=card.querySelector('.upload-icon')
  if(!card||!icon)throw new Error('Empty cover upload area missing')
  const foreground=getComputedStyle(icon).color,background=getComputedStyle(card).backgroundColor
  const lum=value=>value.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>{x/=255;return x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4}).reduce((sum,x,i)=>sum+x*[0.2126,0.7152,0.0722][i],0)
  const a=lum(foreground),b=lum(background),contrast=(Math.max(a,b)+0.05)/(Math.min(a,b)+0.05)
  if(contrast<4.5)throw new Error('Upload icon contrast too low')
  if(mode==='dark' && foreground!=='rgb(237, 237, 240)')throw new Error('Upload icon still uses light-theme color')
  if(mode==='light' && background!=='rgb(250, 250, 250)')throw new Error('Light upload style changed')
  if(getComputedStyle(card.querySelector('img')).filter!=='none')throw new Error('Upload illustration was filtered')
  const rect=card.getBoundingClientRect()
  const illustration=card.querySelector('img').getBoundingClientRect(),arrow=icon.getBoundingClientRect()
  if(Math.abs((illustration.left+illustration.width/2)-(rect.left+rect.width/2))>1)throw new Error('Upload illustration is not centered')
  if(Math.abs((arrow.left+arrow.width/2)-(rect.left+rect.width/2))>1)throw new Error('Upload arrow is not centered')
  return{mode,foreground,background,contrast,illustrationCentered:true,panel:{x:Math.floor(rect.x),y:Math.floor(rect.y),width:Math.ceil(rect.width),height:Math.ceil(rect.height)}}
}
