import express from 'express'
import { Server } from 'http'

export default function initServer() {
  const app = express()
  let server: Server | null = null
  let closed = false

  function listen(port: number) {
    if (closed) return
    const candidate = app.listen(port, '127.0.0.1')
    server = candidate
    candidate.on('error', (error: NodeJS.ErrnoException) => {
      // Retry only a busy port. Permission, DNS and other failures need a real error.
      if (error.code === 'EADDRINUSE' && port < 4020 && !closed) {
        listen(port + 1)
      } else if (!closed) {
        console.error('Preview server failed:', error.code || 'unknown error')
      }
    })
    candidate.on('listening', () => {
      app.set('port', port)
      console.log(`Preview server is running on port : ${port}`)
    })
  }

  listen(4000)
  return {
    get server() { return server },
    app,
    close() {
      closed = true
      if (server) {
        server.close()
        // Stop connections owned by this preview server when closing or quitting.
        if (server.closeAllConnections) server.closeAllConnections()
      }
    },
  }
}
