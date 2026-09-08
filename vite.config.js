import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    // Proxy để browser và service cùng origin -> không có CORS, service không cần
    // biết gì về CORS.
    proxy: { '/api': { target: 'http://127.0.0.1:8791', changeOrigin: false } },
  },
})
