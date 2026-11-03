import { protocol, net } from 'electron'
import path from 'path'
import { realpath } from 'fs/promises'
import { pathToFileURL } from 'url'

export default function createProtocol(scheme: string, root: string) {
  protocol.handle(scheme, async request => {
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405 })
    let file: string
    try {
      const url = new URL(request.url)
      if (url.hostname !== '.') return new Response('Forbidden', { status: 403 })
      file = path.resolve(root, '.' + decodeURIComponent(url.pathname))
    } catch (_) {
      return new Response('Bad request', { status: 400 })
    }
    const boundary = path.resolve(root) + path.sep
    if (!file.startsWith(boundary)) return new Response('Forbidden', { status: 403 })
    try {
      const actualRoot = await realpath(root)
      const actualFile = await realpath(file)
      if (!actualFile.startsWith(actualRoot + path.sep)) return new Response('Forbidden', { status: 403 })
      return net.fetch(pathToFileURL(actualFile).toString())
    } catch (_) {
      return new Response('Not found', { status: 404 })
    }
  })
}
