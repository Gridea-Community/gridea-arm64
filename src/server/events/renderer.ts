import { execFile } from 'node:child_process'
import { IpcMainEvent } from 'electron'
import ipcMain from '../../helpers/trusted-ipc'
import Renderer from '../renderer'

export default class RendererEvents {
  constructor(appInstance: any) {
    const renderer = new Renderer(appInstance)

    ipcMain.removeAllListeners('html-render')

    ipcMain.on('html-render', async (event: IpcMainEvent) => {
      const reply = (result: { success: boolean, port?: number, serverUnavailable?: boolean, message?: string }) => {
        if (event.sender.isDestroyed()) return
        event.sender.send('html-rendered', result)

        if (process.platform === 'darwin') {
          const sound = result.success ? 'Glass' : 'Basso'
          execFile('/usr/bin/afplay', [`/System/Library/Sounds/${sound}.aiff`], { timeout: 5000 }, () => {
            // Sound playback is optional and must not affect the preview result.
          })
        }
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
        reply({ success: false, message })
      }
    })
  }
}
