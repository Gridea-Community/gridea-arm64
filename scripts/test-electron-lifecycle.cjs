// macOS integration test: disposable data only, real Electron, no deployment.
const fs = require('fs'), path = require('path'), os = require('os'), { spawnSync } = require('child_process')
const root = path.resolve(__dirname, '..'), temp = fs.mkdtempSync(path.join(os.tmpdir(), 'gridea-lifecycle-'))
try {
 const home = path.join(temp, 'profile'), site = path.join(home, 'Gridea')
 fs.mkdirSync(path.join(home, '.gridea'), { recursive: true })
 fs.cpSync(path.join(root, 'public/default-files'), site, { recursive: true })
 fs.writeFileSync(path.join(home, '.gridea/config.json'), JSON.stringify({ sourceFolder: site }))
 const harness = path.join(temp, 'main.cjs')
 fs.writeFileSync(harness, `
const {app,BrowserWindow,ipcMain}=require('electron'), assert=require('assert/strict');
let done=false;const watchdog=setTimeout(()=>{console.error('Lifecycle runtime timeout');app.exit(1)},30000);
require(process.env.GRIDEA_LIFECYCLE_BUILD);
function loaded(win){return new Promise((resolve,reject)=>{win.webContents.once('did-finish-load',resolve);win.webContents.once('did-fail-load',(_e,code,msg)=>reject(new Error(code+':'+msg)));win.webContents.once('render-process-gone',()=>reject(new Error('Renderer exited')))});}
app.whenReady().then(async()=>{
 try{
  let win=BrowserWindow.getAllWindows()[0];assert.ok(win);await loaded(win);const first=win;
  if(process.env.GRIDEA_INTERACTIVE_TEST){done=true;clearTimeout(watchdog);console.log('PASS real Electron: isolated interactive fixture loaded');return;}
  for(let i=0;i<3;i++){const ready=loaded(win);ipcMain.emit('app-refresh',{sender:win.webContents,senderFrame:win.webContents.mainFrame});await ready;assert.equal(BrowserWindow.getAllWindows().length,1);assert.equal(BrowserWindow.getAllWindows()[0],first);}
  const closed=new Promise(resolve=>win.once('closed',resolve));win.close();await closed;assert.equal(BrowserWindow.getAllWindows().length,0);app.emit('activate');win=BrowserWindow.getAllWindows()[0];assert.ok(win);assert.notEqual(win,first);await loaded(win);
  assert.equal(BrowserWindow.getAllWindows().length,1);done=true;clearTimeout(watchdog);console.log('PASS real Electron: refresh keeps one window, close/reopen loads renderer, quit completes');app.quit();
 }catch(e){console.error(e);app.exit(1)}
});
app.on('will-quit',()=>{if(!done)app.exit(1)});
`)
 const result = spawnSync(require('electron'), [harness], { cwd: root, env: { ...process.env, GRIDEA_TEST_HOME: home, GRIDEA_LIFECYCLE_BUILD: path.join(root, 'dist_electron/bundled/background.js') }, encoding: 'utf8', timeout: process.env.GRIDEA_INTERACTIVE_TEST ? 600000 : 45000 })
 process.stdout.write(result.stdout || ''); process.stderr.write(result.stderr || '')
 if (result.error) throw result.error
 if (result.status !== 0 || !result.stdout.includes('PASS real Electron')) { console.error('Electron lifecycle test failed:', { status: result.status, signal: result.signal }); process.exitCode = 1 }
} finally { fs.rmSync(temp, { recursive: true, force: true }) }
