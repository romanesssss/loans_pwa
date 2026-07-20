import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [],
      manifest: {
        name: 'Пупупуп',
        short_name: 'пу',
        description: 'Личный планировщик долгов и досрочных платежей',
        theme_color: '#111111',
        background_color: '#f6f6f6',
        display: 'standalone',
        start_url: '/',
        lang: 'ru',
        icons: []
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}']
      }
    })
  ]
})
