import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({mode}) => ({
  plugins: [react()],
  // GitHub Pages serves the repo under /<repo-name>/ — but only for pushes to
  // main (the Pages pipeline). Local dev and previews build without a base.
  // CI sets VITE_BASE=/Aether/ via deploy.yml; `bun run build` stays clean.
  base: mode === 'production' ? (process.env.VITE_BASE || '/') : '/',
  server: { host: '0.0.0.0', port: Number(process.env.PORT) || 5173 },
}))
