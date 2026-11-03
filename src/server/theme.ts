import * as path from 'path'
import * as fse from 'fs-extra'
import junk from 'junk'
import Model from './model'
import { assertImageAccess, assertDestination } from '../helpers/file-access'
import { atomicWrite } from '../helpers/atomic-file'
import { ITheme } from './interfaces/theme'

export default class Theme extends Model {
  themeDir: string

  themeList: string[]

  themeConfig: any

  currentThemePath = ''

  constructor(appInstance: any) {
    super(appInstance)
    this.themeDir = path.join(this.appDir, 'themes')
    this.themeConfig = {}
    this.themeList = []
  }

  private validateThemeName(name: string) {
    if (typeof name !== 'string' || !name || name === '.' || name === '..' || /[\\/\x00-\x1f]/.test(name)) throw new Error('Invalid theme folder')
    const folder = assertDestination(this.appDir, path.join(this.themeDir, name))
    if (!fse.statSync(folder).isDirectory()) throw new Error('Missing theme folder')
  }

  /**
   * Get the theme list
   */
  async getThemeList() {
    let themes = await fse.readdir(this.themeDir)
    themes = themes.filter(junk.not)
    const result = await Promise.all(themes.map(async (item: string) => {
      const data = {
        folder: item,
        name: item,
        version: '',
        author: '',
        repository: '',
      }
      const themeConfigPath = path.join(this.themeDir, item, 'config.json')
      if (fse.existsSync(themeConfigPath)) {
        const config = fse.readJSONSync(themeConfigPath)
        data.name = config.name
        data.version = config.version
        data.author = config.repository
        data.repository = config.repository
      }
      return data
    }))

    return result
  }

  /**
   * Get the theme configuration
   */
  async getThemeConfig() {
    this.themeConfig = await this.$theme.get('config').value()
    this.currentThemePath = path.join(this.appDir, 'themes', this.themeConfig.themeName)
    return this.themeConfig
  }

  /**
   * Save the theme configuration
   */
  public async saveThemeConfig(themeConfig: ITheme) {
    this.validateThemeName(themeConfig.themeName)
    const previousName = this.$theme.get('config.themeName').value()
    let customConfig = this.$theme.get('customConfig').value() || {}
    if (previousName !== themeConfig.themeName) {
      const backup = assertDestination(this.appDir, path.join(this.appDir, 'config', `theme.${themeConfig.themeName}.config.json`))
      customConfig = fse.pathExistsSync(backup) ? fse.readJSONSync(backup) : {}
    }
    // Commit theme selection and its custom settings together; basic edits keep the current custom settings.
    await this.$theme.set('config', themeConfig).set('customConfig', customConfig).write()
    return themeConfig
  }

  /**
   * Save the theme custom configuration
   */
  public async saveThemeCustomConfig(config: any) {
    this.validateThemeName(this.db.themeConfig.themeName)
    if (Object.keys(config).length > 0) {
      // Save the picture type configuration
      const toPath = path.join(this.appDir, 'themes', this.db.themeConfig.themeName, 'assets', 'media', 'images')
  
      for (const configItem of this.db.currentThemeConfig) {
        const configValue = config[configItem.name]
  
        // Picture upload config type data need to upload image to folder
        if (configItem.type === 'picture-upload') {
          if (
            typeof configValue === 'string'
            && configValue !== configItem.value
            && !configValue.startsWith('/media/')
          ) {
            const extendName = configValue.split('.').pop()
            const fileName = `custom-${configItem.name}.${extendName}`
  
            fse.ensureDirSync(assertDestination(this.appDir, toPath))
            fse.copySync(assertImageAccess(configValue, [this.appDir]), assertDestination(this.appDir, path.join(toPath, fileName)))
  
            // Change value to finally value
            config[configItem.name] = path.join('/', 'media', 'images', fileName)
          }
          // Retain previous files until configuration persistence succeeds; images can be shared.
        }
  
        // Array config type data need to find image config to upload folder
        if (configItem.type === 'array' && Array.isArray(configValue)) {
          for (let arrItemIndex = 0; arrItemIndex < configValue.length; arrItemIndex += 1) {
            const foundConfigItem = this.db.currentThemeConfig.find((i: any) => i.name === configItem.name)
            const arrayItemKeys = Object.keys(configValue[arrItemIndex])
  
            for (let keyIndex = 0; keyIndex < arrayItemKeys.length; keyIndex += 1) {
              const key = arrayItemKeys[keyIndex]
              const foundPictureTypeField = foundConfigItem.arrayItems.find((i: any) => i.name === key && i.type === 'picture-upload')
  
              if (foundPictureTypeField) {
                const fieldValue = configValue[arrItemIndex][key]
    
                if (
                  typeof fieldValue === 'string'
                  && fieldValue !== foundPictureTypeField.value
                  && !fieldValue.startsWith('/media/')
                ) {
                  const extendName = fieldValue.split('.').pop()
                  const fileName = `custom-array-${configItem.name}-${new Date().getTime()}-${key}.${extendName}`
    
                  fse.ensureDirSync(assertDestination(this.appDir, toPath))
                  fse.copySync(assertImageAccess(fieldValue, [this.appDir]), assertDestination(this.appDir, path.join(toPath, fileName)))
    
                  // Change value to finally value
                  configValue[arrItemIndex][key] = path.join('/', 'media', 'images', fileName)
                } else if (typeof fieldValue === 'undefined' || fieldValue === foundPictureTypeField.value) {
                  console.log('run...')
                } else {
                  // Existing theme image reference is retained.
                }
              }
            }
          }
        }
      }
  
      // Image cleanup is explicit; saving/resetting settings must not destroy existing files.

    }


    await this.$theme.set('customConfig', config).write()

    // Backup theme custom config
    const themeConfigBackupPath = path.join(this.appDir, 'config', `theme.${this.db.themeConfig.themeName}.config.json`)
    atomicWrite(assertDestination(this.appDir, themeConfigBackupPath), JSON.stringify(config, null, 2))
    return config
  }

  /**
   * Get the theme custom configuration
   */

  public async getThemeCustomConfig() {
    const config = await this.$theme.get('customConfig').value()
    return config
  }

  /**
   * Get current theme custom configuration
   */
  public async getCurrentThemeCustomConfig() {
    const themeConfigPath = path.join(this.currentThemePath, 'config.json')
    const existThemeConfigFile = await fse.pathExists(themeConfigPath)
    if (existThemeConfigFile) {
      const themeConfig = fse.readJSONSync(themeConfigPath)
      if (themeConfig && themeConfig.customConfig) {
        return themeConfig.customConfig
      }
    }

    return []
  }
}
