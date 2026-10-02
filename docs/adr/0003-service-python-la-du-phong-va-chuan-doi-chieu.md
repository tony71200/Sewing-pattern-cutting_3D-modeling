---
status: accepted
date: 2026-10-02
---

# Giữ service Python làm nguồn thân dự phòng và chuẩn đối chiếu

Sau ADR-0002, cách hiển nhiên là xoá service HTTP. Ta cố ý giữ nó, vì chưa chứng minh được bản
browser tốt bằng bản Python. Bản Python là thứ đã đo được 8/9 số đo lệch ≤ 2 mm.

Cách dùng:

- Tab Thân 3D có công tắc **Nguồn thân: Browser / Service**. Hai nguồn dùng chung bảng lệch.
- Không tự động chuyển nguồn khi lỗi. Tự chuyển sẽ giấu đúng sự khác biệt mà ta cần thấy.
- Chính code Python đó cũng là script bake gói dữ liệu thân và là lời giải chuẩn cho harness
  đối chiếu JS ↔ Python.

## Consequences

- Trang chạy từ `file://` (ADR-0004) nên service phải trả header CORS. Lệnh gọi đi thẳng tới
  `http://127.0.0.1:8791`, không qua proxy Vite.
- `npm run service` phải gọi Python trong `.venv`. Gọi `python` hệ thống thì dính
  `ModuleNotFoundError: anny`, lỗi đã gặp 2026-10-02.
- Xem lại ADR này khi harness đối chiếu đã xanh một thời gian và không ai bật công tắc nữa. Khi
  đó service chỉ còn là script bake.
