// File objects stay in the isolated preload. IPC receives only approved paths.
export default function localFilePath(value: any): string {
  const file = value && (value.originFileObj || value)
  if (!file) return ''
  if (typeof file.path === 'string' && file.path) return file.path
  return window.gridea.filePath(file)
}
export function localAssetURL(value: string): string {
  if (value && (value.startsWith('file:') || value.startsWith('/'))) return window.gridea.localURL(value)
  return value
}
