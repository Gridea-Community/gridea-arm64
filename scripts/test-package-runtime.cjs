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
const {app,BrowserWindow,dialog}=require('electron'), assert=require('assert/strict');
process.on('uncaughtException',error=>{console.error(error);app.exit(1)});
let target; dialog.showOpenDialog=async options=>{assert.equal(options.defaultPath,process.env.GRIDEA_TEST_HOME);return {canceled:false,filePaths:[target]}};
const watchdog=setTimeout(()=>app.exit(1),45000);
require(process.env.GRIDEA_SWITCH_BUILD);
const delay=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{
 try{
  const win=BrowserWindow.getAllWindows()[0];
  const run=s=>win.webContents.executeJavaScript(s);
  const wait=async fn=>{for(let i=0;i<150;i++){try{if(await fn())return}catch{} await delay(100)}throw Error('Timed out waiting for site')};
  await wait(()=>run("document.querySelector('#app')?.__vue__?.$store.state.site.appDir === "+JSON.stringify(process.env.GRIDEA_TEST_HOME+'/A')));
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

  assert.ok((await run("window.gridea.markdown('**Bold** :smile:')")).includes('<strong>Bold</strong>'));
  for(const theme of ['fly','notes','paper','simple']){
    const result=await run("(async()=>{const site=document.querySelector('#app').__vue__.$store.state.site; const config={...site.themeConfig,themeName:"+JSON.stringify(theme)+"};const saved=await new Promise(r=>{window.gridea.receive('theme-saved',r,true);window.gridea.send('theme-save',config)}); if(!saved)throw Error('Theme save failed');await new Promise(r=>{window.gridea.receive('app-site-loaded',r,true);window.gridea.send('app-site-reload',{})});return await new Promise(r=>{window.gridea.receive('html-rendered',()=>r(true),true);window.gridea.send('html-render')})})()");
    assert.equal(result,true);console.log('PASS packaged theme generation',theme);
  }
  await run("document.querySelector('#app').__vue__.$router.push('/articles').then(()=>true,()=>true)");
  await run("(()=>{function find(vm){if(typeof vm.newArticle==='function')return vm;for(const child of vm.$children){const found=find(child);if(found)return found}}find(document.querySelector('#app').__vue__).newArticle();return true})()");
  await wait(()=>run("!!document.querySelector('.monaco-editor textarea')"));
  console.log('PASS packaged Markdown preload and Monaco editor');
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
