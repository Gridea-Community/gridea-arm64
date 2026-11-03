import fs from 'fs'
import { atomicWrite } from './atomic-file'

// Same JSON format as lowdb's FileSync, with atomic replacement of the live file.
export default class AtomicJsonStore {
  constructor(public source: string) {}
  write(data: any) { atomicWrite(this.source, JSON.stringify(data, null, 2)) }
  read() {
    if (!fs.existsSync(this.source)) { this.write({}); return {} }
    const content = fs.readFileSync(this.source, 'utf8').trim()
    // A blank configuration is corrupt; never silently replace it with defaults.
    if (!content) throw new Error(`Empty JSON configuration: ${this.source}`)
    return JSON.parse(content)
  }
}
