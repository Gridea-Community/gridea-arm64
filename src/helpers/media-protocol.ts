import { protocol, net } from 'electron'
import { pathToFileURL } from 'url'

import { assertImageAccess } from './file-access'
export { grantImage } from './file-access'

export function registerMediaProtocol(roots: () => string[]) {
  protocol.handle('app-media', async request => {
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405 })
    try {
      const url = new URL(request.url)
      if (url.hostname !== 'file' || url.pathname !== '/image') return new Response('Forbidden', { status: 403 })
      let file: string
      try { file = assertImageAccess(url.searchParams.get('path') || '', roots()) }
      catch (_) { return new Response('Forbidden', { status: 403 }) }
      const response = await net.fetch(pathToFileURL(file).toString())
      const headers = new Headers(response.headers)
      headers.set('Content-Security-Policy', "sandbox; default-src 'none'; img-src data:")
      headers.set('Access-Control-Allow-Origin', 'app://.')
      headers.set('Cache-Control', 'no-store')
      return new Response(response.body, { status: response.status, headers })
    } catch (_) { return new Response('Not found', { status: 404 }) }
  })
}
