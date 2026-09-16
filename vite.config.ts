import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({mode}) => ({
  plugins: [react()],
  // GitHub Pages serves project sites under /<repo-name>/ — deploy.yml derives
  // VITE_BASE from the repo name. Local dev and previews build without a base.
  base: mode === 'production' ? (process.env.VITE_BASE || '/') : '/',
  server: { host: '0.0.0.0', port: Number(process.env.PORT) || 5173 },
}))
