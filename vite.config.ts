import fs from 'node:fs'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin, type ResolvedConfig } from 'vite'

function excludeDataFromPublicCopy(): Plugin {
  let config: ResolvedConfig
  return {
    name: 'exclude-data-from-public-copy',
    apply: 'build',
    configResolved(resolvedConfig) {
      config = resolvedConfig
    },
    closeBundle() {
      const root = config.root || process.cwd()
      const publicDir = path.resolve(root, config.publicDir)
      const outDir = path.resolve(root, config.build.outDir)
      if (!fs.existsSync(publicDir)) return

      const entries = fs.readdirSync(publicDir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.name === 'data') continue
        const srcPath = path.join(publicDir, entry.name)
        const destPath = path.join(outDir, entry.name)
        fs.cpSync(srcPath, destPath, { recursive: true })
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: process.env.VITE_BASE_URL || (command === 'build' ? '/projects/public/solar-docs/' : '/'),
  plugins: [react(), excludeDataFromPublicCopy()],
  build: {
    copyPublicDir: false,
  },
  server: {
    host: true,
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/data': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
}))
