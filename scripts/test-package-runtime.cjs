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
 fs.mkdirSync(path.join(temp,'.gridea'))
 fs.writeFileSync(path.join(temp,'.gridea/config.json'),JSON.stringify({sourceFolder:path.join(temp,'A')}))
 const harness=path.join(temp,'main.cjs')
 fs.writeFileSync(harness,`
const {app,BrowserWindow,dialog,Menu,shell}=require('electron'), assert=require('assert/strict');
process.on('uncaughtException',error=>{console.error(error);app.exit(1)});
let target; dialog.showOpenDialog=async options=>{assert.equal(options.defaultPath,process.env.GRIDEA_TEST_HOME);return {canceled:false,filePaths:[target]}};
const watchdog=setTimeout(()=>app.exit(1),45000);
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
if(process.env.GRIDEA_TEST_LOCALIZATION) app.getLocale=()=> process.env.GRIDEA_TEST_SYSTEM_LOCALE || 'fr-CA';
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
   assert.equal(await run("document.querySelector('input[name=currentLanguage]:checked').value"),initialLanguage);
   console.log('PASS first launch follows',systemLocale,'in settings and menu');
   for(const language of languages){
    const key=language[0];
    await run("(()=>{const radio=Array.from(document.querySelectorAll('input[name=currentLanguage]')).find(el=>el.value==="+JSON.stringify(key)+");radio.click();return new Promise(r=>setTimeout(()=>{radio.closest('form').querySelector('button').click();r(true)},0))})()");
    await verify(language);
    console.log('PASS localization',key);
   }
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
    const result=await run("(async()=>{const site=document.querySelector('#app').__vue__.$store.state.site; const config={...site.themeConfig,themeName:"+JSON.stringify(theme)+"};const saved=await new Promise(r=>{window.gridea.receive('theme-saved',r,true);window.gridea.send('theme-save',config)}); if(!saved)throw Error('Theme save failed');await new Promise(r=>{window.gridea.receive('app-site-loaded',r,true);window.gridea.send('app-site-reload',{})});return await new Promise(r=>{window.gridea.receive('html-rendered',()=>r(true),true);window.gridea.send('html-render')})})()");
    assert.equal(result,true);console.log('PASS packaged theme generation',theme);
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
 const result=spawnSync(require(path.join(root,'node_modules/electron')), [harness],{env:{...process.env,GRIDEA_TEST_HOME:temp,GRIDEA_SWITCH_BUILD:build},encoding:'utf8',timeout:60000})
 console.log((result.stdout||'').split('\n').filter(s=>s.includes('PASS') || s.startsWith('MEMORY')).join('\n'))
 if(result.status!==0){console.error((result.stdout||'').slice(-6000));console.error((result.stderr||'').slice(-2500));throw Error('Switch test failed '+result.status)}
} finally {fs.rmSync(temp,{recursive:true,force:true})}
