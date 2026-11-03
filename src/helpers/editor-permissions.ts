// The editor needs clipboard access for Monaco's native paste integration.
// No embedded page or other permission receives this exception.
export default function editorPermission(permission: string, url: string, mainFrame: boolean): boolean {
  if (!mainFrame || !['clipboard-read', 'clipboard-sanitized-write', 'deprecated-sync-clipboard-read'].includes(permission)) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'app:' && parsed.hostname === '.' && parsed.pathname === '/index.html'
  } catch (_) { return false }
}
