# Sewing Pattern / 3D Modeling

Local web app: nhập số đo → dựng ma-nơ-canh 3D → upload ảnh trang phục → LLM đọc ảnh
ra **garment spec** → sinh rập (sewing pattern) tham số hoá → duyệt → export file cắt vải.

Cá nhân, chạy local. Không có deadline, không có user thứ hai. Ưu tiên: rập cắt ra **may
được thật**, không phải demo 3D đẹp.

## Kiến trúc bắt buộc (đã chốt — đừng đề xuất lại)

```
số đo ──┐
        ├─→ garment spec (JSON, schema chặt) ─→ pattern drafter ─→ panels 2D ─→ SVG/PDF/DXF
ảnh ─VLM┘                                              │
                                                       └─→ (tuỳ chọn) drape 3D để xem trước
```

**Rập sinh ra từ bộ drafter tham số hoá, KHÔNG phải từ việc trải phẳng mesh 3D.**
LLM chỉ chọn tham số trong schema; nó không bao giờ sinh toạ độ điểm/đường của rập.
Lý do: rập phải đúng-theo-construction (chiết, ply, canh sợi, đường may) — trải phẳng
mesh (ABF++/LSCM) cho ra mảnh méo, không có dart, không may được. Xem
`docs/00-research-and-feasibility.md`.

3D chỉ là **kiểm chứng và xem trước**. Nếu 3D chết, app vẫn phải xuất được rập.

## Quy ước không được vi phạm

- **Đơn vị: mm, số nguyên hoặc float mm.** Không inch, không "unit" trừu tượng ở core.
  Đổi đơn vị chỉ ở lớp hiển thị.
- **Seam allowance là lớp riêng.** Đường may (seamline) và đường cắt (cutline) lưu tách
  bạch. Không bao giờ bake seam allowance vào hình học gốc.
- Mỗi panel xuất ra phải có: tên, canh sợi (grainline), số lượng cắt, notch, mirror flag.
- **Ease là input tường minh** (wearing ease + design ease), không phải hằng số giấu trong
  công thức.
- Số đo cơ thể lấy từ **form người dùng nhập**, không suy ra từ ảnh.
- Mọi rập sinh ra lưu kèm `{measurements, spec, drafter version}` — không tái tạo được thì
  không debug được fit.

## Ràng buộc license (đã kiểm)

- **KHÔNG dùng SMPL / SMPL-X** — license non-commercial research. Dùng **Anny** (Apache 2.0,
  asset CC0 từ MakeHuman/MPFB2) hoặc MakeHuman/MPFB2 trực tiếp.
- GarmentCode (ETH) là MIT — tham khảo/ mượn cấu trúc thoải mái.
- Code research khác (Sewformer, DressCode, ChatGarment): license mơ hồ, phụ thuộc
  Maya + Qualoth. Đọc để lấy ý tưởng, đừng đưa vào pipeline.

## Lộ trình (làm theo thứ tự, không nhảy cóc)

0. Form số đo → drafter 1 block (thân trước/sau cơ bản) → SVG/PDF A4 tile có seam allowance.
   **Xong phase này = in ra, dán, cắt vải mộc, mặc thử.** Chưa mặc thử thì chưa đúng.
   - [x] Form số đo sinh từ `patternConfig.measurements`, lưu localStorage
   - [x] Draft Bella/Brian + seam allowance + render SVG
   - [x] Tile A4 1:1, chồng mép 10mm, ô hiệu chuẩn 100mm, nhãn hàng/cột
   - [x] Xuất bản ghi `.json` (measurements + spec + version) để tái tạo
   - [ ] **In thật, dán, cắt toile, mặc thử** ← chưa làm thì phase 0 CHƯA XONG
   - [ ] Sửa lại theo kết quả mặc thử (ease? armhole? dart?)
1. Ma-nơ-canh 3D (three.js + morph targets từ số đo). Chỉ xem, không tương tác.
2. VLM: ảnh → spec JSON. Người dùng **sửa spec trong form** rồi mới draft. Không auto-apply.
3. Drape XPBD xem trước. Ghi rõ "gần đúng". Làm cuối cùng.

## Stack

**Phase 0–1: JS thuần trong browser. Backend Python chỉ thêm khi phase 2 cần.**

- Vite + JS (không TypeScript — freesewing v4 không ship types, thêm TS chỉ tốn config).
- **[freesewing](https://freesewing.dev/) v4 (MIT)** làm bộ drafter. Nó đã có sẵn thứ khó nhất:
  `path.offset()` cho seam allowance trên đường bezier, macro `grainline` / `title` /
  `scalebox` / notch, và `Design.patternConfig.measurements` để sinh form.
  **Đừng viết lại mấy thứ này.**
- Block dùng sẵn: `@freesewing/bella` (nữ), `@freesewing/brian` (nam). Block tự viết đến
  phase 2 mới cần.
- Không thư viện PDF. Tile SVG → div A4 → `window.print()`.

**Sự thật cốt lõi để in đúng tỉ lệ: freesewing render SVG với 1 đơn vị viewBox = 1 mm.**
Nên tile chỉ cần đặt `viewBox` = hình chữ nhật mm của trang và `width/height` bằng mm thật.
Không nhân dpi, không scale. Đừng "sửa" chỗ này.

Số đo trong `@freesewing/models` cũng là mm (chest 1034 = 103.4cm) → khớp quy ước, không đổi đơn vị.
**Ngoại lệ duy nhất: `shoulderSlope` tính bằng ĐỘ, không phải mm.** Đơn vị khai trong
`MEASUREMENTS[name].unit` ở `src/vi.js`.

**Option phần trăm phải truyền dưới dạng phân số.** `chestEase` 11% → `options.chestEase = 0.11`.
Core làm `option.pct / 100` khi lấy mặc định, nên truyền thẳng `11` là rập rộng gấp 100 lần
mà không báo lỗi. Đổi ở đúng một chỗ: `draft()` trong `src/main.js`.
Số mm tuyệt đối lấy bằng `options[name].toAbs(fraction, { measurements })`.

## Tiếng Việt

Người dùng là người Việt. **Mọi chuỗi tiếng Việt nằm trong [`src/vi.js`](src/vi.js)** — UI lẫn
nhãn in trên rập. Đừng hardcode chuỗi ở chỗ khác.

- `MEASUREMENTS` — tên + **cách đo**. Định nghĩa bám nguyên văn
  freesewing.dev/reference/measurements. Dịch sai định nghĩa = rập sai, không phải lỗi chính tả.
  Bẫy đã dính: `waistBack` là *nửa vòng eo sau* (số đo NGANG), không phải chiều dài lưng.
- `OPTIONS` — nhóm ease. Thuật ngữ dùng "cử động" (lượng dư để mặc vào còn cử động được).
- `SVG_STRINGS` — nhãn in trên rập, nối vào qua `@freesewing/plugin-i18n`:
  `pattern.use(i18nPlugin, { vi: SVG_STRINGS })` + `locale: 'vi'` trong settings.
  Key là chuỗi gốc freesewing chèn (`plugin-annotations:grainline`, tên part, tên block).
  Thêm block mới → chạy lại probe thu key, đừng đoán.

UI chỉ hiện option `menu === 'fit'` dạng `pct`. Option có `menu` là hàm (freesewing bật/tắt
theo option khác) cố ý bỏ qua ở phase 0.

Cảnh báo: package freesewing v4 khai thiếu dependency (`@freesewing/config`,
`@freesewing/plugin-transform` phải cài tay). Gặp `ERR_MODULE_NOT_FOUND` khi thêm plugin mới
thì cứ `npm i` cái nó đòi. `npm audit` báo lỗi prototype pollution trong `lodash.unset`
(transitive) — app chạy local, input tự sinh, chấp nhận; xem lại nếu có ngày mở ra mạng.

```bash
npm run dev     # vite, cổng 5173
npm test        # node --test, kiểm tra toán chia trang
npm run build
```

## Khi code

- Logic hình học/rập: mỗi hàm không tầm thường để lại 1 self-check chạy được. Sai 2mm không
  ai thấy trên màn hình, chỉ thấy khi vải đã cắt. Toán thuần tách khỏi DOM để test được
  (xem `src/tile.js` → `tileGrid`).
- Đánh dấu chỗ cắt góc bằng comment `ponytail:` kèm trần và đường nâng cấp.
- Đừng dựng khung cho phase 3.
