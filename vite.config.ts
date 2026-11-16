import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Đường dẫn tương đối để chạy được dưới https://<user>.github.io/<repo>/
  base: './',
})
