import { IpcMainEvent } from 'electron'
import ipcMain from '../../helpers/trusted-ipc'
import { ITheme } from '../interfaces/theme'
import Theme from '../theme'

export default class ThemeEvents {
  constructor(appInstance: any) {
    const theme = new Theme(appInstance)

    ipcMain.removeAllListeners('theme-save')
    ipcMain.removeAllListeners('theme-saved')
    ipcMain.removeAllListeners('theme-custom-config-save')
    ipcMain.removeAllListeners('theme-custom-config-saved')

    ipcMain.on('theme-save', async (event: IpcMainEvent, themeConfig: ITheme) => {
      try {
        const config = await theme.saveThemeConfig(themeConfig)
        event.sender.send('theme-saved', config)
      } catch (_) { event.sender.send('theme-saved', false) }
    })

    ipcMain.on('theme-custom-config-save', async (event: IpcMainEvent, config: any) => {
      try {
        const result = await theme.saveThemeCustomConfig(config)
        event.sender.send('theme-custom-config-saved', result)
      } catch (_) { event.sender.send('theme-custom-config-saved', false) }
    })
  }
}
