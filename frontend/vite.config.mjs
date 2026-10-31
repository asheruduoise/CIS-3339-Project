// Vite build configuration.
// - ESM config (.mjs) so it works the same on Windows, macOS and Linux.
// - "@" points at src/ using a URL instead of Windows-only path joins.
// - base "/" means the build expects to be served from the site root.
//   If you deploy under a sub-path, set VITE_BASE (e.g. VITE_BASE=/app/).
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: env.VITE_BASE || '/',
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    server: { port: 5173 },
    preview: { port: 4173 }
  }
})
