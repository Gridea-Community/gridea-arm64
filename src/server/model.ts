import path from 'path'
import low from 'lowdb'
import AtomicJsonStore from '../helpers/atomic-json-store'
import { assertDestination } from '../helpers/file-access'
import { BrowserWindow } from 'electron'
import { IApplicationDb, IApplication } from './interfaces/application'

export default class Model {
  appDir: string

  buildDir: string

  $setting: any

  $posts: any

  $theme: any

  db: IApplicationDb

  mainWindow: BrowserWindow

  constructor(appInstance: IApplication) {
    this.appDir = appInstance.appDir
    this.buildDir = appInstance.buildDir
    this.db = appInstance.db
    this.mainWindow = appInstance.mainWindow

    this.initDataStore()
  }

  private initDataStore(): void {
    // @types/lowdb incorrectly includes a constructor on adapter instances.
    // Our adapter implements the runtime read/write contract, verified in storage tests.
    const settingAdapter = new AtomicJsonStore(assertDestination(this.appDir, path.join(this.appDir, 'config/setting.json')))
    const setting = low(settingAdapter as unknown as low.AdapterSync)
    this.$setting = setting

    const postsAdapter = new AtomicJsonStore(assertDestination(this.appDir, path.join(this.appDir, 'config/posts.json')))
    const posts = low(postsAdapter as unknown as low.AdapterSync)
    this.$posts = posts

    const themeAdapter = new AtomicJsonStore(assertDestination(this.appDir, path.join(this.appDir, 'config/theme.json')))
    const theme = low(themeAdapter as unknown as low.AdapterSync)
    this.$theme = theme
  }
}
