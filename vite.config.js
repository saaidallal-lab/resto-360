import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/dvf': {
        target: 'https://files.data.gouv.fr',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/dvf/, '/geo-dvf/latest/csv/2023/departements')
      },
      '/api/geocode': {
        target: 'https://api-adresse.data.gouv.fr',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/geocode/, '/search/')
      }
    }
  }
})
