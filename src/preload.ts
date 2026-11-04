import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { fileURLToPath } from 'url'
import markdown from './server/plugins/markdown'
import slug from './helpers/slug'

const sendChannels = new Set(['app-appearance', 'app-post-create', 'app-post-delete', 'app-post-list-delete', 'app-preview-server-port-get', 'app-refresh', 'app-site-reload', 'app-source-folder-setting', 'avatar-upload', 'comment-setting-save', 'favicon-upload', 'html-render', 'image-upload', 'menu-delete', 'menu-save', 'menu-sort', 'remote-detect', 'setting-save', 'site-publish', 'tag-delete', 'tag-save', 'theme-custom-config-save', 'theme-save'])
const receiveChannels = new Set(['click-menu-save', 'log-error', 'app-post-created', 'app-post-deleted', 'app-post-list-deleted', 'app-preview-server-port-got', 'app-site-loaded', 'app-source-folder-set', 'avatar-uploaded', 'comment-setting-saved', 'favicon-uploaded', 'html-rendered', 'image-uploaded', 'menu-deleted', 'menu-saved', 'menu-sorted', 'remote-detected', 'setting-saved', 'site-published', 'tag-deleted', 'tag-saved', 'theme-custom-config-saved', 'theme-saved'])
contextBridge.exposeInMainWorld('gridea', {
  locale: () => ipcRenderer.sendSync('app-locale'),
  send(channel: string, ...args: any[]) {
    if (!sendChannels.has(channel)) throw new Error('Unsupported application command')
    ipcRenderer.send(channel, ...args)
  },
  invoke(channel: string, ...args: any[]) {
    if (!['app-select-folder', 'app-open-external'].includes(channel)) throw new Error('Unsupported application request')
    return ipcRenderer.invoke(channel, ...args)
  },
  receive(channel: string, callback: (...args: any[]) => void, once: boolean) {
    if (!receiveChannels.has(channel)) throw new Error('Unsupported application event')
    const listener = (_event: any, ...args: any[]) => callback(...args)
    if (once) ipcRenderer.once(channel, listener)
    else ipcRenderer.on(channel, listener)
    return () => ipcRenderer.removeListener(channel, listener)
  },
  filePath(file: File) {
    const value = webUtils.getPathForFile(file)
    if (value) ipcRenderer.sendSync('app-grant-image', value)
    return value
  },
  localURL(value: string) {
    if (!value) return ''
    let file = value
    let revision = ''
    if (value.startsWith('file:')) {
      const url = new URL(value)
      revision = url.searchParams.get('v') || ''
      url.search = ''; url.hash = ''
      file = fileURLToPath(url)
    }
    return `app-media://file/image?path=${encodeURIComponent(file)}${revision ? `&v=${encodeURIComponent(revision)}` : ''}`
  },
  markdown: (content: string) => markdown.render(String(content)),
  slug: (text: string, filenameMode?: boolean, saveLowerChars?: boolean) => slug(text == null ? '' : String(text), filenameMode, saveLowerChars),
})
