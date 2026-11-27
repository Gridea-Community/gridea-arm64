import * as fs from 'fs'
import path from 'node:path'
import urlJoin from '../helpers/url-join'
import Bluebird from 'bluebird'
import * as fse from 'fs-extra'
import ejs from 'ejs'
import moment from 'moment'
import less from 'less'
import { Feed } from 'feed'
import { isNotJunk } from 'junk'
import { wordCount, timeCalc } from '../helpers/words-count'
import Model from './model'
import ContentHelper from '../helpers/content-helper'
import { formatThemeCustomConfigToRender } from '../helpers/utils'
import {
  IPostDb, IPostRenderData, ITagRenderData, ISiteTagsData,
} from './interfaces/post'
import { ITag } from './interfaces/tag'
import { DEFAULT_POST_PAGE_SIZE, DEFAULT_ARCHIVES_PAGE_SIZE } from '../helpers/constants'
import markdown from './plugins/markdown'
import { IMenu } from './interfaces/menu'

Bluebird.promisifyAll(fs)
const helper = new ContentHelper()

export default class Renderer extends Model {
  outputDir: string = this.buildDir

  themePath: string = ''

  postsData: IPostRenderData[] = []

  tagsData: ISiteTagsData[] = []

  menuData: IMenu[] = []

  siteData: any = {}

  utils: any = {}

  constructor(appInstance: any) {
    super(appInstance)
    this.loadConfig()

    this.utils.now = Date.now()
    this.utils.moment = moment
  }

  private katexAssetsReady: Promise<void> | null = null

  private async updateKatexStyles(html: string) {
    // Older and already-installed themes reference a different KaTeX version.
    // Use the renderer's own CSS/fonts without changing the user's theme files.
    let changed = false
    const stylesheet = urlJoin(this.db.themeConfig.domain, 'assets/gridea-katex/katex.min.css')
      .replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!))
    let updated = html.replace(/<link\b[^>]*>/gi, tag => {
      const href = tag.match(/\shref\s*=\s*(["'])([^"']+)\1/i)
      if (!href || !/^(?:https?:)?\/\/(?:cdnjs\.cloudflare\.com\/ajax\/libs\/KaTeX\/[^/]+\/|(?:cdn\.jsdelivr\.net\/npm\/|unpkg\.com\/)katex@[^/]+\/dist\/)katex(?:\.min)?\.css(?:[?#].*)?$/i.test(href[2])) return tag
      changed = true
      return tag.replace(href[2], stylesheet).replace(/\s+integrity\s*=\s*(["'])[^"']*\1/gi, '')
    })
    // Some themes only load math CSS on their homepage, although posts contain formulas.
    if (!changed && /class=["'][^"']*\bkatex(?:[\s"'-])/.test(html) && /<\/head\s*>/i.test(html)) {
      updated = html.replace(/<\/head\s*>/i, `<link rel="stylesheet" href="${stylesheet}">\n</head>`)
      changed = true
    }
    if (!changed) return html
    if (!this.katexAssetsReady) {
      this.katexAssetsReady = (async () => {
        const pluginDirectory = path.dirname(__non_webpack_require__.resolve('@iktakahiro/markdown-it-katex'))
        const dist = path.dirname(__non_webpack_require__.resolve('katex', { paths: [pluginDirectory] }))
        const destination = path.join(this.outputDir, 'assets/gridea-katex')
        await fse.copy(path.join(dist, 'katex.min.css'), path.join(destination, 'katex.min.css'))
        await fse.copy(path.join(dist, 'fonts'), path.join(destination, 'fonts'))
      })()
    }
    await this.katexAssetsReady
    return updated
  }

  private async renderTemplate(file: string, data: Record<string, unknown>) {
    try {
      return await this.updateKatexStyles(await ejs.renderFile(file, data))
    } catch (error) {
      const diagnostic = error as { path?: string, message?: string }
      const location = diagnostic.path || file
      const message = diagnostic.message || String(error)
      const detail = message.startsWith(location) ? message : `${location}\n${message}`
      if (error instanceof ReferenceError) {
        error.message = detail
        throw error
      }
      throw new Error(detail)
    }
  }

  async preview(port: number) {
    this.db.themeConfig.domain = `http://localhost:${port}`
    await this.renderAll()
  }

  async renderAll() {
    this.katexAssetsReady = null
    await this.clearOutputFolder()
    await this.formatDataForRender()
    await this.buildCss()

    // Render post list page
    await this.renderPostList('')

    // Render archives page
    await this.renderPostList(urlJoin('/', this.db.themeConfig.archivesPath))
    // Render tag list page
    await this.renderTags()
    await this.renderPostDetail()
    await this.renderTagDetail()

    // Need before `renderCustomPage`, because maybe theme custom page include a `404 page`
    await this.copyFiles()

    // Render custom page
    await this.renderCustomPage()

    await this.buildCname()

    await this.buildFeed()
  }

  /**
   * Load Config
   */
  async loadConfig() {
    this.themePath = urlJoin(this.appDir, 'themes', this.db.themeConfig.themeName)

    fse.ensureDirSync(urlJoin(this.outputDir))
  }

  /**
   * Format data for rendering pages
   */
  public formatDataForRender(): any {
    const { themeConfig } = this.db

    this.postsData = this.db.posts.filter((item: IPostDb) => item.data.published)
      .map((item: IPostDb) => {
        const currentTags = item.data.tags || []
        let toc = ''
        const content = markdown.render(helper.changeImageUrlLocalToDomain(item.content, themeConfig.domain), {
          tocCallback(tocMarkdown: any, tocArray: any, tocHtml: any) {
            toc = tocHtml
          },
        })

        let words = 0
        wordCount(content, (count: number) => {
          words = count
        })

        const reading = timeCalc(content)

        const stats = {
          text: `${reading.minius} min read`,
          time: reading.second * 1000, // ms
          words,
          minutes: reading.minius,
        }

        const result: IPostRenderData = {
          content,
          fileName: item.fileName,
          abstract: markdown.render(helper.changeImageUrlLocalToDomain(item.abstract, themeConfig.domain)),
          title: item.data.title,
          tags: this.db.tags
            .filter((tag: ITag) => currentTags.find(i => i === tag.name))
            .map((tag: ITag) => ({ ...tag, link: urlJoin(themeConfig.domain, themeConfig.tagPath, `${tag.slug}`, '/') })),
          date: item.data.date,
          dateFormat: (themeConfig.dateFormat && moment(item.data.date).format(themeConfig.dateFormat)) || item.data.date,
          feature: item.data.feature && !item.data.feature.includes('http')
            ? `${helper.changeFeatureImageUrlLocalToDomain(item.data.feature, themeConfig.domain)}`
            : item.data.feature || '',
          link: urlJoin(themeConfig.domain, themeConfig.postPath, item.fileName, '/'),
          hideInList: !!item.data.hideInList,
          isTop: !!item.data.isTop,
          stats,
          description: `${content.replace(/<[^>]*>/g, '').substring(0, 120)}${content[121] ? '...' : ''}`,
        }

        result.toc = toc
        return result
      })
      .sort((a: IPostRenderData, b: IPostRenderData) => moment(b.date).unix() - moment(a.date).unix())


    this.tagsData = []
    this.postsData.forEach((item: IPostRenderData) => {
      if (!item.hideInList) {
        item.tags.forEach((tag: ITagRenderData) => {
          const foundTag = this.tagsData.find((t: ITagRenderData) => t.link === tag.link)
          if (!foundTag) {
            this.tagsData.push({
              ...tag,
              count: 1,
            })
          } else {
            foundTag.count += 1
          }
        })
      }
    })

    this.menuData = this.db.menus.map((menu: IMenu) => {
      let link = menu.link.replace(this.db.setting.domain, this.db.themeConfig.domain)

      const isSiteLink = menu.link.includes(this.db.setting.domain)
      if (isSiteLink) {
        link = `${link}`
      }

      return {
        ...menu,
        link,
      }
    })

    this.siteData = {
      posts: this.postsData,
      tags: this.tagsData,
      menus: this.menuData,
      themeConfig: this.db.themeConfig,
      customConfig: formatThemeCustomConfigToRender(this.db.themeCustomConfig, this.db.currentThemeConfig),
      utils: this.utils,
      isHomepage: false,
    }
  }

  /**
   * Render the article list, excluding hidden articles.
   * if extraPath exist, render archive template, if not render index template
   */
  public async renderPostList(archivePath: string) {
    const { postPageSize, archivesPageSize, domain } = this.db.themeConfig

    // Compatible: < v0.7.0
    const pageSize = archivePath
      ? archivesPageSize || DEFAULT_ARCHIVES_PAGE_SIZE
      : postPageSize || DEFAULT_POST_PAGE_SIZE

    let excludeHidePostsData = this.postsData.filter((item: IPostRenderData) => !item.hideInList)

    const renderTemplatePath = urlJoin(this.themePath, 'templates', `${archivePath ? 'archives.ejs' : 'index.ejs'}`)

    // If it is not archives, sort by `isTop` then to render
    if (!archivePath) {
      const isTopPosts = excludeHidePostsData.filter((item: IPostRenderData) => item.isTop)
      const notTopPosts = excludeHidePostsData.filter((item: IPostRenderData) => !item.isTop)
      excludeHidePostsData = isTopPosts.concat(notTopPosts)
    }

    const renderData = {
      menus: this.menuData,
      posts: [] as IPostRenderData[],
      pagination: {
        prev: '',
        next: '',
      },
      themeConfig: this.db.themeConfig,
      site: this.siteData,
    }

    const outputFolder = urlJoin(this.outputDir, archivePath)
    let renderPath = urlJoin(outputFolder, 'index.html')

    // If there is no article to render
    if (!excludeHidePostsData.length) {
      renderData.site.isHomepage = !archivePath

      fse.ensureDirSync(outputFolder)
      const html = await this.renderTemplate(renderTemplatePath, renderData)
      fs.writeFileSync(renderPath, html)
      return
    }

    for (let i = 0; i * pageSize < excludeHidePostsData.length; i += 1) {
      renderData.posts = excludeHidePostsData.slice(i * pageSize, (i + 1) * pageSize)
      renderData.site.isHomepage = !archivePath && !i

      if (i === 0 && excludeHidePostsData.length > pageSize) {
        fse.ensureDirSync(urlJoin(this.outputDir, archivePath, 'page'))

        renderData.pagination.next = urlJoin(domain, archivePath, 'page', '2')
      } else if (i > 0 && excludeHidePostsData.length > pageSize) {
        fse.ensureDirSync(urlJoin(this.outputDir, archivePath, 'page', `${i + 1}`))

        renderPath = urlJoin(this.outputDir, archivePath, 'page', `${i + 1}`, 'index.html')

        renderData.pagination.prev = i === 1
          ? urlJoin(domain, archivePath, '/')
          : urlJoin(domain, archivePath, 'page', `${i}/`)

        renderData.pagination.next = (i + 1) * pageSize < excludeHidePostsData.length
          ? urlJoin(domain, archivePath, 'page', `${i + 2}/`)
          : ''
      } else {
        fse.ensureDirSync(urlJoin(this.outputDir, archivePath))
      }

      const html = await this.renderTemplate(renderTemplatePath, renderData)

      console.log('👏  PostList Page:', renderPath)
      fs.writeFileSync(renderPath, html)
    }
  }

  /**
   * Render the article details page, including hidden articles.
   */
  async renderPostDetail() {
    for (let i = 0; i < this.postsData.length; i += 1) {
      const post: IPostRenderData = { ...this.postsData[i] }

      if (!post.hideInList) {
        if (i < this.postsData.length - 1) {
          const nexPost = this.postsData.slice(i + 1, this.postsData.length).find((item: IPostRenderData) => !item.hideInList)
          if (nexPost) {
            post.nextPost = nexPost
          }
        }
        if (i > 0) {
          const prevPost = this.postsData.slice(0, i).reverse().find((item: IPostRenderData) => !item.hideInList)
          if (prevPost) {
            post.prevPost = prevPost
          }
        }
      }


      const renderData = {
        menus: this.menuData,
        post,
        themeConfig: this.db.themeConfig,
        commentSetting: this.db.commentSetting,
        site: this.siteData,
      }
      const html = await this.renderTemplate(urlJoin(this.themePath, 'templates', 'post.ejs'), renderData)

      const renderFolerPath = urlJoin(this.outputDir, `${this.db.themeConfig.postPath}`, post.fileName)
      fse.ensureDirSync(renderFolerPath)
      fs.writeFileSync(urlJoin(renderFolerPath, 'index.html'), html)
    }
  }

  /**
   * Render tags page
   */
  async renderTags() {
    const tagsFolder = urlJoin(this.outputDir, 'tags')
    const renderPath = urlJoin(tagsFolder, 'index.html')
    const renderData = {
      tags: this.tagsData,
      menus: this.menuData,
      themeConfig: this.db.themeConfig,
      site: this.siteData,
    }
    fse.ensureDirSync(tagsFolder)
    const html = await this.renderTemplate(urlJoin(this.themePath, 'templates', 'tags.ejs'), renderData)
    console.log('👏  Tags Page:', renderPath)
    fs.writeFileSync(renderPath, html)
  }

  /**
   * Render tag detail page
   */
  async renderTagDetail() {
    const usedTags = this.db.tags.filter((tag: ITag) => tag.used)
    const { postPageSize, domain, tagPath } = this.db.themeConfig

    // Compatible: < v0.7.0
    const pageSize = postPageSize || DEFAULT_POST_PAGE_SIZE

    for (const usedTag of usedTags) {
      const posts = this.postsData.filter((post: IPostRenderData) => {
        return post.tags.find((tag: ITagRenderData) => tag.slug === usedTag.slug)
      })

      const currentTag = usedTag

      const tagFolderPath = urlJoin(this.outputDir, tagPath, `${currentTag.slug}`)
      const tagDomainPath = urlJoin(domain, tagPath, `${currentTag.slug}`)
      fse.ensureDirSync(tagFolderPath)

      for (let i = 0; i * pageSize < posts.length; i += 1) {
        const renderData = {
          tag: currentTag,
          menus: this.menuData,
          posts: posts.slice(i * pageSize, (i + 1) * pageSize),
          pagination: {
            prev: '',
            next: '',
          },
          themeConfig: this.db.themeConfig,
          site: this.siteData,
        }

        // Paging
        let renderPath = urlJoin(tagFolderPath, 'index.html')

        if (i === 0 && posts.length > pageSize) {
          fse.ensureDirSync(urlJoin(tagFolderPath, 'page'))

          renderData.pagination.next = urlJoin(tagDomainPath, 'page', '2')
        } else if (i > 0 && posts.length > pageSize) {
          fse.ensureDirSync(urlJoin(tagFolderPath, 'page', `${i + 1}`))

          renderPath = urlJoin(tagFolderPath, 'page', `${i + 1}`, 'index.html')

          renderData.pagination.prev = i === 1
            ? tagDomainPath
            : urlJoin(tagDomainPath, 'page', `${i}/`)

          renderData.pagination.next = (i + 1) * pageSize < posts.length
            ? urlJoin(tagDomainPath, 'page', `${i + 2}/`)
            : ''
        }

        const html = await this.renderTemplate(urlJoin(this.themePath, 'templates', 'tag.ejs'), renderData)
        console.log('👏  Tag Page:', renderPath)
        fs.writeFileSync(renderPath, html)
      }
    }
  }

  /**
   * Render custom page, eg. friends.ejs, about.ejs, home.ejs, projects.ejs...
   */
  async renderCustomPage() {
    const files = fse.readdirSync(urlJoin(this.themePath, 'templates'), { withFileTypes: true })
    const customTemplates = files
      .filter(item => !item.isDirectory())
      .map(item => item.name)
      .filter(isNotJunk)
      .filter((name: string) => {
        return ![
          'index.ejs',
          'post.ejs',
          'tag.ejs',
          'tags.ejs',
          'archives.ejs',
          // 👇 Gridea protected word, because these filename is gridea folder's name
          'images.ejs',
          'media.ejs',
          'post-images.ejs',
          'styles.ejs',
          'tag.ejs',
          'tags.ejs',
        ].includes(name)
      })
    
    const renderData = {
      menus: this.menuData,
      themeConfig: this.db.themeConfig,
      commentSetting: this.db.commentSetting,
      site: this.siteData,
    }

    for (const name of customTemplates) {
      let renderFolder = urlJoin(this.outputDir, name.substring(0, name.length - 4))
      let renderPath = urlJoin(renderFolder, 'index.html')

      if (name === '404.ejs') {
        renderFolder = this.outputDir
        renderPath = urlJoin(renderFolder, '404.html')
      }

      fse.ensureDirSync(renderFolder)
      const html = await this.renderTemplate(urlJoin(this.themePath, 'templates', name), renderData)
      fse.writeFileSync(renderPath, html)
      console.log('✅ Render custom page success', renderPath)
    }
  }

  /**
   * Build CSS and write file
   */
  async buildCss() {
    const lessFilePath = urlJoin(this.themePath, 'assets', 'styles', 'main.less')
    const cssFolderPath = urlJoin(this.outputDir, 'styles')

    fse.ensureDirSync(cssFolderPath)

    const lessString = fs.readFileSync(lessFilePath, 'utf8')
    let css: string
    try {
      css = (await less.render(lessString, { filename: lessFilePath })).css
    } catch (error) {
      const diagnostic = error as { filename?: string, line?: number, message?: string }
      const location = diagnostic.filename || lessFilePath
      const line = diagnostic.line ? `:${diagnostic.line}` : ''
      throw new Error(`${location}${line}\n${diagnostic.message || String(error)}`)
    }
    const styleOverridePath = urlJoin(this.themePath, 'style-override.js')
    if (await fse.pathExists(styleOverridePath)) {
      delete __non_webpack_require__.cache[__non_webpack_require__.resolve(styleOverridePath)]
      const generateOverride = __non_webpack_require__(styleOverridePath)
      css += generateOverride(this.db.themeCustomConfig)
    }
    await fse.writeFile(urlJoin(cssFolderPath, 'main.css'), css)
    return true
  }

  /**
   * Create CNAME file
   */
  async buildCname() {
    const cnamePath = urlJoin(this.outputDir, 'CNAME')

    if (this.db.setting.cname) {
      fs.writeFileSync(cnamePath, this.db.setting.cname)
    } else {
      fse.removeSync(cnamePath)
    }
  }

  /**
   * Build Feed
   */
  async buildFeed() {
    const DEFAULT_FEED_COUNT = 10
    const feedFilename = 'atom.xml'
    const { themeConfig } = this.db

    const feed = new Feed({
      title: themeConfig.siteName,
      description: themeConfig.siteDescription,
      id: themeConfig.domain,
      link: themeConfig.domain,
      image: urlJoin(themeConfig.domain, 'images', 'avatar.png'),
      favicon: urlJoin(themeConfig.domain, 'favicon.ico'),
      copyright: `All rights reserved ${(new Date()).getFullYear()}, ${themeConfig.siteName}`,
      feedLinks: {
        atom: urlJoin(themeConfig.domain, feedFilename),
      },
    })

    const postsData = this.postsData
      .filter((item: IPostRenderData) => !item.hideInList)
      .slice(0, themeConfig.feedCount || DEFAULT_FEED_COUNT)

    const feedFullText = (typeof themeConfig.feedFullText) === 'undefined' ? true : themeConfig.feedFullText

    postsData.forEach((post: IPostRenderData) => {
      feed.addItem({
        title: post.title,
        id: post.link,
        link: post.link,
        description: post.abstract,
        content: feedFullText ? post.content : post.abstract,
        image: post.feature,
        date: new Date(post.date),
      })
    })

    fs.writeFileSync(urlJoin(this.outputDir, feedFilename), feed.atom1())
  }

  /**
   * Copy file to output folder
   */
  async copyFiles() {
    const postImageInputPath = urlJoin(this.appDir, 'post-images')
    const postImageOutputPath = urlJoin(this.outputDir, 'post-images')

    fse.ensureDirSync(postImageOutputPath)
    fse.copySync(postImageInputPath, postImageOutputPath)

    const imagesInputPath = urlJoin(this.appDir, 'images')
    const imagesOutputPath = urlJoin(this.outputDir, 'images')

    fse.ensureDirSync(imagesOutputPath)
    fse.copySync(imagesInputPath, imagesOutputPath)

    const mediaInputPath = urlJoin(this.themePath, 'assets', 'media')
    const mediaOutputPath = urlJoin(this.outputDir, 'media')

    fse.ensureDirSync(mediaInputPath)
    fse.copySync(mediaInputPath, mediaOutputPath)

    // Copy /static
    const staticFilesPath = urlJoin(this.appDir, 'static')
    if (fse.existsSync(staticFilesPath)) {
      fse.copySync(staticFilesPath, this.outputDir)
    }

    // Copy favicon.ico
    const faviconInputPath = urlJoin(this.appDir, 'favicon.ico')
    if (fse.existsSync(faviconInputPath)) {
      fse.copyFileSync(faviconInputPath, urlJoin(this.outputDir, 'favicon.ico'))
    }
  }

  async clearOutputFolder() {
    try {
      fse.emptyDirSync(this.outputDir)
    } catch (e) {
      console.log('Delete file error', e)
    }
  }
}
