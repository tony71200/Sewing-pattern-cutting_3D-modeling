import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// ADR-0004: app là MỘT file dist/index.html mở thẳng từ ổ đĩa. file:// chặn
// <script type="module" src> và fetch file bên cạnh, nên mọi thứ phải nằm inline.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  server: {
    // Chỉ cho `npm run dev`: proxy để browser và service cùng origin.
    // Chạy từ file:// thì không có proxy — xem serviceBase() trong src/body3d.js.
    proxy: { '/api': { target: 'http://127.0.0.1:8791', changeOrigin: false } },
  },
})
