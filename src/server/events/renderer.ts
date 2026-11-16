import { IpcMainEvent } from 'electron'
import ipcMain from '../../helpers/trusted-ipc'
import { playResultSound } from '../../helpers/preview-sound'
import Renderer from '../renderer'

export default class RendererEvents {
  constructor(appInstance: any) {
    const renderer = new Renderer(appInstance)

    ipcMain.removeAllListeners('html-render')

    ipcMain.on('html-render', async (event: IpcMainEvent) => {
      const reply = (result: { success: boolean, port?: number, serverUnavailable?: boolean, message?: string, undefinedVariable?: string }) => {
        if (event.sender.isDestroyed()) return
        event.sender.send('html-rendered', result)

        playResultSound(result.success)
      }
      try {
        const port = appInstance.previewServer.get('port')
        if (!port) {
          reply({ success: false, serverUnavailable: true })
          return
        }
        if (!renderer.db.themeConfig.themeName) throw new Error('No site theme selected')
        await renderer.preview(port)
        reply({ success: true, port })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        const undefinedVariable = error instanceof ReferenceError
          ? /(?:^|\n)([$_\p{ID_Start}][$\p{ID_Continue}]*) is not defined$/u.exec(message)?.[1]
          : undefined
        reply({ success: false, message, undefinedVariable })
      }
    })
  }
}
