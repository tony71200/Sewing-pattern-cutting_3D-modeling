---
status: accepted
date: 2026-10-02
---

# App là một file `dist/index.html` mở thẳng từ ổ đĩa

Người dùng mở app bằng cách nhấp đúp `dist/index.html` (hoặc `RunApp.bat`), giống dự án
`Webui_local_Rubik`. Không cần chạy `npm run dev` hay server nào. Build dùng
`vite-plugin-singlefile` và `base: './'`: mọi JS/CSS/font/dữ liệu được nhúng inline.

Lý do là ràng buộc của `file://`:

- Trình duyệt chặn `<script type="module" src>` và `fetch()` file bên cạnh.
- Không có proxy.
- Không được gọi CDN lúc chạy.

## Consequences

- Gói dữ liệu thân (~2,2 MB) nhúng base64 vào bundle. `index.html` dự kiến 4–5 MB.
- Font phải đóng gói (`@fontsource`), không dùng Google Fonts.
- Sửa code xong phải build lại: `RunApp.bat rebuild`. `dist/` không vào git.
- `RunApp.bat` chỉ dùng ASCII, không `chcp 65001`. Đặt `chcp` giữa file `.bat` đã làm cmd đọc
  lệch byte. Rubik đang dùng `chcp`, đừng chép theo.
- `npm run dev` giữ lại để phát triển. Đường gọi service phải chạy được ở cả hai chế độ.
