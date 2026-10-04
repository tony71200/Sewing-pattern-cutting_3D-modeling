# Tài liệu lỗi

Đây là danh sách lỗi đã gặp hoặc dễ gặp. Mỗi lỗi có một harness để bắt nó. **Gặp lỗi lạ thì đọc
file này trước.** Sửa xong một lỗi mới thì thêm một mục vào đây kèm harness, hoặc ghi rõ
"chưa có — lý do".

Chạy toàn bộ harness:

```bash
npm test                                  # build, launcher, store, body3d, tile
.venv/Scripts/python -m pytest service -q # service, CORS
npm run build && npm run smoke            # mở file:// bằng Chrome headless
```

## L01 — PowerShell chặn npm
Triệu chứng: `npm : File C:\Program Files\nodejs\npm.ps1 cannot be loaded because running scripts is disabled on this system.`
Nguyên nhân: ExecutionPolicy mặc định của Windows là `Restricted`. Trong PowerShell, lệnh `npm` chạy qua `npm.ps1`.
Sửa: dùng `RunApp.bat` / `RunService.bat` (chạy trong cmd), hoặc gõ lệnh trong cmd. Không đổi chính sách của máy thay người dùng.
Harness: chưa có. Chính sách này thuộc về máy, không thuộc về repo. Các file `.bat` tránh được lỗi vì chạy bằng cmd.

## L02 — `npm run service` báo thiếu anny
Triệu chứng: `ModuleNotFoundError: No module named 'anny'`
Nguyên nhân: script gọi `python` của hệ thống, không phải Python trong `.venv`.
Sửa: script `service` trỏ tới `.venv\Scripts\python.exe`.
Harness: `test/launch.test.mjs` › `L02: npm run service dùng python trong .venv`

## L03 — Mở `dist/index.html` ra trang trắng
Triệu chứng: trang trắng. Console báo bị chặn tải `/assets/…js` từ origin `null`.
Nguyên nhân: `file://` chặn `<script type="module" src>` và mọi file bên ngoài.
Sửa: `vite-plugin-singlefile` (ADR-0004).
Harness: `test/dist.test.mjs` › `build ra đúng một file…`, `không thẻ nào trỏ ra ngoài…`; `npm run smoke`

## L04 — Asset dùng đường dẫn tuyệt đối
Triệu chứng: như L03.
Nguyên nhân: thiếu `base: './'` nên Vite sinh đường dẫn `/assets/...`.
Sửa: thêm `base: './'` vào `vite.config.js`.
Harness: `test/dist.test.mjs` › `không thẻ nào trỏ ra ngoài…`

## L05 — File `.bat` chạy sai kỳ lạ
Triệu chứng: `echo.` in ra `o.`, `set` mất giá trị, chữ có dấu thành rác.
Nguyên nhân: một trong ba thứ sau: gọi `chcp 65001` giữa file làm cmd đọc lệch byte; có ký tự ngoài ASCII; dòng kết thúc bằng LF.
Sửa: `.bat` chỉ dùng ASCII, kết thúc dòng CRLF (`.gitattributes`), không gọi `chcp`.
Harness: `test/launch.test.mjs` › `L05: <tên>.bat thuần ASCII, CRLF, không gọi chcp`

## L06 — Rập rộng gấp 100 lần mà không báo lỗi
Triệu chứng: rập to bất thường. Cử động 11% thành 1100%.
Nguyên nhân: option phần trăm bị truyền thẳng `11` thay vì phân số `0.11`.
Sửa: chỉ chia 100 ở đúng một chỗ, là `draft()` trong `src/main.js`.
Harness: chưa có. `draft()` còn phụ thuộc DOM. S2 sẽ tách phần chuyển option ra hàm thuần rồi viết test.

## L07 — Tab Thân 3D báo "Failed to fetch" khi chạy từ `file://`
Triệu chứng: `Không kết nối được service thân 3D: Failed to fetch`, dù `RunService.bat` đang chạy.
Nguyên nhân: chạy từ `file://` thì không có proxy Vite; service thiếu header CORS / Private Network Access.
Sửa: `serviceBase()` trong `src/body3d.js`; `CORS` + `do_OPTIONS` trong `service/body_service.py`.
Harness: `test/body3d.test.mjs` › `serviceBase…`; `service/tests/test_pack.py::test_cors_post_tu_trang_file`, `::test_cors_preflight_co_private_network`

## L08 — Service không khởi động vì cổng 8791 bị chiếm
Triệu chứng: `RunService.bat` báo `Cong 8791 dang bi chiem`.
Nguyên nhân: một service cũ vẫn đang chạy.
Sửa: đóng cửa sổ cũ, hoặc `taskkill /F /PID <pid>`.
Harness: `RunService.bat` tự kiểm tra cổng trước khi chạy.

## L09 — Số đo "biến mất" khi chuyển từ `npm run dev` sang `file://`
Triệu chứng: mở `dist/index.html` thì thấy số đo mẫu, không thấy số mình đã nhập.
Nguyên nhân: localStorage tách theo origin, mà `http://localhost:5173` khác `file://`.
Sửa: ở bản cũ bấm **Lưu bản ghi .json**, sang bản mới bấm **Mở bản ghi .json**.
Harness: `test/store.test.mjs` › `recordToState: …` (6 test)

## L10 — Offline thì vỡ font/giao diện
Triệu chứng: font rơi về font hệ thống, chữ Việt có dấu lệch dòng.
Nguyên nhân: font hoặc CSS tải từ CDN / Google Fonts.
Sửa: đóng gói font bằng `@fontsource` và nhúng inline.
Harness: `test/dist.test.mjs` › `CSS không tải font/ảnh từ ngoài…`

## L11 — Sửa code rồi mà app vẫn như cũ
Triệu chứng: thay đổi không hiện ra khi mở `dist/index.html`.
Nguyên nhân: `dist/` vẫn là bản build cũ.
Sửa: `RunApp.bat rebuild`.
Harness: chưa có. Muốn tự động thì phải so thời gian sửa file nguồn với thời gian build. Để sau, nếu lỗi này lặp lại.

## L12 — Các lỗi Phase 1 đã mắc ở thân 3D
| Lỗi | Harness |
|---|---|
| Dùng một delta cho cả hai chiều target, nhánh âm sai 19,8 mm | `service/tests/test_linear.py::test_hai_delta_moi_target`, `::test_bust_co_hai_nhanh_khac_nhau` |
| Gửi mesh đã áp target, browser cộng thêm lần nữa (lệch 50 mm) | `test/body3d.test.mjs` › `positions là mesh GỐC…` |
| Lẫn `base` với `measurements` trong header | `test/body3d.test.mjs` › `header có cả base lẫn measurements…` |
| Đổi trục / trừ gốc hai lần, mesh bay đi | `service/tests/test_pack.py::test_doi_he_truc_metz_up_sang_mm_yup` |
| Service báo giá trị dự đoán thay vì đo lại | `service/tests/test_pack.py::test_BAT_BIEN_CHINH_service_khong_noi_doi` |
| Bộ giải hy sinh eo để cứu chân ngực | `service/tests/test_linear.py::test_khong_hy_sinh_so_do_de_dat_de_cuu_so_do_ngoai_tam` |
| Tầng đo trôi theo khi fit (kẹt ở −84 mm) | chưa có test riêng, xem luật 2 trong CLAUDE.md. S3 sẽ thêm khi port thước dây |

## L13 — Service chết ngay khi vừa sẵn sàng
Triệu chứng: `UnicodeEncodeError` ngay sau dòng nạp Anny.
Nguyên nhân: `print()` chữ có dấu ra console cmd.exe, mà console này không mã hoá được.
Sửa: các dòng `print` lúc khởi động chỉ dùng ASCII.
Harness: `service/tests/test_pack.py::test_thong_bao_khoi_dong_thuan_ASCII`
