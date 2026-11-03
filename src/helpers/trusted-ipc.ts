import { BrowserWindow, ipcMain, IpcMainEvent, IpcMainInvokeEvent } from 'electron'

let trustedWindow: BrowserWindow | null = null
export function setTrustedWindow(window: BrowserWindow) {
  trustedWindow = window
}

export function isTrustedSender(event: IpcMainEvent | IpcMainInvokeEvent): boolean {
  if (!trustedWindow || trustedWindow.isDestroyed()) return false
  const contents = trustedWindow.webContents
  return event.sender === contents && event.senderFrame === contents.mainFrame
}

// All application commands must originate from the application's own main frame.
export default {
  on(channel: string, handler: (event: IpcMainEvent, ...args: any[]) => void) {
    ipcMain.on(channel, (event, ...args) => {
      if (isTrustedSender(event)) handler(event, ...args)
    })
  },
  handle(channel: string, handler: (event: IpcMainInvokeEvent, ...args: any[]) => any) {
    ipcMain.handle(channel, (event, ...args) => {
      if (!isTrustedSender(event)) throw new Error('Untrusted application command')
      return handler(event, ...args)
    })
  },
  removeAllListeners(channel: string) { ipcMain.removeAllListeners(channel) },
}
