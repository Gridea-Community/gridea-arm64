import fs from 'fs'
import path from 'path'
import { randomBytes } from 'crypto'

export function atomicWrite(file: string, content: string | Buffer) {
  const temporary = path.join(path.dirname(file), `.${path.basename(file)}.${randomBytes(8).toString('hex')}.tmp`)
  let descriptor: number | undefined
  try {
    const mode = fs.existsSync(file) ? fs.statSync(file).mode & 0o777 : 0o600
    descriptor = fs.openSync(temporary, 'wx', mode)
    fs.writeFileSync(descriptor, content, 'utf8')
    fs.fsyncSync(descriptor)
    fs.closeSync(descriptor)
    descriptor = undefined
    fs.renameSync(temporary, file)
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor)
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary)
  }
}
