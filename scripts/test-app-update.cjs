const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript')
let request
const axios = { get: (...args) => request(...args) }
const exportsObject = {}
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/helpers/app-update.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText, {
 exports: exportsObject, require: name => { assert.equal(name,'axios'); return axios }
})
const {parseVersion,compareVersions,selectUpdate,checkForUpdate,releasesAPI,isUpdateRateLimited} = exportsObject
const release = (tag, extra={}) => ({ tag_name:tag, body:'- Update', assets:[{name:`Gridea-for-ARM64-${tag.replace(/^v/,'')}.zip`}], ...extra })
const v = tag => parseVersion(tag)
assert.equal(isUpdateRateLimited({response:{status:403,data:{message:'Forbidden'}}}),false)
assert.equal(isUpdateRateLimited({response:{status:403,headers:{'x-ratelimit-remaining':'0'}}}),true)
assert.equal(isUpdateRateLimited({response:{status:403,data:{message:'API rate limit exceeded'}}}),true)
assert.equal(isUpdateRateLimited({response:{status:429}}),true)
assert.equal(isUpdateRateLimited({response:{status:500}}),false)
assert.equal(isUpdateRateLimited(Error('network')),false)

assert.ok(compareVersions(v('v0.9.3-arm64.1.beta.10'),v('0.9.3-arm64.1.beta.9'))>0)
assert.ok(compareVersions(v('v0.9.3-arm64.1.beta.6.1'),v('0.9.3-arm64.1.beta.6'))>0)
assert.ok(compareVersions(v('v0.9.3-arm64.1'),v('0.9.3-arm64.1.beta.99'))>0)
assert.ok(compareVersions(v('v0.9.3-arm64.2.beta.1'),v('0.9.3-arm64.1'))>0)
for(const tag of ['v0.9.3','v0.9.3-x64.1.beta.7','v0.9.3-arm64.1.beta.7evil','<script>','0.9.3-arm64.1.beta.99999999999999999999']) assert.equal(v(tag),null)
const candidates=[release('v0.9.3-arm64.1.beta.7'),release('v0.9.3-arm64.1.beta.10'),release('v0.9.3-arm64.1.beta.99',{draft:true}),release('v0.9.3-arm64.1.alpha.100'),release('v0.9.4-arm64.1.beta.1',{assets:[]})]
assert.equal(selectUpdate(candidates,'0.9.3-arm64.1.beta.6').version,'v0.9.3-arm64.1.beta.10')
assert.equal(selectUpdate(candidates,'0.9.3-arm64.1'),null)
assert.equal(selectUpdate([release('v0.9.3-arm64.1.beta.5')],'0.9.3-arm64.1.beta.6'),null)
assert.equal(selectUpdate([release('v0.9.3-arm64.1.beta.6')],'0.9.3-arm64.1.alpha.6').version,'v0.9.3-arm64.1.beta.6')
assert.equal(selectUpdate([release('v0.9.3-arm64.1')],'0.9.3-arm64.1.beta.6').version,'v0.9.3-arm64.1')
assert.equal(selectUpdate(candidates,'0.9.3-arm64.1.beta.6').url,'https://github.com/Gridea-Community/gridea-arm64/releases/tag/v0.9.3-arm64.1.beta.10')
;(async()=>{
 let calls=0
 request=async(url,options)=>{assert.equal(url,releasesAPI);assert.equal(options.timeout,12000);calls++;return {data:options.params.page===1?Array(100).fill(release('v0.9.3-arm64.1.beta.5')):[release('v0.9.3-arm64.1.beta.7')]}}
 assert.equal((await checkForUpdate('0.9.3-arm64.1.beta.6')).version,'v0.9.3-arm64.1.beta.7');assert.equal(calls,2)
 request=async()=>({data:[]});assert.equal(await checkForUpdate('0.9.3-arm64.1.beta.6'),null)
 request=async()=>({data:{message:'rate limit'}});await assert.rejects(checkForUpdate('0.9.3-arm64.1.beta.6'),/Invalid release/)
 request=async()=>{throw Error('timeout')};await assert.rejects(checkForUpdate('0.9.3-arm64.1.beta.6'),/timeout/)
 console.log('PASS ARM64 update version ordering, channels, assets, drafts, pagination, no-update and failure paths')
})().catch(e=>{console.error(e);process.exitCode=1})
