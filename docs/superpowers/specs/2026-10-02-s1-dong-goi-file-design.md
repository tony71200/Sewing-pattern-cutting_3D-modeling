# S1 — Đóng gói một file chạy từ `file://`, tài liệu lỗi, harness

Ngày: 2026-10-02 · Nhánh: `20260908_than-3d-anny` (thực thi trên `20261002_dong-goi-file`) · Quyết định gốc: [ADR-0004](../../adr/0004-mot-file-html-mo-tu-file-protocol.md),
[ADR-0003](../../adr/0003-service-python-la-du-phong-va-chuan-doi-chieu.md)

**Trạng thái:** xong 2026-10-02, in 1:1 đã đo 100 mm

S1 là spec đầu tiên trong năm spec. Thứ tự chung:

| | Nội dung |
|---|---|
| **S1** | Đóng gói |
| S2 | Giao diện |
| S3 | Anny trên browser |
| S4 | Phase 2 trang phục |
| S5 | Vỏ bọc theo ease, đồ CC0 |

Người dùng in và may toile ngay sau S1, song song với S2.

## 1. Mục tiêu

Nhấp đúp `RunApp.bat`, hoặc mở thẳng `dist/index.html`. App phải chạy đủ như `npm run dev`:

- Vẽ rập.
- In 1:1 A4.
- Lưu bản ghi.
- Tab Thân 3D gọi được service khi `RunService.bat` đang chạy.

Không cần mở terminal, không cần server web.

Kèm theo:

- **Tài liệu lỗi**: liệt kê các lỗi đã gặp hoặc dễ gặp.
- **Harness**: mỗi lỗi trong tài liệu có một harness bắt được nó trước khi tới tay người dùng.
  Harness viết trước, chạy đỏ, rồi mới sửa code.

### Ngoài phạm vi

- Đổi giao diện, đổi thứ tự tab: thuộc S2.
- Gói dữ liệu thân, công tắc nguồn thân: thuộc S3.
- S1 không đổi bất kỳ chuỗi tiếng Việt nào trên rập. Nút mới thì thêm chuỗi vào `src/vi.js`.

## 2. Hiện trạng (đo ngày 2026-10-02)

- `npm run dev` và `RunService.bat` chạy tốt. `npm test` 20/20 xanh, `pytest service` 36/36 xanh.
- `npm run dev` gõ trong PowerShell thì hỏng: ExecutionPolicy `Restricted` chặn `npm.ps1`.
- `npm run service` hỏng: script gọi `python` hệ thống, không có `anny`.
- `dist/index.html` hiện tham chiếu `/assets/...` theo đường dẫn tuyệt đối, nên mở từ đĩa ra trang trắng.
- Gọi service bằng `fetch('/api/fit')` (`src/main.js:382`) chỉ chạy được nhờ proxy Vite.
  Service không trả header CORS.
- localStorage theo origin: số đo lưu ở `http://localhost:5173` **không** thấy được từ
  `file://`. Đã có nút xuất bản ghi `.json` nhưng chưa có nút nạp lại.

## 3. Thay đổi

### 3.1 Build một file

- `vite.config.js`: thêm `base: './'` và plugin `viteSingleFile()` (devDependency
  `vite-plugin-singlefile`). Giữ `server.proxy` cho chế độ dev.
- `index.html`: không đổi cấu trúc. Plugin nhúng CSS/JS inline. Harness §5 xác nhận không còn
  thẻ nào trỏ ra ngoài.

### 3.2 Gọi service từ cả hai chế độ

`src/body3d.js` thêm hàm thuần `serviceBase(protocol)`:

| `protocol` | Trả về |
|---|---|
| `'file:'` | `'http://127.0.0.1:8791'` |
| khác | `''` (đi qua proxy Vite như cũ) |

`refetchBody()` gọi `fetch(serviceBase(location.protocol) + '/api/fit', …)`.

`service/body_service.py`:

- Mọi response có `Access-Control-Allow-Origin: *`. Trang `file://` gửi `Origin: null`. Service
  chỉ nghe trên 127.0.0.1 và không dùng cookie, nên `*` là đủ.
- Thêm `do_OPTIONS` cho preflight, vì `Content-Type: application/json` kích hoạt preflight:
  - `Access-Control-Allow-Methods: POST, GET, OPTIONS`
  - `Access-Control-Allow-Headers: Content-Type`
  - `Access-Control-Allow-Private-Network: true` (Chrome Private Network Access)

### 3.3 `npm run service` dùng `.venv`

`package.json`:

```
"service": ".venv\\Scripts\\python.exe service/body_service.py"
```

npm trên Windows chạy script bằng cmd, nên dùng đường dẫn kiểu cmd. Câu lệnh trong CLAUDE.md và
README sửa theo.

### 3.4 Nạp lại bản ghi `.json`

Thêm nút **"Mở bản ghi .json"** cạnh nút "Lưu bản ghi .json".

`src/store.js` thêm hàm thuần `recordToState(record)`:

- Nhận đúng định dạng mà `draft()` xuất ra:
  `{ design, sa, measurements, easePct, units, designVersion, draftedAt }`.
- Trả về patch `{ design, sa, measurements, easePct, estimated: [] }`.
- Ném lỗi tiếng Việt khi:
  - `units !== 'mm'`
  - `design` không thuộc block đã biết
  - `measurements` không phải object số

Đây là đường chuyển dữ liệu từ `localhost` sang `file://`. Nó cũng khép vòng của luật "mọi rập
lưu kèm số đo + spec + version": lưu được thì phải nạp lại được.

Nếu `designVersion` trong bản ghi khác version drafter hiện tại: vẫn nạp, nhưng báo trên dòng
trạng thái. Rập vẽ lại có thể khác bản cũ.

### 3.5 `RunApp.bat`

Chép cấu trúc `RunService.bat`:

- Chỉ dùng ASCII, không `chcp`, không tự đóng cửa sổ khi lỗi.
- Các bước:
  1. Kiểm tra `package.json` (đúng thư mục).
  2. Kiểm tra `node` (cần ≥ 22.12, vì Vite 8 đòi).
  3. Thiếu `node_modules` thì `call npm install`.
  4. Thiếu `dist\index.html`, hoặc chạy với tham số `rebuild`, thì `call npm run build`.
  5. Kiểm tra `dist\index.html` tồn tại thật. npm có thể in lỗi mà vẫn thoát 0.
  6. `start "" "%~dp0dist\index.html"`.
- In nhắc: muốn dùng tab Thân 3D thì chạy `RunService.bat`.

`Setup.bat` cuối file đổi hướng dẫn "chạy `npm run dev`" thành "nhấp đúp `RunApp.bat`".

### 3.6 Tài liệu lỗi

File `docs/tai-lieu-loi.md`. Mỗi mục có đúng các trường:

```
## Lxx — <tên ngắn>
Triệu chứng: <người dùng thấy gì, nguyên văn thông báo nếu có>
Nguyên nhân: <một câu>
Sửa: <làm gì>
Harness: <file::tên test>  |  "chưa có — <lý do>"
```

CLAUDE.md thêm một dòng: "Gặp lỗi lạ → đọc `docs/tai-lieu-loi.md` trước; sửa xong lỗi mới →
thêm mục + harness".

Danh sách mục ban đầu:

| Mã | Lỗi | Harness |
|---|---|---|
| L01 | PowerShell chặn `npm.ps1` (ExecutionPolicy) | `RunApp.bat` chạy trong cmd nên tránh được. Không tự động hoá được: chính sách là của máy |
| L02 | `npm run service` → `ModuleNotFoundError: anny` | `test/launch.test.mjs::service dùng python trong .venv` |
| L03 | Mở `dist/index.html` ra trang trắng (module/asset ngoài bị chặn trên `file://`) | `test/dist.test.mjs`, `npm run smoke` |
| L04 | Asset dùng đường dẫn tuyệt đối `/assets/...` | `test/dist.test.mjs` |
| L05 | `.bat` lỗi kỳ lạ (`echo.` thành `o.`) do `chcp 65001` / ký tự không phải ASCII / LF | `test/launch.test.mjs::bat thuần ASCII, CRLF, không chcp` |
| L06 | Option phần trăm truyền `11` thay vì `0.11` → rập rộng gấp 100 lần, không báo lỗi | chưa có. `draft()` dính DOM. Ghi nhận để S2 tách |
| L07 | Tab Thân 3D từ `file://` báo "Failed to fetch" (thiếu proxy / CORS / PNA) | `service/tests/test_pack.py::test_cors_*`, `test/body3d.test.mjs::serviceBase` |
| L08 | Cổng 8791 bị chiếm | `RunService.bat` đã kiểm |
| L09 | Số đo "biến mất" khi đổi từ `npm run dev` sang `file://` (khác origin) | `test/store.test.mjs::recordToState …`. Cách sửa: Lưu `.json` → Mở `.json` |
| L10 | Font/CDN tải lúc chạy → offline thì vỡ giao diện | `test/dist.test.mjs` |
| L11 | Sửa code mà `dist` vẫn là bản cũ | không tự động hoá. `RunApp.bat rebuild` |
| L12 | Các lỗi Phase 1 đã mắc (một delta cho cả hai chiều, tầng đo trôi, mesh đã áp target bị cộng lần hai, trừ gốc hai lần) | các test hiện có trong `service/tests` và `test/body3d.test.mjs`, liệt kê theo tên |

## 4. Luồng chạy sau S1

```
RunApp.bat ─(thiếu)→ npm install ─(thiếu/rebuild)→ npm run build ─→ dist/index.html (1 file)
                                                                       │ file://
RunService.bat ─→ 127.0.0.1:8791 ←─ fetch + CORS ──────────────────────┘ (chỉ tab Thân 3D)
npm run dev ───→ localhost:5173 ──→ proxy /api → 8791                     (phát triển)
```

## 5. Harness (viết trước, phải đỏ trước khi sửa)

| File | Kiểm | Chạy trong |
|---|---|---|
| `test/dist.test.mjs` | Build bằng API `vite.build()` vào thư mục tạm, rồi kiểm: (1) đầu ra chỉ có `index.html`; (2) không thẻ `<script src>`, `<link href>`, `<img src>` nào trỏ tới `/…`, `http(s)://…` hay file ngoài (chỉ chấp nhận inline hoặc `data:`); (3) dung lượng < 8 MB (S3 thêm ~3 MB) | `npm test` |
| `test/launch.test.mjs` | `package.json` script `service` chứa `.venv`; mọi `*.bat` ở gốc: chỉ byte ASCII, mọi dòng kết thúc CRLF, không chứa `chcp` | `npm test` |
| `test/body3d.test.mjs` (thêm) | `serviceBase('file:')` và `serviceBase('http:')` | `npm test` |
| `test/store.test.mjs` (thêm) | `recordToState`: (1) round-trip với bản ghi do `draft()` sinh; (2) ném lỗi khi `units` sai, `design` lạ, số đo không phải số; (3) `estimated` rỗng sau khi nạp | `npm test` |
| `service/tests/test_pack.py` (thêm) | Gọi handler thật: POST có `Access-Control-Allow-Origin`; OPTIONS trả 204 kèm đủ ba header §3.2 | `pytest service` |
| `scripts/smoke-file.mjs` | Chạy `chrome.exe --headless=new --dump-dom --virtual-time-budget=…` trên `file:///…/dist/index.html` (đã thử trên `dist` của Rubik: lấy được DOM sau khi JS chạy). Kiểm: `#preview` có `<svg>` rập; log console không có `Uncaught`. Không thấy Chrome thì thử Edge, không thấy cả hai thì báo bỏ qua, không báo xanh | `npm run smoke` (không nằm trong `npm test` vì cần trình duyệt, chậm) |

`dist.test.mjs` build thật nên `npm test` sẽ chậm thêm vài giây. Chấp nhận, vì đây là harness
bắt đúng lỗi khiến app "không mở được".

## 6. Tiêu chí xong

1. `npm test`, `pytest service`, `npm run smoke` đều xanh.
2. Trên máy này, từ trạng thái `dist/` đã xoá: nhấp đúp `RunApp.bat` → build → trình duyệt mở
   `file:///…/dist/index.html` → vẽ được rập Bella và Brian.
3. **In 1:1 không đổi**: bản in thử từ `file://` có ô hiệu chuẩn đo đúng 100 mm. Kiểm bằng
   print preview và in thật một trang. S1 động vào CSS (inline), nên phải kiểm lại trước toile.
4. Bật `RunService.bat` → tab Thân 3D từ `file://` dựng được thân và hiện bảng lệch.
5. Lưu `.json` ở `npm run dev` → Mở `.json` ở `file://` → cùng số đo, cùng rập.
6. `npm run dev` vẫn chạy như cũ.
7. CLAUDE.md và README cập nhật: cách chạy, `npm run smoke`, tài liệu lỗi.

## 7. Rủi ro

- **Chrome chặn `file://` → `127.0.0.1` dù đã có header PNA:** chưa thử. Nếu bị chặn thì:
  - Ghi vào tài liệu lỗi (L07).
  - Tab Thân 3D tạm dùng qua `npm run dev` tới khi S3 bỏ phụ thuộc service.
  - Tiêu chí 4 khi đó đổi thành "báo lỗi rõ ràng, có hướng dẫn".
- **`vite-plugin-singlefile` với ~1 MB JS của three.js + freesewing:** Rubik chạy được với
  three.js. Kích thước thì `dist.test` canh.
- **localStorage trên `file://`:** Chrome dùng chung một origin cho mọi trang `file://`. Một
  trang khác mở từ đĩa ghi cùng key `pattern-studio/v2` thì đè nhau. Xác suất thấp, ghi nhận và
  không xử lý.
