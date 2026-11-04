import fs from 'fs'
import path from 'path'

// Local metadata only: never record article text, clipboard data, URLs or site paths.
export default function recordProcessFailure(folder: string, type: string, details: { reason?: string; exitCode?: number }) {
  try {
    const dir = path.join(folder, 'logs')
    fs.mkdirSync(dir, { recursive: true })
    const file = path.join(dir, 'process-failures.jsonl')
    if (fs.existsSync(file) && fs.statSync(file).size > 65536) fs.renameSync(file, file + '.previous')
    fs.appendFileSync(file, JSON.stringify({ time: new Date().toISOString(), type, reason: details.reason, exitCode: details.exitCode }) + '\n', { mode: 0o600 })
  } catch (_) { /* Diagnostics must not make a failing process less stable. */ }
}
