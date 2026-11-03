import { ipcRenderer } from '@/helpers/renderer-bridge'
export type Appearance = 'system' | 'light' | 'dark'
const query = window.matchMedia('(prefers-color-scheme: dark)')
export function getAppearance(): Appearance {
  const value = localStorage.getItem('appearance')
  return value === 'light' || value === 'dark' ? value : 'system'
}
function apply() {
  const mode = getAppearance()
  document.documentElement.dataset.theme = mode === 'system' ? (query.matches ? 'dark' : 'light') : mode
  document.documentElement.style.colorScheme = document.documentElement.dataset.theme || 'light'
  window.dispatchEvent(new Event('gridea-appearance-changed'))
}
export function setAppearance(mode: Appearance) {
  localStorage.setItem('appearance', mode)
  ipcRenderer.send('app-appearance', mode)
  apply()
}
export function initAppearance() {
  ipcRenderer.send('app-appearance', getAppearance())
  query.addEventListener('change', apply)
  apply()
}
