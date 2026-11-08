export { default as markdown } from '../server/plugins/markdown'
export { default as createSlug } from './slug'
import type { IpcRendererEvent } from 'electron'
export type { IpcRendererEvent } from 'electron'

type Listener = (event: IpcRendererEvent, ...args: any[]) => void
interface GrideaBridge {
  locale(): string
  send(channel: string, ...args: any[]): void
  invoke(channel: string, ...args: any[]): Promise<any>
  receive(channel: string, callback: (...args: any[]) => void, once: boolean): () => void
  filePath(file: File): string
  localURL(value: string): string
}
declare global { interface Window { gridea: GrideaBridge } }
const listeners = new Map<string, Set<() => void>>()
function subscribe(channel: string, listener: Listener, once: boolean) {
  const subscriptions = listeners.get(channel) || new Set<() => void>()
  let unsubscribe: () => void
  unsubscribe = window.gridea.receive(channel, (...args) => {
    if (once) subscriptions.delete(unsubscribe)
    // Do not expose an Electron event or sender to application code.
    listener({} as IpcRendererEvent, ...args)
  }, once)
  subscriptions.add(unsubscribe)
  listeners.set(channel, subscriptions)
}
export const ipcRenderer = {
  send: (channel: string, ...args: any[]) => window.gridea.send(channel, ...args),
  invoke: (channel: string, ...args: any[]) => window.gridea.invoke(channel, ...args),
  sendSync(channel: string) {
    if (channel !== 'app-locale') throw new Error('Unsupported synchronous request')
    return window.gridea.locale()
  },
  on: (channel: string, listener: Listener) => subscribe(channel, listener, false),
  once: (channel: string, listener: Listener) => subscribe(channel, listener, true),
  removeAllListeners(channel: string) {
    const subscriptions = listeners.get(channel)
    if (subscriptions) subscriptions.forEach(unsubscribe => unsubscribe())
    listeners.delete(channel)
  },
}
export const shell = { openExternal: (url: string) => window.gridea.invoke('app-open-external', url) }
