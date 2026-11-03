const assert = require('node:assert/strict')
const fs = require('fs'), os = require('os'), path = require('path'), ts = require('typescript')
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2019 } }).outputText, file)
const { default: Posts, assertPostName } = require('../src/server/posts.ts')
async function main() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gridea-posts-'))
  try {
    for (const dir of ['config', 'posts', 'post-images']) fs.mkdirSync(path.join(root, dir))
    for (const file of ['setting', 'posts', 'theme']) fs.writeFileSync(path.join(root, 'config', file + '.json'), '{}')
    const posts = new Posts({ appDir: root, db: { setting: { domain: 'https://example.com' } } })
    const post = { fileName: '中文-test', title: 'Test', content: '中文 😀', tags: [], date: '2026-11-02', published: false, hideInList: false, isTop: false, featureImage: {}, featureImagePath: '' }
    const ContentHelper = require('../src/helpers/content-helper.ts').default
    const markdown = require('../src/server/plugins/markdown.ts').default
    const helper = new ContentHelper()
    const local = helper.changeImageUrlDomainToLocal('![](https://example.com/post-images/cover.png)', root + '/with space')
    assert.match(markdown.render(local), /<img/)
    assert.match(helper.changeImageUrlLocalToDomain(local, 'https://example.com'), /https:\/\/example.com\/post-images\/cover.png/)
    assert.ok(await posts.savePostToFile(post))
    assert.match(fs.readFileSync(path.join(root, 'posts/中文-test.md'), 'utf8'), /中文 😀/)
    assert.ok(await posts.savePostToFile({ ...post, deleteFileName: post.fileName }))
    assert.ok(fs.existsSync(path.join(root, 'posts/中文-test.md')))
    for (const name of ['../escape', '/tmp/escape', '..', 'a\\b', 'a\0b']) assert.throws(() => assertPostName(name))
    const image = path.join(root, 'post-images/shared.png'), outside = path.join(root, 'keep.txt')
    fs.writeFileSync(image, 'image'); fs.writeFileSync(outside, 'keep')
    assert.equal(await posts.deletePost({ fileName: post.fileName, data: { feature: 'file://' + image }, content: '![](file://' + outside + ')' }), true)
    assert.ok(fs.existsSync(image)); assert.ok(fs.existsSync(outside))
    assert.equal(await posts.savePostToFile({ ...post, featureImage: { path: path.join(root, 'missing.png'), name: 'missing.png' } }), null)
    console.log('PASS: article persistence, filename boundaries, shared-image retention, save failures')
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
