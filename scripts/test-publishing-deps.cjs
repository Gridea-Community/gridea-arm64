const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), os = require('node:os'), ts = require('typescript')
const { JSDOM } = require('jsdom')
require.extensions['.ts'] = (module,file) => module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true,target:ts.ScriptTarget.ES2019}}).outputText,file)
const join = require('../src/helpers/url-join.ts').default
const { isNotJunk } = require('junk')
const baseline = require('./fixtures/url-junk-compat.json')
for (const {args,expected} of baseline.paths) assert.equal(join(...args),expected,JSON.stringify(args))
// The new filter also ignores lowercase Windows desktop.ini metadata.
for (const {name,keep} of baseline.files) assert.equal(isNotJunk(name),name === 'desktop.ini' ? false : keep,name)

const Renderer = require('../src/server/renderer.ts').default
const temp = fs.mkdtempSync(path.join(os.tmpdir(),'gridea-feed-'))
async function main() {
  const full = '<p>Full body 中文 &amp; details</p>'
  const abstract = '<p>Summary &amp; excerpt</p>'
  const makePost = (name,hideInList=false) => ({title:name,link:join('https://example.test/blog/','post',encodeURIComponent(name),'/'),abstract,content:full,feature:'',date:'2026-01-02T03:04:05Z',hideInList})
  const config={siteName:'Site 中文 & <test>',siteDescription:'Description & <markup>',domain:'https://example.test/blog/',feedCount:1,feedFullText:true}
  const context={db:{themeConfig:config},outputDir:temp,postsData:[makePost('Hidden',true),makePost('A 中文'),makePost('B')]}
  await Renderer.prototype.buildFeed.call(context)
  const read=()=>new JSDOM(fs.readFileSync(path.join(temp,'atom.xml'),'utf8'),{contentType:'application/xml'}).window.document
  let doc=read(), entries=[...doc.getElementsByTagName('entry')]
  assert.equal(doc.documentElement.namespaceURI,'http://www.w3.org/2005/Atom')
  assert.equal(doc.documentElement.querySelector('title').textContent,config.siteName)
  assert.equal(doc.querySelector('link[rel=self]').getAttribute('href'),'https://example.test/blog/atom.xml')
  assert.equal(entries.length,1)
  assert.equal(entries[0].querySelector('title').textContent,'A 中文')
  assert.equal(entries[0].querySelector('link').getAttribute('href'),context.postsData[1].link)
  assert.equal(entries[0].querySelector('content').textContent,full)
  assert.equal(entries[0].querySelector('summary').textContent,abstract)
  assert.equal(entries[0].querySelector('updated').textContent,'2026-01-02T03:04:05.000Z')
  config.feedFullText=false;config.feedCount=2
  await Renderer.prototype.buildFeed.call(context)
  doc=read();entries=[...doc.getElementsByTagName('entry')]
  assert.deepEqual(entries.map(entry=>entry.querySelector('title').textContent),['A 中文','B'])
  assert.ok(entries.every(entry=>entry.querySelector('content').textContent===abstract))
  console.log('PASS publishing dependencies: legacy URL/path and junk filtering, valid Atom XML, Unicode/escaping, hidden posts, feed count, full text/excerpts and links')
}
main().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>fs.rmSync(temp,{recursive:true,force:true}))
