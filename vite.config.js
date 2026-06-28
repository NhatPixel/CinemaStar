import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const CINEMA_API_TARGET = 'https://cinema-api.duckdns.org'
const CHATBOT_TARGET = process.env.VITE_CHATBOT_PROXY_TARGET || 'http://cinema-api.duckdns.org:8000'

/** Set-Cookie từ BE → lưu trên localhost để browser gửi kèm /chatbot (dev). */
function rewriteSetCookieForLocalhost(proxyRes) {
  const cookies = proxyRes.headers['set-cookie']
  if (!cookies) return
  proxyRes.headers['set-cookie'] = cookies.map((cookie) =>
    cookie
      .replace(/;\s*Domain=[^;]*/gi, '')
      .replace(/;\s*Secure/gi, '')
      .replace(/;\s*SameSite=None/gi, '; SameSite=Lax')
  )
}

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Dev: Cinema API cùng origin → cookie login lưu trên localhost, chatbot đọc được qua proxy.
      '/api': {
        target: CINEMA_API_TARGET,
        changeOrigin: true,
        secure: true,
        configure: (proxy) => {
          proxy.on('proxyRes', rewriteSetCookieForLocalhost)
        },
      },
      '/media': {
        target: CINEMA_API_TARGET,
        changeOrigin: true,
        secure: true,
      },
      '/chatbot': {
        target: CHATBOT_TARGET,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/chatbot/, ''),
      },
    },
  },
  preview: {
    host: true,
    port: process.env.PORT,
    allowedHosts: ['cinemastar.onrender.com'],
  },
})
