import recordProcessFailure from './helpers/process-diagnostics'
import { grantFolder } from './helpers/file-access'
import editorPermission from './helpers/editor-permissions'
import ipcMain, { setTrustedWindow } from './helpers/trusted-ipc'
import shell from './helpers/external-link'
import {
  app, protocol, BrowserWindow, Menu, dialog, nativeTheme,
} from 'electron'
import createProtocol from './helpers/protocol'
import App from './server/app'
import messages from './assets/locales-menu'
import initServer from './server'
import path from 'path'
import { registerMediaProtocol, grantImage } from './helpers/media-protocol'

ipcMain.on('app-appearance', (_event, mode) => {
  if (['system', 'light', 'dark'].includes(mode)) nativeTheme.themeSource = mode
})
ipcMain.on('app-locale', event => { event.returnValue = app.getLocale() })
ipcMain.handle('app-select-folder', async () => {
  const result = await dialog.showOpenDialog({
    defaultPath: currentApp ? path.dirname(currentApp.appDir) : app.getPath('documents'),
    properties: ['openDirectory', 'createDirectory'],
  })
  if (!result.canceled) result.filePaths.forEach(grantFolder)
  return result
})
ipcMain.handle('app-open-external', (_event, url) => shell.openExternal(url))
ipcMain.on('app-grant-image', (event, value) => { event.returnValue = grantImage(value) })
ipcMain.on('app-refresh', () => {
  if (!quitting && win && !win.isDestroyed()) win.webContents.reload()
})

// Allow smoke tests to use an isolated profile and sample blog.
if (process.env.GRIDEA_TEST_HOME) {
  app.setPath('home', process.env.GRIDEA_TEST_HOME)
  app.setPath('documents', process.env.GRIDEA_TEST_HOME)
  app.setPath('userData', process.env.GRIDEA_TEST_HOME)
}

const isDevelopment = process.env.NODE_ENV !== 'production'

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win: any = null
let quitting = false
const primaryInstance = app.requestSingleInstanceLock()
if (!primaryInstance) app.quit()
app.on('second-instance', () => {
  if (!primaryInstance || quitting) return
  if (win && !win.isDestroyed()) {
    if (!win.isVisible() && !win.isMinimized()) return
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
  } else if (app.isReady()) createWindow()
})
let menu: Menu
let httpServer: ReturnType<typeof initServer> | null = null
let protocolRegistered = false
let currentApp: App | null = null

// Standard scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true, supportFetchAPI: true } },
  { scheme: 'app-media', privileges: { secure: true, standard: true, supportFetchAPI: true } },
])
function createWindow() {
  if (!primaryInstance || quitting || (win && !win.isDestroyed())) return
  // Create the browser window.
  const winOption: any = {
    show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1c1c1e' : '#ffffff',
    width: 1200,
    height: 800,
    minHeight: 642,
    minWidth: 1000,
    webPreferences: {
      webSecurity: true,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Preload runs the legacy Markdown engine in its isolated world.
      preload: path.join(__dirname, 'preload.js'),
    },
    // frame: false, // 去除默认窗口栏
    titleBarStyle: 'hiddenInset' as ('hidden' | 'default' | 'hiddenInset' | 'customButtonsOnHover' | undefined),
  }

  if (process.platform !== 'darwin') {
    winOption.icon = `${__dirname}/app-icons/gridea.png`
  }

  const createdWindow = new BrowserWindow(winOption)
  win = createdWindow
  createdWindow.once('ready-to-show', () => {
    if (!quitting && win === createdWindow && !createdWindow.isDestroyed()) createdWindow.show()
  })
  setTrustedWindow(win)
  win.webContents.setWindowOpenHandler(({ url }: { url: string }) => {
    shell.openExternal(url).catch(() => {})
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (event: any) => event.preventDefault())
  win.webContents.on('will-redirect', (event: any) => event.preventDefault())
  win.webContents.on('will-attach-webview', (event: any) => event.preventDefault())
  win.webContents.on('render-process-gone', (_event: any, details: any) => {
    recordProcessFailure(app.getPath('userData'), 'renderer', details)
  })
  const contents = win.webContents
  contents.session.setPermissionRequestHandler((sender: any, permission: string, callback: any, details: any) => {
    callback(sender === contents && editorPermission(permission, details.requestingUrl, details.isMainFrame))
  })
  contents.session.setPermissionCheckHandler((sender: any, permission: string, _origin: string, details: any) => (
    sender === contents && editorPermission(permission, details.requestingUrl, details.isMainFrame)
  ))
  win.setTitle('Gridea for ARM64')
  if (process.env.GRIDEA_TEST_HOME) {
    win.webContents.on('console-message', (_event: any, ...details: any[]) => console.log('Renderer:', ...details))

  }

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    win.loadURL(process.env.WEBPACK_DEV_SERVER_URL as string)
    if (!process.env.IS_TEST) { win.webContents.openDevTools() }
  } else {
    if (!protocolRegistered) {
      createProtocol('app', __dirname)
      registerMediaProtocol(() => currentApp ? [currentApp.appDir] : [])
      protocolRegistered = true
    }
    // Load the index.html when not in development
    win.loadURL('app://./index.html')

  }

  win.on('closed', () => {
    if (win === createdWindow) win = null
  })

  const locale: string = app.getLocale() || 'zh-CN'
  const menuLabels = messages[locale] || messages['zh-CN']
  // menu
  const template: any = [
    {
      label: menuLabels.edit,
      submenu: [
        {
          label: menuLabels.save,
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            win.webContents.send('click-menu-save')
          },
        },
        { type: 'separator' },
        { role: 'undo', label: menuLabels.undo },
        { role: 'redo', label: menuLabels.redo },
        { type: 'separator' },
        { role: 'cut', label: menuLabels.cut },
        { role: 'copy', label: menuLabels.copy },
        { role: 'paste', label: menuLabels.paste },
        { role: 'delete', label: menuLabels.delete },
        { role: 'selectall', label: menuLabels.selectall },
        { role: 'toggledevtools', label: menuLabels.toggledevtools },
        { type: 'separator' },
        { role: 'close', label: menuLabels.close },
        { role: 'quit', label: menuLabels.quit },
      ],
    },
    {
      role: 'windowMenu',
    },
    {
      role: 'help',
      label: menuLabels.help,
      submenu: [
        {
          label: 'Learn More',
          click() { shell.openExternal('https://github.com/getgridea/gridea') },
        },
      ],
    },
  ]

  if (process.platform === 'darwin') template.unshift({ role: 'appMenu' })
  menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)

  const s = initServer()
  httpServer = s

  const setting = {
    mainWindow: win,
    app,
    baseDir: __dirname,
    previewServer: s.app,
  }

  // Init app
  const appInstance = new App(setting)
  currentApp = appInstance
  console.log('Main process runing...', appInstance.appDir) // DELETE ME
}

// Quit when all windows are closed.
function closePreviewServer() {
  if (httpServer) {
    httpServer.close()
    httpServer = null
  }
}

app.on('before-quit', () => {
  quitting = true
  closePreviewServer()
})
app.on('will-quit', closePreviewServer)
app.on('child-process-gone', (_event: any, details: any) => {
  recordProcessFailure(app.getPath('userData'), details.type || 'child', details)
})

app.on('window-all-closed', () => {
  closePreviewServer()
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (!primaryInstance || quitting) return
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  if (!primaryInstance || quitting) return
  // if (isDevelopment && !process.env.IS_TEST) {
  //   // Install Vue Devtools
  //   await installVueDevtools()
  // }
  createWindow()
})

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', (data) => {
      if (data === 'graceful-exit') {
        app.quit()
      }
    })
  } else {
    process.on('SIGTERM', () => {
      app.quit()
    })
  }
}

// ipcMain.on('min-window', () => {
//   if (win) {
//     win.minimize()
//   }
// })

// ipcMain.on('max-window', () => {
//   if (win) {
//     if (win.isMaximized()) {
//       win.unmaximize()
//     } else {
//       win.maximize()
//     }
//   }
// })

// ipcMain.on('close-window', () => {
//   if (win) {
//     win.close()
//   }
// })

/**
 * Auto Updater
 *
 * Uncomment the following code below and install `electron-updater` to
 * support auto updating. Code Signing with a valid certificate is required.
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-electron-builder.html#auto-updating
 */

/*

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall()
})

app.on('ready', () => {
  if (process.env.NODE_ENV === 'production') autoUpdater.checkForUpdates()
})
 */
