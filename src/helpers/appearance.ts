import { ipcRenderer } from '@/helpers/renderer-bridge'
export type Appearance = 'system' | 'light' | 'dark'
const query = window.matchMedia('(prefers-color-scheme: dark)')
export function getAppearance(): Appearance {
  const value = localStorage.getItem('appearance')
  return value === 'light' || value === 'dark' ? value : 'system'
}
function resolveTheme() {
  const mode = getAppearance()
  return mode === 'system' ? (query.matches ? 'dark' : 'light') : mode
}
function apply() {
  document.documentElement.dataset.theme = resolveTheme()
  document.documentElement.style.colorScheme = document.documentElement.dataset.theme || 'light'
  window.dispatchEvent(new Event('gridea-appearance-changed'))
}
function updateAppearance() {
  if (document.documentElement.dataset.theme !== resolveTheme()) apply()
}
export function setAppearance(mode: Appearance) {
  localStorage.setItem('appearance', mode)
  ipcRenderer.send('app-appearance', mode)
  updateAppearance()
}
export function initAppearance() {
  ipcRenderer.send('app-appearance', getAppearance())
  query.addEventListener('change', updateAppearance)
  apply()
}
