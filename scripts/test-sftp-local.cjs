// Real SSH/SFTP traffic over loopback; every remote path maps to a disposable directory.
const assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path')
const crypto = require('node:crypto'), { spawnSync } = require('node:child_process'), ts = require('typescript')
const { Server, utils } = require('ssh2')
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true,target:ts.ScriptTarget.ES2019}}).outputText,file)
const Deploy = require('../src/server/plugins/deploys/sftp.ts').default
const root = fs.mkdtempSync(path.join(os.tmpdir(),'gridea-sftp-update-')), remote = path.join(root,'remote')
fs.mkdirSync(remote)
const hostKey = crypto.generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs1',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}}).privateKey
const userKey = crypto.generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs1',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}}).privateKey
const parsedKey = utils.parseKey(userKey), keyFile=path.join(root,'fixture-key'); fs.writeFileSync(keyFile,userKey,{mode:0o600})
const clients = new Set(), commands=[]
let failUploads=false, failCleanup=false, connections=0
function local(p) {
 const normalized=path.posix.resolve('/',p)
 const target=path.join(remote,normalized.slice(1))
 assert.ok(target===remote || target.startsWith(remote+path.sep))
 return target
}
function attrs(stat) { return {mode:stat.mode,uid:stat.uid,gid:stat.gid,size:stat.size,atime:Math.floor(stat.atimeMs/1000),mtime:Math.floor(stat.mtimeMs/1000)} }
const server = new Server({hostKeys:[hostKey]},client=>{
 connections++; clients.add(client);client.on('close',()=>clients.delete(client));client.on('error',()=>{})
 client.on('authentication',ctx=>{
  if(ctx.username!=='fixture')return ctx.reject()
  if(ctx.method==='password' && ctx.password==='fixture-password')return ctx.accept()
  if(ctx.method==='publickey' && ctx.key.data.equals(parsedKey.getPublicSSH()) && (!ctx.signature || parsedKey.verify(ctx.blob,ctx.signature,ctx.hashAlgo)===true))return ctx.accept()
  ctx.reject()
 })
 client.on('ready',()=>client.on('session',accept=>{
  const session=accept()
  session.on('exec',(accept,_reject,info)=>{
   const stream=accept()
   try {
    assert.ok(info.command.startsWith('rm '))
    // Decode the command's arguments without ever executing rm. A quoting regression
    // can only create the controlled marker inside this temporary fixture directory.
    const decoded=spawnSync('/bin/sh',['-c','set -- '+info.command.slice(3)+'; printf \'%s\\0\' "$@"'],{cwd:root,encoding:'utf8'})
    assert.equal(decoded.status,0)
    const args=decoded.stdout.split('\0').slice(0,-1)
    assert.equal(args[0],'-rf');assert.equal(args[1],'--');assert.equal(args.length,3)
    assert.equal(fs.existsSync(path.join(root,'marker')),false)
    commands.push(args[2])
    if(failCleanup){stream.stderr.write('simulated cleanup denied');stream.exit(1)}
    else{assert.notEqual(local(args[2]),remote);fs.rmSync(local(args[2]),{recursive:true,force:true});stream.exit(0)}
   }catch(error){stream.stderr.write(String(error));stream.exit(1)}
   stream.end()
  })
  session.on('sftp',accept=>{
   const s=accept(),handles=new Map();let next=0
   const sendError=(id,error)=>s.status(id,error.code==='ENOENT'?2:error.code==='EACCES'?3:4)
   const handler=(event,fn)=>s.on(event,(id,...args)=>{try{fn(id,...args)}catch(error){sendError(id,error)}})
   const handle=item=>{const b=Buffer.alloc(4);b.writeUInt32BE(++next);handles.set(next,item);return b}
   const get=b=>{const h=handles.get(b.readUInt32BE());assert.ok(h);return h}
   handler('REALPATH',(id,p)=>s.name(id,[{filename:path.posix.resolve('/',p),longname:p,attrs:{}}]))
   for(const event of ['STAT','LSTAT'])handler(event,(id,p)=>s.attrs(id,attrs(event==='LSTAT'?fs.lstatSync(local(p)):fs.statSync(local(p)))))
   handler('FSTAT',(id,b)=>s.attrs(id,attrs(fs.fstatSync(get(b).fd))))
   handler('OPENDIR',(id,p)=>s.handle(id,handle({dir:local(p),sent:false})))
   handler('READDIR',(id,b)=>{const h=get(b);if(h.sent)return s.status(id,1);h.sent=true;const entries=fs.readdirSync(h.dir).map(name=>({filename:name,longname:name,attrs:attrs(fs.statSync(path.join(h.dir,name)))}));entries.length?s.name(id,entries):s.status(id,1)})
   handler('OPEN',(id,p,flags)=>{if(failUploads && p.endsWith('/fail.txt'))return s.status(id,3);s.handle(id,handle({fd:fs.openSync(local(p),utils.sftp.flagsToString(flags))}))})
   handler('WRITE',(id,b,offset,data)=>{fs.writeSync(get(b).fd,data,0,data.length,offset);s.status(id,0)})
   handler('READ',(id,b,offset,length)=>{const data=Buffer.alloc(length),n=fs.readSync(get(b).fd,data,0,length,offset);n?s.data(id,data.subarray(0,n)):s.status(id,1)})
   handler('CLOSE',(id,b)=>{const h=get(b);if(h.fd!==undefined)fs.closeSync(h.fd);handles.delete(b.readUInt32BE());s.status(id,0)})
   handler('MKDIR',(id,p)=>{fs.mkdirSync(local(p));s.status(id,0)})
   handler('REMOVE',(id,p)=>{fs.unlinkSync(local(p));s.status(id,0)})
   handler('RMDIR',(id,p)=>{fs.rmdirSync(local(p));s.status(id,0)})
   handler('SETSTAT',id=>s.status(id,0));handler('FSETSTAT',id=>s.status(id,0))
   s.on('close',()=>{for(const h of handles.values())if(h.fd!==undefined)try{fs.closeSync(h.fd)}catch{};handles.clear()})
  })
 }))
})
const watchdog=setTimeout(()=>{console.error('Local SFTP regression timed out');process.exit(1)},45000)
;(async()=>{
 try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)})
  const appDir=path.join(root,'site'),buildDir=path.join(root,'output');fs.mkdirSync(path.join(appDir,'config'),{recursive:true});fs.mkdirSync(path.join(buildDir,'assets'),{recursive:true})
  for(const name of ['setting','posts','theme'])fs.writeFileSync(path.join(appDir,'config',name+'.json'),'{}')
  fs.writeFileSync(path.join(buildDir,'index.html'),'<h1>Fixture 中文</h1>');fs.writeFileSync(path.join(buildDir,'assets','中文 图.png'),Buffer.from([0,1,2,255]));fs.writeFileSync(path.join(buildDir,'.hidden'),'not uploaded');fs.mkdirSync(path.join(buildDir,'node_modules'));fs.writeFileSync(path.join(buildDir,'node_modules','excluded'),'not uploaded')
  const setting={server:'127.0.0.1',port:server.address().port,username:'fixture',password:'fixture-password',remotePath:'/site with spaces'}
  fs.mkdirSync(local(setting.remotePath));fs.writeFileSync(path.join(local(setting.remotePath),'stale.html'),'old')
  fs.writeFileSync(path.join(appDir,'gridea.txt'),'keep local');fs.writeFileSync(path.join(local(setting.remotePath),'gridea.txt'),'keep remote')
  const deploy=new Deploy({appDir,buildDir,db:{setting}})
  let result=await deploy.remoteDetect();assert.equal(result.success,true,result.message);assert.equal(fs.readFileSync(path.join(appDir,'gridea.txt'),'utf8'),'keep local');assert.equal(fs.readFileSync(path.join(local(setting.remotePath),'gridea.txt'),'utf8'),'keep remote');assert.ok(!fs.readdirSync(appDir).some(name=>name.startsWith('gridea-test-')));assert.ok(!fs.readdirSync(local(setting.remotePath)).some(name=>name.startsWith('gridea-test-')))
  result=await deploy.publish();assert.equal(result.success,true,result.message);assert.equal(commands.at(-1),setting.remotePath)
  assert.equal(fs.readFileSync(path.join(local(setting.remotePath),'index.html'),'utf8'),'<h1>Fixture 中文</h1>');assert.deepEqual(fs.readFileSync(path.join(local(setting.remotePath),'assets','中文 图.png')),Buffer.from([0,1,2,255]));assert.equal(fs.existsSync(path.join(local(setting.remotePath),'stale.html')),false);assert.equal(fs.existsSync(path.join(local(setting.remotePath),'.hidden')),false);assert.equal(fs.existsSync(path.join(local(setting.remotePath),'node_modules')),false)
  console.log('PASS real loopback SFTP: password detection, recursive publication, Unicode/images, excluded files and spaced paths')
  setting.remotePath="/site's space; touch marker";setting.privateKey=keyFile
  result=await deploy.publish();assert.equal(result.success,true,result.message);assert.equal(commands.at(-1),setting.remotePath);assert.equal(fs.existsSync(path.join(root,'marker')),false)
  console.log('PASS private-key connection and literal shell metacharacters in the site path')
  delete setting.privateKey
  const connected=connections
  for(const invalid of ['', '/', '.', '..', 'a/..', '~']){setting.remotePath=invalid;result=await deploy.publish();assert.equal(result.success,false)}
  assert.equal(connections,connected)
  setting.remotePath='/site with spaces';failCleanup=true;result=await deploy.publish();assert.equal(result.success,false);assert.match(result.message,/cleanup denied/);failCleanup=false
  failUploads=true;fs.writeFileSync(path.join(buildDir,'fail.txt'),'must fail');result=await deploy.publish();assert.equal(result.success,false);assert.ok(result.message);failUploads=false;fs.unlinkSync(path.join(buildDir,'fail.txt'))
  setting.privateKey=path.join(root,'missing-key');result=await deploy.publish();assert.equal(result.success,false);delete setting.privateKey
  setting.password='wrong';result=await deploy.publish();assert.equal(result.success,false)
  console.log('PASS invalid destinations, failed cleanup, partial upload, missing key and authentication failure do not report success')
 }finally{
  for(const c of clients)c.end()
  await new Promise(resolve=>server.close(resolve))
  fs.rmSync(root,{recursive:true,force:true});clearTimeout(watchdog)
 }
})().catch(error=>{console.error(error);process.exitCode=1})
