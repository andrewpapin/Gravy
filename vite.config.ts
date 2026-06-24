import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'

// Bumped manually for breaking/major UI changes; the trailing number is the
// most recently merged PR, picked up automatically from git history below.
const APP_VERSION_BASE = '1.1'

function getAppVersion(): string {
  try {
    const log = execSync('git log -50 --pretty=%s', { encoding: 'utf-8' })
    const match = log.match(/#(\d+)/)
    return `${APP_VERSION_BASE}.${match ? match[1] : '0'}`
  } catch {
    return `${APP_VERSION_BASE}.0`
  }
}

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/Gravy/' : '/',
  define: {
    __APP_VERSION__: JSON.stringify(getAppVersion()),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Gravy',
        short_name: 'Gravy',
        description: 'A family chore & reward tracker',
        theme_color: '#F7EDE2',
        background_color: '#F7EDE2',
        display: 'standalone',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
      },
    }),
  ],
}))
