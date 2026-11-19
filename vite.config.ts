import { defineConfig } from 'vite'
export default defineConfig({
  resolve: { alias: { '@': '/src' } },
  server: { host: true },
  build: { target: 'es2022', sourcemap: true },
})
