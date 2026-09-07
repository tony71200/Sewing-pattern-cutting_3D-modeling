# Pattern Studio

Ứng dụng web chạy local: nhập số đo cơ thể → sinh rập (sewing pattern) theo số đo → in ra
giấy A4 đúng tỉ lệ 1:1 để cắt vải.

Giao diện tiếng Việt, kể cả nhãn in trên rập (`Thân sau`, `Canh sợi`,
`Cắt 2 đối xứng bằng vải chính`…).

> **Đang ở Phase 0.** Hiện chỉ có: số đo → rập → in.
> Ma-nơ-canh 3D và phần LLM đọc ảnh trang phục **chưa làm**.
> Xem lộ trình đầy đủ trong [CLAUDE.md](CLAUDE.md) và phân tích khả thi trong
> [docs/00-research-and-feasibility.md](docs/00-research-and-feasibility.md).

## Làm được gì

- Chọn block cơ bản: **Bella** (thân nữ) hoặc **Brian** (thân nam)
- Nhập số đo cơ thể (đơn vị **mm**), có tooltip mô tả **cách đo** từng số
- Chỉnh **độ cử động** (ease) bằng thanh trượt, hiện đồng thời `%` và số `mm` thật
- Chừa đường may (seam allowance) tuỳ chỉnh
- In 1:1 chia trang A4, có chồng mép để dán và **ô hiệu chuẩn 100 mm**
- Xuất bản ghi `.json` (số đo + ease + phiên bản) để tái tạo lại đúng rập đó về sau

## Yêu cầu

- **Node.js 22 trở lên** (kiểm tra: `node -v`)
- Trình duyệt bất kỳ (Chrome/Edge/Firefox) + máy in A4

## Cài đặt

```bash
npm install
```

Đã kiểm chứng: xoá sạch `node_modules` rồi `npm ci` vẫn chạy được ngay.

> Lưu ý cho lúc **thêm plugin freesewing mới** về sau: package freesewing v4 khai thiếu vài
> dependency (họ publish thẳng `src/` và dựa vào workspace của monorepo). Gặp
> `ERR_MODULE_NOT_FOUND: Cannot find package '@freesewing/...'` thì cứ `npm i` đúng cái nó
> đòi rồi chạy lại. Không phải lỗi máy bạn.
>
> `npm audit` báo lỗi prototype pollution trong `lodash.unset` (kéo theo từ freesewing).
> App chạy local, dữ liệu do chính mình nhập → chấp nhận được. Cần xem lại nếu có ngày đưa
> lên mạng.

## Mở ứng dụng

```bash
npm run dev
```

Mở trình duyệt vào **http://localhost:5173**

Dừng server: `Ctrl + C` trong cửa sổ terminal.

## Cách dùng

1. **Chọn block** ở ô trên cùng (Bella cho nữ, Brian cho nam).
2. Mở mục **Số đo cơ thể**, nhập số đo của bạn (mm). Rê chuột lên tên số đo để xem cách đo.
   Bấm *Nạp số đo mẫu* nếu chỉ muốn thử nhanh.
3. Mở mục **Độ cử động**, kéo thanh trượt. Dấu `•` nghĩa là đã đổi khác mặc định.
   Bấm *Về mặc định* để trả lại.
4. Đặt **Chừa đường may** (mặc định 10 mm).
5. Bấm **Vẽ rập** — rập hiện bên phải.
6. Bấm **Lưu bản ghi .json** để giữ lại thông số. Cần khi muốn dựng lại đúng rập này sau
   khi mặc thử.
7. Bấm **In 1:1 (A4)**.

Số đo và độ cử động được nhớ tự động trong trình duyệt.

## In cho đúng tỉ lệ — đọc kỹ phần này

**Đây là chỗ hỏng ăn phổ biến nhất.** Máy in mặc định hay tự co bản in về ~94% và bạn sẽ
không nhận ra cho tới khi áo chật một size.

Trong hộp thoại in của trình duyệt:

| Mục | Đặt thành |
|---|---|
| Khổ giấy / Paper size | **A4** |
| Tỉ lệ / Scale | **100%** (hoặc *Tuỳ chỉnh: 100*) — **KHÔNG** chọn *Fit to page* / *Vừa khổ giấy* |
| Lề / Margins | **Mặc định** (Default) — trang đã tự chừa lề 10 mm |
| Hướng giấy | Dọc (Portrait) |

Sau khi in xong:

1. Lấy thước đo **ô vuông đỏ ở trang 1**. Cạnh phải đúng **100 mm**.
2. Sai số? Bỏ hết, chỉnh lại tỉ lệ in, in lại. **Đừng cắt vải.**

## Dán các trang lại

Mỗi trang có nhãn ở góc dưới: `hàng 2 / cột 3 — trang 8/18`.

- Xếp theo **hàng × cột**, không xếp theo số trang.
- Đường **gạch xanh lá** là mép chồng 10 mm: cắt tới đường đó rồi dán trang kế **chồng lên**.
- Đường gạch xám là khung trang, chỉ để tham chiếu.

Bộ Bella đầy đủ ra khoảng **18 trang A4** (6 cột × 3 hàng). Vài trang có thể trắng — bỏ đi.

## Lệnh khác

```bash
npm test         # chạy test (toán chia trang A4)
npm run build    # build bản tĩnh vào dist/
npm run preview  # xem thử bản build
```

## Cấu trúc

```
index.html                       giao diện
src/main.js                      form, vẽ rập, in, lưu trữ
src/tile.js                      cắt SVG thành trang A4 1:1
src/vi.js                        TOÀN BỘ chuỗi tiếng Việt (UI + nhãn trên rập)
test/tile.test.mjs               test chia trang
CLAUDE.md                        quy ước kỹ thuật, lộ trình
docs/00-research-and-feasibility.md   khảo sát & đánh giá khả thi
```

Muốn sửa chữ tiếng Việt: sửa `src/vi.js`, đừng sửa chỗ khác.

## Chưa có / cố ý chưa làm

- Ma-nơ-canh 3D (Phase 1)
- Upload ảnh → LLM phân tích → sinh rập (Phase 2)
- Mô phỏng vải rủ (Phase 3)
- Nhóm option chiết (darts), vòng nách (armhole), kiểu dáng (style) — chưa đưa ra giao diện.
  Chúng đổi *kiểu dáng*, không đổi *độ vừa vặn*; chỉnh trước khi mặc thử là mò.
- Xuất DXF cho máy cắt công nghiệp

**Quan trọng: rập chưa được kiểm chứng bằng người thật.** Bước còn thiếu của Phase 0 là in
ra, cắt vải mộc (toile), mặc thử, rồi chỉnh lại. Trước khi làm bước đó, coi mọi rập ở đây là
bản nháp.

## Nền tảng

Rập được dựng bằng [FreeSewing](https://freesewing.dev/) v4 (MIT) — thư viện rập tham số
bằng JavaScript, gồm cả phần khó nhất là offset đường may trên đường cong bezier. Block
`Bella` và `Brian` lấy nguyên từ FreeSewing.

Dự án cá nhân, chạy local, không có backend.
