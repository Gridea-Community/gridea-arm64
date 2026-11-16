import { execFile } from 'node:child_process'

let enabled = false

export function setPreviewSound(value: unknown) {
  enabled = value === true
}

export function playResultSound(success: boolean) {
  if (process.platform !== 'darwin' || !enabled) return
  const sound = success ? 'Glass' : 'Basso'
  execFile('/usr/bin/afplay', [`/System/Library/Sounds/${sound}.aiff`], { timeout: 5000 }, () => {
    // A playback failure must not affect preview or synchronization.
  })
}
