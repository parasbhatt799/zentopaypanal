import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'https://www.usepay.in',
        changeOrigin: true,
        secure: false,
        headers: {
          'X-Forwarded-For': '143.110.182.175',
          'X-Real-IP': '143.110.182.175'
        }
      }
    }
  }
})
