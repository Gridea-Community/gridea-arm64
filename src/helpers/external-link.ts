import { shell } from 'electron'

export function isExternalLink(value: string): boolean {
  try {
    const url = new URL(value)
    return ['https:', 'http:', 'mailto:'].includes(url.protocol) && !url.username && !url.password
  } catch (_) {
    return false
  }
}

export default {
  openExternal(value: string) {
    if (!isExternalLink(value)) return Promise.resolve()
    return shell.openExternal(value)
  },
}
