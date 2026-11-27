const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), os = require('node:os'), http = require('node:http'), ts = require('typescript'), vm = require('node:vm')
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true,target:ts.ScriptTarget.ES2019}}).outputText,file)
const initServer=require('../src/server.ts').default
const express=require('express')
const appExports={}
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/server/app.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true,target:ts.ScriptTarget.ES2019}}).outputText,{exports:appExports,require:name=>name==='express'?express:{}})
const root=fs.mkdtempSync(path.join(os.tmpdir(),'gridea-preview-http-'))
let blocker,service
async function main(){
  blocker=http.createServer((_req,res)=>res.end('occupied'))
  await new Promise((resolve,reject)=>{blocker.once('error',error=>{if(error.code==='EADDRINUSE'){blocker=null;resolve()}else reject(error)});blocker.listen(4000,'127.0.0.1',resolve)})
  for(const name of ['A','B']){
    const dir=path.join(root,name);fs.mkdirSync(dir)
    fs.writeFileSync(path.join(dir,'index.html'),'<h1>Site '+name+'</h1>')
    fs.writeFileSync(path.join(dir,'中文 空格.txt'),'Unicode '+name)
    fs.writeFileSync(path.join(dir,'script.js'),'console.log('+JSON.stringify(name)+')')
    fs.writeFileSync(path.join(dir,'.DS_Store'),'must not serve')
  }
  fs.writeFileSync(path.join(root,'A','only-a.txt'),'A only')
  fs.writeFileSync(path.join(root,'outside.txt'),'outside-secret')
  service=initServer()
  await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('No preview port')),5000);const poll=setInterval(()=>{if(service.app.get('port')){clearTimeout(timeout);clearInterval(poll);resolve()}},20)})
  const port=service.app.get('port');assert.ok(port>4000 && port<=4020)
  assert.equal(service.server.address().address,'127.0.0.1')
  const origin='http://127.0.0.1:'+port
  const routes=service.app.router.stack.length
  const context={previewServer:service.app,buildDir:''}
  const select=name=>{context.buildDir=path.join(root,name);appExports.default.prototype.updateStaticServer.call(context)}
  for(let index=0;index<12;index++){
    const name=index%2?'B':'A';select(name)
    const response=await fetch(origin+'/');assert.equal(response.status,200);assert.equal(await response.text(),'<h1>Site '+name+'</h1>')
    assert.equal(await (await fetch(origin+'/'+encodeURIComponent('中文 空格.txt'))).text(),'Unicode '+name)
    assert.equal((await fetch(origin+'/only-a.txt')).status,name==='A'?200:404)
    assert.equal(service.app.router.stack.length,routes)
  }
  assert.match(await (await fetch('http://localhost:'+port+'/')).text(),/Site B/)
  assert.match((await fetch(origin+'/script.js')).headers.get('content-type'),/(?:java|ecma)script/)
  const head=await fetch(origin+'/',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'')
  const range=await fetch(origin+'/'+encodeURIComponent('中文 空格.txt'),{headers:{Range:'bytes=0-2'}});assert.equal(range.status,206);assert.equal(await range.text(),'Uni')
  assert.equal((await fetch(origin+'/.DS_Store')).status,404)
  assert.equal((await fetch(origin+'/missing')).status,404)
  const traversal=await fetch(origin+'/%2e%2e%2foutside.txt');assert.ok(traversal.status>=400);assert.ok(!(await traversal.text()).includes('outside-secret'))
  const closed=new Promise(resolve=>service.server.once('close',resolve));service.close();await closed
  await assert.rejects(fetch(origin+'/'))
  console.log('PASS Express 5 HTTP: occupied-port fallback, loopback/localhost, 12 root switches without route growth, Unicode files, MIME/HEAD/ranges, hidden/traversal/missing paths and shutdown')
}
main().catch(error=>{console.error(error);process.exitCode=1}).finally(async()=>{service?.close();if(blocker)await new Promise(resolve=>blocker.close(resolve));fs.rmSync(root,{recursive:true,force:true})})
