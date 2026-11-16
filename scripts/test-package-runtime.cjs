const fs = require('fs'), path = require('path'), os = require('os'), {spawnSync} = require('child_process')
const root = path.resolve(__dirname, '..')
if (!process.argv[2]) throw new Error('Pass the packaged .app path')
const build = path.resolve(process.argv[2], 'Contents/Resources/app/background.js')
if (!fs.existsSync(build)) throw new Error('Complete pnpm build:arm64 before running the site-switch test')
const temp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'gridea-site-switch-')))
try {
 for (const name of ['A','B']) {
  const dir=path.join(temp,name)
  fs.cpSync(path.join(root,'public/default-files'),dir,{recursive:true})
  const file=path.join(dir,'config/theme.json'), json=JSON.parse(fs.readFileSync(file))
  json.config.siteName='Fixture '+name
  fs.writeFileSync(file,JSON.stringify(json))
 }
 if(process.env.GRIDEA_TEST_DRAFT_RECOVERY){
  const posts=path.join(temp,'A','posts');
  for(const name of fs.readdirSync(posts).filter(name=>name.endsWith('.md'))){
   fs.appendFileSync(path.join(posts,name),'\nrecovery-marker-before\nrecovery-unchanged-context\n');
  }
 }
 fs.mkdirSync(path.join(temp,'.gridea'))
 fs.writeFileSync(path.join(temp,'.gridea/config.json'),JSON.stringify({sourceFolder:path.join(temp,'A')}))
 const harness=path.join(temp,'main.cjs')
 fs.writeFileSync(harness,`
const {app,BrowserWindow,dialog,Menu,shell}=require('electron'), assert=require('assert/strict');
process.on('uncaughtException',error=>{console.error(error);app.exit(1)});
let target; dialog.showOpenDialog=async options=>{assert.equal(options.defaultPath,process.env.GRIDEA_TEST_HOME);return {canceled:false,filePaths:[target]}};
const watchdog=setTimeout(()=>app.exit(1),45000);
const childProcess=require('node:child_process');
const execFile=childProcess.execFile;
const previewSounds=[];
childProcess.execFile=(file,...args)=>{
 if(file!=='/usr/bin/afplay')return execFile(file,...args);
 previewSounds.push(...args[0]);
 args[2](null,'','');
};
const issues=[];
let auditReady;
app.once('browser-window-created',(_event,win)=>{
 const debug=win.webContents.debugger;
 debug.attach();
 debug.on('message',(_event,method,params)=>{
  if(method==='Audits.issueAdded') issues.push(params.issue);
 });
 auditReady=debug.sendCommand('Audits.enable');
});
let mockedLocale=process.env.GRIDEA_TEST_SYSTEM_LOCALE || 'fr-CA';
if(process.env.GRIDEA_TEST_LOCALIZATION) app.getLocale=()=>mockedLocale;
const fs=require('node:fs'), path=require('node:path');
const testHome=process.env.GRIDEA_TEST_HOME;
if(process.env.GRIDEA_TEST_CLEAN_INSTALL){
 app.setPath('appData',testHome);
 delete process.env.GRIDEA_TEST_HOME;
 require(path.join(path.dirname(process.env.GRIDEA_SWITCH_BUILD),'startup.cjs'));
}else{
 require(process.env.GRIDEA_SWITCH_BUILD);
}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{
 try{
  const win=BrowserWindow.getAllWindows()[0];
  await auditReady;
  assert.equal(win.webContents.getLastWebPreferences().sandbox,true);
  const run=s=>win.webContents.executeJavaScript(s);
  const wait=async fn=>{for(let i=0;i<150;i++){try{if(await fn())return}catch{} await delay(100)}throw Error('Timed out waiting for site')};
  if(process.env.GRIDEA_TEST_CLEAN_INSTALL){
   const home=path.join(testHome,'Gridea ARM Preview'), blog=path.join(home,'Gridea');
   await wait(()=>run("document.querySelector('#app')?.__vue__?.$store.state.site.appDir === "+JSON.stringify(blog)));
   assert.deepEqual(fs.readdirSync(path.join(blog,'themes')).sort(),['fly','notes','paper','simple']);
   assert.equal(JSON.parse(fs.readFileSync(path.join(home,'.gridea','config.json'))).sourceFolder,blog);
   assert.ok(!issues.some(issue=>/SharedArrayBuffer/i.test(JSON.stringify(issue))),JSON.stringify(issues));
   console.log('PASS clean startup seeds original themes from the single default-files directory');
   clearTimeout(watchdog);app.quit();return;
  }
  await wait(()=>run("document.querySelector('#app')?.__vue__?.$store.state.site.appDir === "+JSON.stringify(process.env.GRIDEA_TEST_HOME+'/A')));
  if(process.env.GRIDEA_DRAFT_TEST_PHASE){
   const phase=process.env.GRIDEA_DRAFT_TEST_PHASE;
   const fixture=path.join(testHome,'A');
   const directory=path.join(testHome,'draft-recovery');
   const view="function find(vm,key){if(typeof vm[key]==='function')return vm;for(const child of vm.$children){const match=find(child,key);if(match)return match}}const root=document.querySelector('#app').__vue__;";
   const action=code=>run("(()=>{"+view+code+"})()");
   const open=async mode=>{
    await action("const articles=find(root,'newArticle');"+(mode==='new'?"articles.newArticle()":"articles.editPost(articles.site.posts[0])")+";return true");
    await wait(()=>action("return Boolean(find(root,'restoreDraft'))"));
   };
   const files=()=>fs.existsSync(directory)?fs.readdirSync(directory).filter(name=>name.endsWith('.json')):[];
   const names=fs.readdirSync(path.join(fixture,'posts')).filter(name=>name.endsWith('.md'));
   const original=JSON.stringify(names.map(name=>[name,fs.readFileSync(path.join(fixture,'posts',name),'utf8')]));
   const baselineFile=path.join(testHome,'original-posts.json');
   const update=mode=>action("const editor=find(root,'restoreDraft');Object.assign(editor.form,{title:'Recovery "+mode+"',content:"+(mode==='existing'?"editor.form.content.replace('recovery-marker-before','**Unsaved existing**')":"'**Unsaved new**'")+",fileName:'recovery-"+mode+"',tags:['recovery'],hideInList:true,isTop:true,featureImagePath:'https://example.test/cover.png'});editor.form.date=editor.form.date.clone().year(2022);editor.featureType='EXTERNAL';editor.fileNameChanged=true;return true");
   if(phase==='write'){
    fs.writeFileSync(baselineFile,original);
    await open('new');
    await update('new');
    await wait(()=>files().length===1);
    await action("find(root,'newArticle').close();return true");
    await wait(()=>action("return !find(root,'restoreDraft')"));
    await open('existing');
    await update('existing');
    await wait(()=>files().length===2);
    console.log('PASS both recovery snapshots flushed before forced app exit');
    process.kill(process.pid,'SIGKILL');
    return;
   }
   assert.equal(original,fs.readFileSync(baselineFile,'utf8'));
   for(const mode of ['new','existing']){
    await open(mode);
    assert.equal(await action("return find(root,'restoreDraft').recoveryDraft.title"),'Recovery '+mode);
    const comparison=await run("document.querySelector('.draft-recovery-diff').textContent");
    assert.ok(comparison.includes('**Unsaved '+mode+'**'));
    if(mode==='existing'){
     assert.ok(comparison.includes('recovery-marker-before'));
     assert.ok(!comparison.includes('recovery-unchanged-context'));
    }
    await action("find(root,'restoreDraft').restoreDraft();return true");
    const restored=await action("return find(root,'restoreDraft').draftSnapshot");
    assert.equal(restored.title,'Recovery '+mode);
    assert.ok(restored.content.includes('**Unsaved '+mode+'**'));
    if(mode==='existing')assert.ok(restored.content.includes('recovery-unchanged-context'));
    assert.equal(restored.fileName,'recovery-'+mode);
    assert.deepEqual(restored.tags,['recovery']);
    assert.match(restored.date,/^2022-/);
    assert.equal(restored.hideInList,true);
    assert.equal(restored.isTop,true);
    assert.equal(restored.featureType,'EXTERNAL');
    assert.equal(restored.featureImagePath,'https://example.test/cover.png');
    assert.equal(JSON.stringify(names.map(name=>[name,fs.readFileSync(path.join(fixture,'posts',name),'utf8')])),original);
    if(mode==='new'){
     await action("find(root,'newArticle').close();return true");
     await wait(()=>action("return !find(root,'restoreDraft')"));
     await open('new');
     await action("find(root,'restoreDraft').discardRecoveryDraft();find(root,'newArticle').close();return true");
     await wait(()=>action("return !find(root,'restoreDraft')"));
     assert.equal(files().length,1);
    }else{
     await action("find(root,'restoreDraft').normalSavePost();return true");
     await wait(()=>files().length===0);
     assert.match(fs.readFileSync(path.join(fixture,'posts','recovery-existing.md'),'utf8'),/Unsaved existing/);
    }
   }
   console.log('PASS new and existing article recovery after a full app kill, with changed-only comparison, discard and save cleanup');
   clearTimeout(watchdog);app.quit();return;
  }
  if(process.env.GRIDEA_EXPECTED_DISPLAY_VERSION){
   await run("document.querySelector('.ri-equalizer-line').click()");
   await wait(()=>run("document.body.textContent.includes("+JSON.stringify(process.env.GRIDEA_EXPECTED_DISPLAY_VERSION)+")"));
   console.log('PASS settings display version',process.env.GRIDEA_EXPECTED_DISPLAY_VERSION);
  }
  if(process.env.GRIDEA_TEST_LOCALIZATION){
   const languages=[
    ['zhHans','zh-CN','外观','跟随系统','编辑','帮助','了解更多','Gridea 帮助'],
    ['zh_HK','zh-HK','外觀','跟從系統設定','編輯','說明','了解更多','Gridea 說明'],
    ['zh_TW','zh-TW','外觀','跟隨系統','編輯','輔助說明','瞭解更多','Gridea 說明'],
    ['en','en','Appearance','Follow System','Edit','Help','Learn More','Gridea Help'],
    ['fr_FR','fr-FR','Apparence','Suivre le système','Éditer','Aide','En savoir plus','Aide de Gridea'],
    ['ja_JP','ja-JP','外観','システム設定に従う','編集','ヘルプ','詳しく見る','Gridea ヘルプ'],
    ['ru','ru','Оформление','Как в системе','Редактировать','Помощь','Подробнее','Справка Gridea'],
   ];
   const readLanguage=()=>run("document.querySelector('#app').__vue__.$i18n.locale");
   const verify=async ([key,lang,appearance,system,edit,help,learn,upstream])=>{
    assert.equal(await readLanguage(),key);
    assert.equal(await run("document.documentElement.lang"),lang);
    await wait(()=>run("Array.from(document.querySelectorAll('[aria-label]')).some(el=>el.getAttribute('aria-label')==="+JSON.stringify(appearance)+" && el.textContent.includes("+JSON.stringify(system)+"))"));
    await wait(async()=>Menu.getApplicationMenu().items.some(item=>item.label===help));
    const menu=Menu.getApplicationMenu().items;
    assert.ok(menu.some(item=>item.label===edit));
    if(key==='zh_HK' || key==='zh_TW'){
     const commands=menu.find(item=>item.label===edit).submenu.items;
     assert.equal(commands.find(item=>item.role==='cut').label,'剪下');
     assert.equal(commands.find(item=>item.role==='paste').label,'貼上');
     assert.equal(commands.find(item=>item.role==='copy').label,key==='zh_HK'?'複製':'拷貝');
     const terms=await run("['email','articleDefault','tagDefault','numberArticlesRSS','inConfig'].map(key=>document.querySelector('#app').__vue__.$t(key))");
     assert.deepEqual(terms,[key==='zh_HK'?'電郵':'電子郵件','文章 URL 預設格式','標籤 URL 預設格式','RSS/Feed 文章數量','設定中']);
    }
    assert.deepEqual(menu.find(item=>item.label===help).submenu.items.map(item=>item.label),[learn,upstream]);
   };
   const systemLocale=process.env.GRIDEA_TEST_SYSTEM_LOCALE || 'fr-CA';
   const initialLanguage=systemLocale==='zh-Hant-HK' ? 'zh_HK' : systemLocale==='zh-Hant-TW' ? 'zh_TW' : 'fr_FR';
   assert.equal(await readLanguage(),initialLanguage);
   await run("document.querySelector('.ri-equalizer-line').click()");
   await verify(languages.find(item=>item[0]===initialLanguage));
   assert.equal(await run("document.querySelector('input[name=currentLanguage]:checked').value"),'system');
   console.log('PASS first launch follows',systemLocale,'in settings and menu');
   for(const language of languages){
    const key=language[0];
    await run("(()=>{const radio=Array.from(document.querySelectorAll('input[name=currentLanguage]')).find(el=>el.value==="+JSON.stringify(key)+");radio.click();return new Promise(r=>setTimeout(()=>{radio.closest('form').querySelector('button').click();r(true)},0))})()");
    await verify(language);
    console.log('PASS localization',key);
   }
   mockedLocale='ja-JP';
   await run("window.dispatchEvent(new Event('focus'))");
   assert.equal(await readLanguage(),'ru');
   const pickLanguage=key=>run("(()=>{const radio=Array.from(document.querySelectorAll('input[name=currentLanguage]')).find(el=>el.value==="+JSON.stringify(key)+");radio.click();return new Promise(r=>setTimeout(()=>{radio.closest('form').querySelector('button').click();r(true)},0))})()");
   await pickLanguage('system');
   await verify(languages.find(item=>item[0]==='ja_JP'));
   mockedLocale='en-GB';
   await run("window.dispatchEvent(new Event('focus'))");
   await verify(languages.find(item=>item[0]==='en'));
   await pickLanguage('ru');
   console.log('PASS manual language stays fixed and system mode follows locale changes');
   const loaded=new Promise(resolve=>win.webContents.once('did-finish-load',resolve));
   await run("window.gridea.send('app-refresh')");
   await loaded;
   await wait(()=>run("!!document.querySelector('.ri-equalizer-line')"));
   await run("document.querySelector('.ri-equalizer-line').click()");
   await verify(languages[languages.length-1]);
   console.log('PASS selected language and native menu survive reload');
   const opened=[];
   shell.openExternal=async url=>{opened.push(url)};
   const help=Menu.getApplicationMenu().items.find(item=>item.label===languages[languages.length-1][5]);
   for(const item of help.submenu.items) item.click();
   assert.deepEqual(opened,['https://github.com/Gridea-Community/gridea-arm64','https://github.com/getgridea/gridea']);
   console.log('PASS both Help menu destinations');
  }
  for(const [route,name] of [['/theme','B'],['/setting','A'],['/theme','B']]){
   await run("document.querySelector('#app').__vue__.$router.push("+JSON.stringify(route)+").then(()=>true,()=>true)");
   target=process.env.GRIDEA_TEST_HOME+'/'+name;
   assert.equal(await run("window.gridea.invoke('app-select-folder').then(()=>new Promise(resolve=>{window.gridea.receive('app-source-folder-set',resolve,true);window.gridea.send('app-source-folder-setting',"+JSON.stringify(target)+")}))"),true);
   const loaded=new Promise(resolve=>win.webContents.once('did-finish-load',resolve));
   await run("window.gridea.send('app-refresh')");
   await loaded;
   await wait(()=>run("document.querySelector('#app')?.__vue__?.$store.state.site.appDir === "+JSON.stringify(target)));
   const state=await run("(()=>{const vm=document.querySelector('#app').__vue__;return {route:vm.$route.path,name:vm.$store.state.site.themeConfig.siteName,posts:vm.$store.state.site.posts.length,themes:vm.$store.state.site.themes.length}})()");
   assert.equal(state.route,route);assert.equal(state.name,'Fixture '+name);assert.ok(state.posts>0);assert.equal(state.themes,4);
   assert.equal(BrowserWindow.getAllWindows().length,1);
   console.log('PASS site switch',route,name);
  }

  for(const theme of ['fly','notes','paper','simple']){
    const result=await run("(async()=>{const site=document.querySelector('#app').__vue__.$store.state.site; const config={...site.themeConfig,themeName:"+JSON.stringify(theme)+"};const saved=await new Promise(r=>{window.gridea.receive('theme-saved',r,true);window.gridea.send('theme-save',config)}); if(!saved)throw Error('Theme save failed');await new Promise(r=>{window.gridea.receive('app-site-loaded',r,true);window.gridea.send('app-site-reload',{})});return await new Promise(r=>{window.gridea.receive('html-rendered',r,true);window.gridea.send('html-render')})})()");
    assert.equal(result.success,true,result.message);assert.ok(Number.isInteger(result.port));console.log('PASS packaged theme generation',theme);
  }
  assert.deepEqual(previewSounds,[]);
  await run("document.querySelector('.ri-equalizer-line').click()");
  await wait(()=>run("Boolean(document.querySelector('.preview-sound-setting button'))"));
  assert.equal(await run("document.querySelector('.preview-sound-setting button').classList.contains('ant-switch-checked')"),false);
  await run("document.querySelector('.preview-sound-setting button').click()");
  await wait(()=>run("localStorage.getItem('previewSound')==='true'"));
  const soundReload=new Promise(resolve=>win.webContents.once('did-finish-load',resolve));
  await run("window.gridea.send('app-refresh')");
  await soundReload;
  await wait(()=>run("Boolean(document.querySelector('.preview-btn'))"));
  console.log('PASS preview sounds default off and saved preference survives reload');
  previewSounds.length=0;
  const previewURLs=[];
  shell.openExternal=async url=>{previewURLs.push(url)};
  const checkChinesePreview=process.env.GRIDEA_TEST_PREVIEW_ZH==='1';
  if(checkChinesePreview)await run("document.querySelector('#app').__vue__.$i18n.locale='zhHans'");
  const undefinedDiagnostic=checkChinesePreview?'未定义':'не определена.';
  const themePath=path.join(target,'themes','simple');
  const styles=path.join(themePath,'assets','styles','main.less');
  const customPage=path.join(themePath,'templates','broken-preview.ejs');
  for(const [file,contents,diagnostic] of [
   [styles,'.broken { color: ;', 'Unrecognised input'],
   [customPage,'<% throw new Error("broken-preview-fixture") %>','broken-preview-fixture'],
   ...(process.env.GRIDEA_TEST_LOCALIZATION ? [[customPage,'<%= post.feature %> '+ 'long line '.repeat(200),undefinedDiagnostic]] : []),
  ]){
   const previous=fs.existsSync(file)?fs.readFileSync(file):null;
   try{
    fs.writeFileSync(file,contents);
    win.blur();
    assert.equal(win.isFocused(),false);
    await run("document.querySelector('.preview-btn').click()");
    await wait(()=>run("Array.from(document.querySelectorAll('.ant-modal .preview-error-reason')).some(el=>el.textContent.includes("+JSON.stringify(diagnostic)+"))"));
    assert.equal(win.isFocused(),false);
    assert.equal(previewURLs.length,0);
    const detail=await run("Array.from(document.querySelectorAll('.ant-modal .preview-error-reason')).find(el=>el.textContent.includes("+JSON.stringify(diagnostic)+")).textContent");
    const modalSelector="Array.from(document.querySelectorAll('.ant-modal')).find(el=>el.querySelector('.preview-error-reason')?.textContent.includes("+JSON.stringify(diagnostic)+"))";
    assert.ok((await run(modalSelector+".querySelector('.preview-error-location').textContent")).includes(file));
    assert.equal(await run("Boolean("+modalSelector+".querySelector('details'))"),false);
    if(diagnostic===undefinedDiagnostic){
     assert.ok(await run(modalSelector+".querySelector('pre').textContent.includes('post.feature')"));
     const scroll=await run("(()=>{const modal="+modalSelector+"; const code=modal.querySelector('pre'); const reason=modal.querySelector('.preview-error-reason'); const before=reason.getBoundingClientRect().left; code.scrollLeft=code.scrollWidth; return {offset:code.scrollLeft,stationary:reason.getBoundingClientRect().left===before,inside:code.contains(reason)}})()");
     assert.ok(scroll.offset>0);
     assert.equal(scroll.stationary,true);
     assert.equal(scroll.inside,false);
     const name=String.fromCharCode(96)+'post'+String.fromCharCode(96);
     assert.equal(detail.trim().split(String.fromCharCode(10)).pop(),checkChinesePreview?'变量 '+name+' 未定义':'Переменная '+name+' не определена.');
    }

    if(checkChinesePreview){
     assert.equal(await run(modalSelector+".querySelector('h2 + p').textContent"),'请根据错误详情检查主题模板或样式，修正后再试');
    }
    assert.ok(await run("parseFloat(getComputedStyle("+modalSelector+".querySelector('.preview-error-details')).marginTop)>0"));
    assert.ok(await run("parseFloat(getComputedStyle("+modalSelector+".querySelector('.preview-error-location')).marginBottom)>0"));
    await run("Array.from(document.querySelectorAll('.ant-modal')).find(el=>el.querySelector('.preview-error-reason')?.textContent.includes("+JSON.stringify(diagnostic)+")).querySelector('.ant-modal-close').click()");
    console.log('PASS preview error shown without refocusing:',diagnostic);
   }finally{
    if(previous===null)fs.unlinkSync(file);
    else fs.writeFileSync(file,previous);
   }
  }
  await run("document.querySelector('.preview-btn').click()");
  await wait(()=>previewURLs.length===1);
  assert.match(previewURLs[0],/^http:\\/\\/localhost:[0-9]+$/);
  console.log('PASS preview succeeds after fixing the broken theme');
  if(process.platform==='darwin'){
   assert.deepEqual(previewSounds,[...Array(process.env.GRIDEA_TEST_LOCALIZATION ? 3 : 2).fill('/System/Library/Sounds/Basso.aiff'),'/System/Library/Sounds/Glass.aiff']);
   console.log('PASS distinct macOS sounds for preview failure and success');
  }
  await run("document.querySelector('#app').__vue__.$router.push('/articles').then(()=>true,()=>true)");
  await run("(()=>{function find(vm){if(typeof vm.newArticle==='function')return vm;for(const child of vm.$children){const found=find(child);if(found)return found}}find(document.querySelector('#app').__vue__).newArticle();return true})()");
  await wait(()=>run("!!document.querySelector('.monaco-editor textarea')"));
  await run("(()=>{function find(vm){if(typeof vm.previewPost==='function')return vm;for(const child of vm.$children){const found=find(child);if(found)return found}}const editor=find(document.querySelector('#app').__vue__);editor.form.content='**Bold** :smile:';editor.previewPost();return true})()");
  await wait(()=>run("Array.from(document.querySelectorAll('strong')).some(el=>el.textContent==='Bold' && el.parentElement.textContent.includes('😄'))"));
  assert.equal(await run("window.gridea.localURL('file:///tmp/A%20B.png?v=42')"),'app-media://file/image?path=%2Ftmp%2FA%20B.png&v=42');
  assert.equal(await run("window.gridea.filePath(new File(['test'], 'sample.png'))"),'');
  console.log('PASS packaged Markdown preview, local image URLs and Monaco editor');
  assert.ok(!issues.some(issue=>/SharedArrayBuffer/i.test(JSON.stringify(issue))),JSON.stringify(issues));
  console.log('PASS no SharedArrayBuffer warnings with the sandbox enabled');
  const remote=await run("new Promise(r=>{window.gridea.receive('remote-detected',r,true);window.gridea.send('remote-detect')})");
  assert.equal(remote.success,false);
  assert.match(String(remote.message),/required/);
  console.log('PASS packaged deployment validation without network publishing');

  console.log('MEMORY',JSON.stringify(app.getAppMetrics().map(m=>({type:m.type,workingSetKiB:m.memory.workingSetSize}))));
  clearTimeout(watchdog);app.quit();

 }catch(e){console.error(e);app.exit(1)}
});
`)
 const phases=process.env.GRIDEA_TEST_DRAFT_RECOVERY ? ['write','recover'] : [''];
 for(const phase of phases){
  const result=spawnSync(require(path.join(root,'node_modules/electron')), [harness],{env:{...process.env,GRIDEA_TEST_HOME:temp,GRIDEA_SWITCH_BUILD:build,GRIDEA_DRAFT_TEST_PHASE:phase},encoding:'utf8',timeout:60000});
  console.log((result.stdout||'').split('\n').filter(s=>s.includes('PASS') || s.startsWith('MEMORY')).join('\n'));
  const passed=phase==='write' ? result.signal==='SIGKILL' && (result.stdout||'').includes('snapshots flushed') : result.status===0;
  if(!passed){console.error((result.stdout||'').slice(-6000));console.error((result.stderr||'').slice(-2500));throw Error('Package test failed '+result.status)}
 }
} finally {fs.rmSync(temp,{recursive:true,force:true})}
