import { IpcMainEvent } from 'electron'
import ipcMain from '../../helpers/trusted-ipc'
import { playResultSound } from '../../helpers/preview-sound'
import Deploy from '../deploy'
import Renderer from '../renderer'
import SftpDeploy from '../plugins/deploys/sftp'
import NetlifyDeploy from '../plugins/deploys/netlify'

export default class DeployEvents {
  constructor(appInstance: any) {
    const { platform } = appInstance.db.setting
    
    const deploy = new Deploy(appInstance)
    const sftp = new SftpDeploy(appInstance)
    const renderer = new Renderer(appInstance)
    const netlify = new NetlifyDeploy(appInstance)

    ipcMain.removeAllListeners('site-publish')
    ipcMain.removeAllListeners('site-published')
    ipcMain.removeAllListeners('remote-detect')
    ipcMain.removeAllListeners('remote-detected')

    ipcMain.on('site-publish', async (event: IpcMainEvent, params: any) => {
      console.log(platform)
      const client = ({
        'github': deploy,
        'coding': deploy,
        'gitee': deploy,
        'sftp': sftp,
        'netlify': netlify,
      } as any)[platform]
      
      let result
      try {
        renderer.db.themeConfig.domain = renderer.db.setting.domain
        await renderer.renderAll()
        result = await client.publish()
      } catch (error) {
        result = { success: false, message: error instanceof Error ? error.message : String(error) }
      }
      if (!event.sender.isDestroyed()) {
        event.sender.send('site-published', result)
        playResultSound(result.success === true)
      }
    })

    ipcMain.on('remote-detect', async (event: IpcMainEvent, params: any) => {
      const client = ({
        'github': deploy,
        'coding': deploy,
        'gitee': deploy,
        'sftp': sftp,
        'netlify': netlify,
      } as any)[platform]
      
      const result = await client.remoteDetect()
      event.sender.send('remote-detected', result)
    })
  }
}
