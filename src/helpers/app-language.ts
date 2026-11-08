export const menuLocaleByLanguage = {
  zhHans: 'zh-CN',
  zh_TW: 'zh-TW',
  zh_HK: 'zh-HK',
  en: 'en',
  fr_FR: 'fr-FR',
  ru: 'ru',
  ja_JP: 'ja-JP',
}

export type AppLanguage = keyof typeof menuLocaleByLanguage

export function isAppLanguage(value: unknown): value is AppLanguage {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(menuLocaleByLanguage, value)
}

export function systemLanguage(locale: string): AppLanguage {
  const parts = locale.toLowerCase().split(/[-_]/)
  switch (parts[0]) {
    case 'zh':
      if (parts.includes('hans')) return 'zhHans'
      if (parts.includes('hk') || parts.includes('mo')) return 'zh_HK'
      return parts.includes('hant') || parts.includes('tw') ? 'zh_TW' : 'zhHans'
    case 'fr': return 'fr_FR'
    case 'ja': return 'ja_JP'
    case 'ru': return 'ru'
    default: return 'en'
  }
}
