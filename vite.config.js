import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const getBase = () => {
  if (process.env.VITE_BASE_PATH) {
    return process.env.VITE_BASE_PATH
  }
  return '/'
}

export default defineConfig({
  plugins: [react()],
  base: getBase(),
  server: {
    port: 3001
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util']
  }
})

