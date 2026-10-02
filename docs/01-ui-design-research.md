# Nghiên cứu giao diện: đầu vào cho S2

Ngày 2026-10-02. Nguồn đã đọc:

- [taste-skill](https://github.com/Leonxlnx/taste-skill) (MIT)
- [Impeccable](https://impeccable.style/) (Apache 2.0)
- [awesome-design-md](https://github.com/VoltAgent/awesome-design-md) (MIT)

Mục đích: viết `DESIGN.md` và làm lại giao diện ở S2. Ghi lại ở đây để không phải đọc lại từ đầu.

## Nguồn nào hợp với app này

App là công cụ, không phải landing page. Nguồn càng nhắm vào trang marketing thì càng ít dùng được.

| Nguồn | Phần dùng được | Phần bỏ |
|---|---|---|
| taste-skill | skill `redesign-existing-projects`. Chế độ dày đặc (density ≥ 8): không bọc card, ngăn dữ liệu bằng đường kẻ 1px, `tabular-nums` cho mọi con số | v2 (tác giả ghi rõ là cho landing/portfolio, "not dashboards"). Font Geist/Satoshi |
| Impeccable | **Operate mode** (công cụ, dashboard, editor):<br>• một họ font, thang chữ cố định tỉ lệ 1,125–1,2<br>• accent chỉ dùng cho hành động, lựa chọn và trạng thái<br>• lớp nền trung tính thứ hai cho sidebar<br>• mỗi component có đủ trạng thái<br>• chuyển động 150–250 ms, chỉ dùng để báo trạng thái | — |
| awesome-design-md | Định dạng **DESIGN.md** (Google Stitch): frontmatter YAML chứa token, thân markdown. Mẫu gần nhất là Linear (nền 4px, độ sâu bằng các bậc màu bề mặt + đường kẻ mảnh, gần như không đổ bóng). Stripe: `tnum` ở mọi ô số | Token chép từ trang marketing. Mục "Known Gaps" của chính các file đó thừa nhận thiếu trạng thái lỗi của form |

## Font: đã đo, không đoán

Tải bản `@fontsource` về và soi bằng fontTools:

| Font | Bộ chữ tiếng Việt | Số đều cột (`tnum`) | Kết luận |
|---|---|---|---|
| Be Vietnam Pro | có | **không**, chữ số tỉ lệ | số trong bảng lệch sẽ không thẳng cột |
| `@fontsource/geist-sans` | **không** (chỉ Latin) | — | loại |
| `@fontsource/geist` | có | có | dùng được |
| **Inter** (`@fontsource-variable/inter`) | có | có | **chọn** |
| IBM Plex Sans | có | chữ số mặc định đều nhau | dự phòng |

Phải nhúng `.woff2` vào `dist/index.html` (ADR-0004). Không nhúng thì trang `file://` rơi về
font hệ thống.

## Đề xuất token (để S2 chốt)

**Thang chữ** (px): 12 chú thích/đơn vị · 13 nhãn · 14 thân/bảng · 16 tiêu đề mục · 20 tiêu đề
tab. Dòng cao 1,5. Thêm chút cho chữ Việt có dấu chồng.

**Khoảng cách:** nền 4px (4/8/12/16/24/32). **Bo góc:** 4 ô nhập/nút, 6 panel, 0 bảng. Ngăn
mục bằng đường kẻ mảnh. Không đổ bóng, trừ popover.

**Màu:**

| Vai trò | Sáng | Tối |
|---|---|---|
| canvas | #f5f6f7 | #111316 |
| surface | #ffffff | #181b1f |
| sidebar | #eceef1 | #1d2126 |
| ink | #16181c | #e8eaed |
| ink-muted | #5b616b | #9aa1ab |
| hairline | #dcdfe4 | #2b3037 |
| accent (một màu duy nhất) | #0f6b74 | #5bb5bf |
| lệch: chữ / nền | #b42318 / #fdecea | #ff7a6e / #3a1816 |
| cảnh báo | #9a5b00 | #e0a447 |

**Số liệu:**

- Đơn vị ghi ở tiêu đề cột. Trong ô chỉ có số, căn phải, `tnum`.
- Số lệch luôn có dấu: `+9` / `−18`, dùng dấu trừ thật (−), không dùng gạch nối.
- **Màu đỏ không bao giờ là tín hiệu duy nhất** để báo lệch: luôn kèm dấu và số.
- **Số đo ước lượng** hiện: chữ nhạt, tiền tố "≈", gạch chân chấm, nhãn "ước lượng". Không bao
  giờ tô đỏ.

**Chuyển động:**

- Chỉ animate `opacity`, `transform`, `color`, `background-color`.
- Thời lượng:
  - 120 ms: hover / nhấn
  - 180 ms: đổi tab, đánh dấu giá trị vừa đổi
  - 240 ms: mở/đóng mục
- Easing vào `cubic-bezier(0.16,1,0.3,1)`. Đi ra nhanh hơn, khoảng 70% thời lượng vào.
- Không animate kích thước canvas three.js. ResizeObserver phải debounce. Độ mượt của 3D đến từ
  damping của OrbitControls.
- `prefers-reduced-motion`: bỏ transform và damping, giữ phản hồi màu.
- `@media print { * { transition: none !important; animation: none !important } }`

**In 1:1:** bản in luôn dùng bảng màu sáng, nét đen. Không transform, không zoom, không đổ bóng
trên trang in.

## 10 điều cấm cho app này

1. Chỉ dùng màu đỏ để báo lệch.
2. Chữ số tỉ lệ trong bảng hoặc ô nhập (bẫy Be Vietnam Pro).
3. Lẫn đơn vị, hoặc lặp đơn vị trong từng ô.
4. Bọc card quanh mỗi nhóm form, card lồng card.
5. Gradient tím/xanh, glow, kính mờ phủ lên khung 3D.
6. Nhãn nhỏ trên tiêu đề (eyebrow), mục đánh số 01/02, ô "−18 mm" to đùng kiểu hero.
7. Hiệu ứng xuất hiện lần lượt khi tải trang, chấm trạng thái service nhấp nháy, easing nảy, animation làm xô layout.
8. Modal cho xuất file hay xác nhận. Làm ngay tại chỗ.
9. CDN hoặc Google Fonts (vỡ trên `file://`), hoặc font thiếu bộ chữ tiếng Việt.
10. Bất cứ thứ gì đụng vào tỉ lệ in. Thêm: không dùng gạch dài kiểu "—" làm dấu câu, không viết kiểu quảng cáo "Seamless".

## Cài làm skill Claude Code (chưa cài, chờ quyết định ở S2)

- **Impeccable:** `/plugin marketplace add pbakaus/impeccable` hoặc
  `npx impeccable install --providers=claude --scope=project`.
  - Nó tải binary vào `~/.impeccable/bin/`.
  - Nó cài hook sửa file vào project.
  - Clone repo trên Windows từng lỗi "Filename too long".
- **taste-skill:** chép `skills/redesign-skill/SKILL.md` vào
  `.claude/skills/redesign-existing-projects/SKILL.md`. Đây là cách ít rủi ro nhất.
- **awesome-design-md:** không phải skill, chỉ là định dạng file `DESIGN.md` đặt ở gốc repo.
