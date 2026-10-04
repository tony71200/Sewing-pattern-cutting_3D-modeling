# Pattern Studio

Ứng dụng web chạy local: nhập số đo cơ thể → sinh rập (sewing pattern) theo số đo → in ra
giấy A4 đúng tỉ lệ 1:1 để cắt vải.

Giao diện tiếng Việt, kể cả nhãn in trên rập (`Thân sau`, `Canh sợi`,
`Cắt 2 đối xứng bằng vải chính`…).

> **Đang ở Phase 1.** Hiện có: số đo → rập → in, và thân người 3D theo số đo.
> Phần LLM đọc ảnh trang phục **chưa làm**.
> Xem lộ trình đầy đủ trong [CLAUDE.md](CLAUDE.md), phân tích khả thi trong
> [docs/00-research-and-feasibility.md](docs/00-research-and-feasibility.md), và thiết kế
> thân 3D trong [spec Phase 1](docs/superpowers/specs/2026-09-08-3d-body-anny-design.md).
>
> Rập vẫn **chưa được kiểm chứng bằng người thật** — chưa in, chưa cắt toile, chưa mặc thử.

## Làm được gì

- Chọn block cơ bản: **Bella** (thân nữ) hoặc **Brian** (thân nam)
- Nhập số đo cơ thể (đơn vị **mm**), có tooltip mô tả **cách đo** từng số
- Chỉnh **độ cử động** (ease) bằng thanh trượt, hiện đồng thời `%` và số `mm` thật
- Chừa đường may (seam allowance) tuỳ chỉnh
- In 1:1 chia trang A4, có chồng mép để dán và **ô hiệu chuẩn 100 mm**
- Xuất bản ghi `.json` (số đo + ease + phiên bản) để tái tạo lại đúng rập đó về sau
- **Thân người 3D toàn thân** (nam/nữ) biến đổi theo số đo, xoay/thu phóng được
- **Bảng lệch từng số đo**: thân không phải lúc nào cũng khớp hết, chỗ nào lệch thì hiện ra,
  không giấu

## Yêu cầu

- **Node.js 22 trở lên** (kiểm tra: `node -v`)
- Trình duyệt bất kỳ (Chrome/Edge/Firefox) + máy in A4
- **Python 3.10 trở lên** — chỉ cho tab *Thân 3D*. Phần rập chạy được mà không cần Python.

## Cài đặt

**Máy mới thì nháy đôi `Setup.bat`** — nó kiểm tra Node/Python, cài npm, tạo `.venv`, tải
torch CPU và Anny. Chạy lại nhiều lần không sao: bước nào xong thì bỏ qua.

Hoặc làm tay:

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

### Service thân 3D (tuỳ chọn)

Bỏ qua bước này thì tab **Rập** vẫn chạy đầy đủ; chỉ tab **Thân 3D** là không dùng được.

```bash
python -m venv .venv
```

```bash
.venv/Scripts/python -m pip install torch --index-url https://download.pytorch.org/whl/cpu
```

```bash
.venv/Scripts/python -m pip install -e service[dev]
```

Bản torch CPU khoảng 200 MB. Không cần bản CUDA: dựng thân mất khoảng 1 giây trên CPU, và
sau đó browser tự lo phần kéo thanh trượt.

## Mở ứng dụng

**Nhấp đúp `RunApp.bat`.** Lần đầu nó cài thư viện và build (vài phút). Các lần sau nó mở
ngay `dist/index.html` trong trình duyệt, không cần server hay terminal. Sửa code xong thì chạy
`RunApp.bat rebuild`.

Muốn dùng tab **Thân 3D** thì **nhấp đúp `RunService.bat`** (cửa sổ riêng, để nguyên). Nó kiểm
tra `.venv`, thư viện và cổng 8791 trước khi chạy, và không tự đóng cửa sổ khi lỗi. Lần đầu mất
khoảng 10 giây để biên dịch kernel.

Chuyển từ bản `npm run dev` cũ sang? Số đo **không** tự theo sang (khác origin). Ở bản cũ bấm
**Lưu bản ghi .json**, sang bản mới bấm **Mở bản ghi .json**.

Gặp lỗi: xem [`docs/tai-lieu-loi.md`](docs/tai-lieu-loi.md).

## Cách dùng

1. **Chọn block** ở ô trên cùng (Bella cho nữ, Brian cho nam).
2. Mở mục **Số đo cơ thể**, nhập số đo của bạn (mm). Rê chuột lên tên số đo để xem cách đo.
   Bấm *Nạp số đo mẫu* nếu chỉ muốn thử nhanh.
3. Mở mục **Độ cử động**, kéo thanh trượt. Dấu `•` nghĩa là đã đổi khác mặc định.
   Bấm *Về mặc định* để trả lại.
4. Đặt **Chừa đường may** (mặc định 10 mm).
5. Bấm **Vẽ rập** — rập hiện bên phải.
6. Bấm **Lưu bản ghi .json** để giữ lại thông số. Cần khi muốn dựng lại đúng rập này sau
   khi mặc thử. **Mở bản ghi .json** nạp lại đúng số đo, cử động và đường may của file đó.
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
npm run dev      # phát triển, http://localhost:5173
npm run build    # build bản tĩnh vào dist/
npm run smoke    # mở dist/index.html bằng Chrome headless để kiểm
npm run preview  # xem thử bản build
npm run service  # service thân 3D, cổng 8791 (dùng .venv)
```

```bash
.venv/Scripts/python -m pytest service
```

## Cấu trúc

```
Setup.bat                        cài đặt trên máy mới (nháy đôi)
RunApp.bat                       mở ứng dụng (nháy đôi; "rebuild" để build lại)
RunService.bat                   khởi động service thân 3D (nháy đôi)
index.html                       giao diện
src/main.js                      form, vẽ rập, in, lưu trữ
src/store.js                     trạng thái dùng chung (form rập + panel 3D)
src/tile.js                      cắt SVG thành trang A4 1:1
src/vi.js                        TOÀN BỘ chuỗi tiếng Việt (UI + nhãn trên rập)
src/view3d.js                    cảnh three.js
src/body3d.js                    đọc gói nhị phân của service, giải hệ 9x9, dựng mesh
src/estimate.js                  suy số đo thiếu (bản sao logic ở service/estimate.py)
service/                         service Python chạy Anny
test/tile.test.mjs               test chia trang
test/store.test.mjs              test trạng thái
test/body3d.test.mjs             test parser + bộ giải phía browser
CLAUDE.md                        quy ước kỹ thuật, lộ trình
docs/00-research-and-feasibility.md   khảo sát & đánh giá khả thi
```

Muốn sửa chữ tiếng Việt: sửa `src/vi.js`, đừng sửa chỗ khác.

## Chưa có / cố ý chưa làm

- Mặc trang phục lên thân, tư thế/chuyển động, xuất mesh ra file
- Upload ảnh → LLM phân tích → sinh rập (Phase 2)
- Mô phỏng vải rủ (Phase 3)
- Nhóm option chiết (darts), vòng nách (armhole), kiểu dáng (style) — chưa đưa ra giao diện.
  Chúng đổi *kiểu dáng*, không đổi *độ vừa vặn*; chỉnh trước khi mặc thử là mò.
- Xuất DXF cho máy cắt công nghiệp

**Quan trọng: rập chưa được kiểm chứng bằng người thật.** Bước còn thiếu của Phase 0 là in
ra, cắt vải mộc (toile), mặc thử, rồi chỉnh lại. Trước khi làm bước đó, coi mọi rập ở đây là
bản nháp.

## Nguồn và ghi công

**Dự án này hiện không fork mã nguồn của ai.** Mọi thư viện đều dùng nguyên bản qua npm.

### Đang dùng

| Nguồn | License | Quan hệ |
|---|---|---|
| [FreeSewing](https://freesewing.dev/) v4 | MIT | **Dùng qua npm, không fork.** Toàn bộ việc dựng rập, kể cả phần khó nhất là offset đường may trên đường cong bezier. Block `Bella` và `Brian` là code của FreeSewing, không phải của dự án này. |
| [three.js](https://threejs.org/) | MIT | **Dùng qua npm, không fork.** Render thân 3D. |
| [Anny](https://github.com/naver/anny) (Naver Labs) | Apache 2.0 | **Dùng qua pip, không fork.** Mesh người và toàn bộ blendshape là của họ. |
| MakeHuman / MPFB2 | CC0 | Asset gốc của Anny, kể cả 20 target `measure-*` dùng để khớp số đo. |
| [Vite](https://vite.dev/) | MIT | Công cụ build/dev server. |

Phần do dự án này viết: giao diện, từ điển tiếng Việt (`src/vi.js`), và bộ chia trang A4 1:1
(`src/tile.js`).

### Đã cân nhắc rồi loại

Các dự án dưới đây liên quan trực tiếp tới bài toán, đã đọc kỹ khi thiết kế, nhưng **không
lấy code, không lấy asset, không fork**:

| Nguồn | License | Vì sao không dùng |
|---|---|---|
| [GarmentCode](https://github.com/maria-korosteleva/GarmentCode) (ETH Zurich) | MIT | Python. Chỉ tham khảo ý tưởng tham số hoá rập theo component. |
| [SMPL / SMPL-X](https://smpl-x.is.tue.mpg.de/modellicense.html) | non-commercial research | License cấm dùng thương mại. Anny có hỗ trợ topology SMPL-X nhưng phải tải riêng — **không cài, không dùng**. |
| [Sewformer](https://github.com/sail-sg/sewformer), [DressCode](https://github.com/IHe-KaiI/DressCode), [ChatGarment](https://chatgarment.github.io/) | không rõ / hỗn hợp | Code nghiên cứu, phụ thuộc Maya + Qualoth (phần mềm thương mại). Đọc để lấy kiến trúc. |

Chi tiết khảo sát: [docs/00-research-and-feasibility.md](docs/00-research-and-feasibility.md).

---

Dự án cá nhân, chạy local, không có backend.
