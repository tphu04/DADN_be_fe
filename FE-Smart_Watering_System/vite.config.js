import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist' // Mặc định là 'dist'
  },
  server: {
    historyApiFallback: true
  }
})
