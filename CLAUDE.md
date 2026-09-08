# Sewing Pattern / 3D Modeling

Local web app: nhập số đo → dựng thân người 3D → upload ảnh trang phục → LLM đọc ảnh
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

- **Anny** (Apache 2.0, asset CC0 từ MakeHuman/MPFB2) — **đang dùng** cho thân 3D.
- **KHÔNG dùng SMPL / SMPL-X** — license non-commercial research. Anny có hỗ trợ topology
  SMPL-X nhưng phải tải riêng: đừng tải.
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
1. [x] Thân người 3D bằng **Anny** + service Python. Không dùng hình học thủ tục — xem mục
   "Thân người 3D" bên dưới.
2. VLM: ảnh → spec JSON. Người dùng **sửa spec trong form** rồi mới draft. Không auto-apply.
3. Drape XPBD xem trước. Ghi rõ "gần đúng". Làm cuối cùng.

## Stack

**Phase 0: JS thuần trong browser. Phase 1 thêm service Python cho thân 3D — sớm hơn dự
kiến vì Anny là PyTorch, không có cách nào chạy thuần browser.**

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

## Thân người 3D (Phase 1)

Mesh người của **Anny** (Apache 2.0, asset CC0), chạy trong service Python local.
Thiết kế: [spec bản 2](docs/superpowers/specs/2026-09-08-3d-body-anny-design.md).
[Spec bản 1](docs/superpowers/specs/2026-09-07-3d-mannequin-design.md) đã bị thay thế — nó
loại Anny dựa trên một câu hỏi đặt sai. Đọc phần đầu file đó trước khi định làm lại hình học
thủ tục.

Bốn luật không được phá, mỗi luật rút ra từ một lỗi đã thật sự mắc:

1. **Hai delta mỗi target**, một tại `+1` một tại `−1`. `measure-bust-circ` có nhánh tăng và
   nhánh giảm là hai target khác nhau của MakeHuman (cos ≈ −0.78). Dùng một delta sai
   19,8 mm ở nhánh âm. Có test canh.
2. **Tầng đo tìm theo giải phẫu rồi KHOÁ** sau bước phenotype. Nếu tầng chạy theo trong lúc
   fit thì "chỗ hẹp nhất" tụt dần khi ngực nở và phần lệch kẹt ở −84 mm.
3. **Không dùng `hpsToBust` / `hpsToWaistFront` làm độ cao.** Chúng đo dọc theo bề mặt cơ
   thể, vòng qua bầu ngực. Vòng eo của mesh MakeHuman cũng thấp hơn eo may mặc ~250 mm.
4. **Chi cắt vuông góc với xương**, không phải mặt phẳng ngang: tay buông sát thân nên mặt
   cắt ngang gộp cổ tay với thân thành một vòng.

**Bộ giải target phải có đủ ba chi tiết** (`solve_targets` ở cả Python lẫn JS, có test đối
chiếu hai lời giải). Đo trên bộ số đo nữ size 38: chỉ giải cả hệ → 6/9; thêm ghim biến chạm
biên → 7/9 nhưng vòng eo lệch +9 mm; thêm bỏ số đo đã ghim khỏi mục tiêu → 8/9, lệch dồn hết
vào đúng số đo không thể đạt. Chi tiết thứ ba quan trọng với ứng dụng may: bình phương tối
thiểu sẵn sàng đẩy eo lệch 9 mm để cứu chân ngực (eo → chân ngực +92 mm/đơn vị), mà eo lái
rập trực tiếp còn chân ngực chỉ dùng cho chiết ngực.

**Header có CẢ `base` LẪN `measurements`.** `base` là số đo tại t=0, gốc của mô hình tuyến
tính — browser dùng cái này. `measurements` là số đo **đo lại** trên mesh đã fit — sự thật để
hiện bảng lệch. Lẫn hai cái là bảng lệch sai và bộ giải của browser lệch khỏi service.

**`positions` gửi đi là mesh GỐC (V0), không phải mesh đã áp target** — delta tính từ V0 nên
browser phải tự áp. Gửi mesh đã áp thì browser cộng lần nữa, lệch 50 mm.

Đổi đơn vị mét/z-up → mm/y-up ở **đúng một chỗ**: `to_browser()` trong `body_service.py`.
Delta chỉ xoay trục, **không trừ gốc** — trừ gốc hai lần là mesh bay đi.

Chỉ nạp 9 target `measure-*` cần dùng: nạp cả 256 làm khởi động 78 s thay vì 2,8 s.

Phần lệch còn lại (chân ngực ~−18 mm) **phải hiện trên giao diện**. Service được phép không
khớp số đo, nhưng không được nói dối về thân nó vừa dựng.

`estimate` tồn tại ở CẢ HAI phía (`src/estimate.js` và `service/estimate.py`) có chủ đích:
form "Số đo thân" phải hiện nhãn ước lượng trước khi gọi service. Dữ liệu dùng chung
`samples.json` nên không thể lệch; sửa logic thì sửa cả hai.

```bash
npm run service   # cổng 8791, Vite proxy /api sang đây
.venv/Scripts/python -m pytest service
```

## Khi code

- Logic hình học/rập: mỗi hàm không tầm thường để lại 1 self-check chạy được. Sai 2mm không
  ai thấy trên màn hình, chỉ thấy khi vải đã cắt. Toán thuần tách khỏi DOM để test được
  (xem `src/tile.js` → `tileGrid`).
- Đánh dấu chỗ cắt góc bằng comment `ponytail:` kèm trần và đường nâng cấp.
- Đừng dựng khung cho phase 3.
