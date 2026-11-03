import fs from 'fs'
import path from 'path'

const selectedImages = new Set<string>()
const selectedFolders = new Set<string>()
const extensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.bmp', '.avif', '.heic', '.heif', '.icns'])
function inside(root: string, target: string): boolean {
  const relative = path.relative(root, target)
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))
}
export function grantImage(value: string): boolean {
  try {
    const actual = fs.realpathSync(value)
    if (!extensions.has(path.extname(actual).toLowerCase()) || !fs.statSync(actual).isFile()) return false
    selectedImages.add(actual)
    return true
  } catch (_) { return false }
}
export function assertImageAccess(value: string, roots: string[]): string {
  const actual = fs.realpathSync(value)
  if (!extensions.has(path.extname(actual).toLowerCase()) || !fs.statSync(actual).isFile()) throw new Error('Unsupported image file')
  if (!selectedImages.has(actual) && !roots.some(root => {
    try { return inside(fs.realpathSync(root), actual) } catch (_) { return false }
  })) throw new Error('Select this image using the file chooser first')
  return actual
}
// Resolve the nearest existing ancestor too: a symlink must not redirect a write outside the site.
export function assertDestination(root: string, value: string): string {
  const actualRoot = fs.realpathSync(root)
  const target = path.resolve(value)
  if (!inside(path.resolve(root), target)) throw new Error('Destination is outside the site')
  let ancestor = target
  while (!fs.existsSync(ancestor)) {
    const parent = path.dirname(ancestor)
    if (parent === ancestor) throw new Error('Missing destination parent')
    ancestor = parent
  }
  if (!inside(actualRoot, fs.realpathSync(ancestor))) throw new Error('Destination symlink is outside the site')
  return target
}
export function grantFolder(value: string) {
  const actual = fs.realpathSync(value)
  if (!fs.statSync(actual).isDirectory()) throw new Error('Not a folder')
  selectedFolders.add(actual)
}
export function assertSelectedFolder(value: string, current: string) {
  const actual = fs.realpathSync(value)
  if (!fs.statSync(actual).isDirectory() || (!selectedFolders.has(actual) && actual !== fs.realpathSync(current))) {
    throw new Error('Select this folder using the folder chooser first')
  }
  return actual
}
