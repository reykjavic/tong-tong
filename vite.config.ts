import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const adminHtmlPath = fileURLToPath(new URL('./public/admin/index.html', import.meta.url))

// Vite's dev server falls through to the SPA index.html for `/admin` and
// `/admin/`, so the Decap CMS page in public/admin/ is unreachable in dev.
// Serve it directly for those two paths; Vite serves /admin/* assets itself.
function serveAdminDev(): Plugin {
  return {
    name: 'serve-admin-dev',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = (req.url ?? '').split('?')[0]
        if (pathname === '/admin' || pathname === '/admin/') {
          res.statusCode = 200
          res.setHeader('Content-Type', 'text/html')
          res.end(readFileSync(adminHtmlPath, 'utf8'))
          return
        }
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), serveAdminDev()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})