# Spec — Ma-nơ-canh 3D tham số (Phase 1) — ĐÃ BỊ THAY THẾ

> **KHÔNG DÙNG SPEC NÀY.** Thay bằng
> [2026-09-08-3d-body-anny-design.md](2026-09-08-3d-body-anny-design.md).
>
> Spec này sai từ mục 2.1. Nó loại Anny dựa trên câu hỏi đặt sai: "ma-nơ-canh dựng từ số đo"
> được đem đối lập với "người thật", trong khi người dùng dùng từ "người thật" để chỉ *nhân
> vật ngoài đời*. Cái người dùng muốn từ đầu là thân người liền mạch kiểu Anny/GarmentCode.
>
> Lập luận "6 tham số không thể khớp 16 số đo" ở mục 2.1 cũng sai trên thực tế: Anny có thêm
> **20 target `measure-*`** của MakeHuman ngoài 6 phenotype. Đo được: 8/9 số đo khớp trong
> 2 mm. Giữ lại làm ghi chép về một quyết định sai và vì sao nó sai.

Ngày: 2026-09-07 · Trạng thái: **đã thay thế** · Phase 0 đã commit tại `fb67d7f`

## 1. Mục tiêu

Dựng ma-nơ-canh toàn thân trên web, biến đổi theo số đo cơ thể, nam và nữ, không giật lag.

Tiêu chí xong:

1. Đổi bất kỳ số đo nào → thân cập nhật tức thì, không khựng khi kéo thanh trượt.
2. Chu vi thân tại mỗi tầng **đúng bằng** số đo đã nhập, đo lại trên lưới đã sinh cũng đúng.
3. Sửa số đo ở form rập hay ở panel 3D đều được, không lệch nhau.
4. Nhìn phân biệt được nam / nữ.
5. Không cần nhập 38 số đo mới thấy được thân người.

**Không** nằm trong Phase 1: mặc trang phục lên thân, tư thế/chuyển động, đầu, bàn tay,
bàn chân, xuất mesh ra file, mô phỏng vải.

## 2. Quyết định thiết kế

### 2.1 Ma-nơ-canh sinh từ số đo, không dùng body model học máy

Chọn: sinh hình học thủ tục từ các lát cắt ngang.

Đã cân nhắc và **loại**:

- **Anny** (Naver, Apache 2.0) — model tham số vi phân được, asset CC0 từ MakeHuman/MPFB2.
- **SMPL / SMPL-X** — loại từ sớm vì license non-commercial (xem `CLAUDE.md`).
- **Lưới người có sẵn + co giãn theo vùng.**

Lý do loại: các model đó có ~6–10 tham số hình dáng, còn ta có 16–38 số đo.
**6 tham số không thể khớp đúng 16 số đo** — đây là giới hạn toán học. Dùng chúng thì
số đo chỉ khớp gần đúng và phải giải bài toán ngược (tối ưu) mỗi lần người dùng gõ một số.

Sinh thủ tục cho chu vi khớp **chính xác**, khiến yêu cầu (2) và (3) thành hệ quả của cấu
trúc chứ không phải thứ phải đi tối ưu. Đổi lại: trông ra ma-nơ-canh, không ra người thật.
Đây là đánh đổi có chủ đích và phù hợp — đây là ứng dụng may, không phải ứng dụng nhân vật.

Bộ sinh hình học nằm sau một interface `buildBody(measurements) → mesh` để sau này thay
bằng Anny/lưới có sẵn mà không phải viết lại giao diện.

### 2.2 Không có "tham số cơ thể" tách biệt

Số đo **chính là** tham số của thân. Vì vậy không tồn tại bài toán đồng bộ hai chiều: chỉ có
một kho trạng thái và hai giao diện cùng đọc-ghi lên nó.

## 3. Mô hình hình học

### 3.1 Trục dọc — neo tại eo

Tất cả khoảng cách dọc của freesewing đều đo từ eo hoặc từ HPS, nên eo làm mốc.
`y` tính bằng mm, gốc ở sàn, hướng lên.

```
y_sàn       = 0
y_eo        = waistToFloor
y_hps       = y_eo + hpsToWaistBack       (đỉnh thân — ma-nơ-canh không có đầu)
y_chân_cổ   = y_hps
y_vai_ngoài = y_hps - (shoulderToShoulder / 2) × tan(shoulderSlope)
y_ngực      = y_hps - hpsToBust
y_nách      = y_eo + waistToArmpit
y_chân_ngực = y_eo + waistToUnderbust
y_hông      = y_eo - waistToHips
y_mông_nở   = y_eo - waistToSeat
y_đũng      = y_eo - crotchDepth
y_đùi       = y_eo - waistToUpperLeg
y_gối       = y_eo - waistToKnee
y_cổ_chân   = 0.04 × y_hps                (xấp xỉ; freesewing không có số đo này)
```

Freesewing không có số đo `chiều cao`; chiều cao thân xấp xỉ `y_hps` cộng phần cổ.

Chân cổ và vai **cùng nằm ở `y_hps`** — HPS theo định nghĩa là chỗ vai giáp cổ. Đường vai
không nằm ngang mà dốc xuống theo `shoulderSlope`, nên đầu vai thấp hơn chân cổ. Đây là
chỗ duy nhất `shoulderSlope` được dùng; nếu bỏ qua thì vai phẳng như mắc áo.

**Bất biến:** dãy `y` phải giảm dần đúng thứ tự tầng. Với số đo cực đoan (rất thấp, rất mập)
các tầng có thể vượt nhau → phải kẹp (clamp) để giữ thứ tự. Có test riêng.

### 3.2 Tiết diện — siêu ê-líp

Mỗi tầng là một đường cong khép kín:

```
|x/a|^n + |z/b|^n = 1
```

- `a/b` — tỉ lệ **rộng / sâu**, tra theo tầng và theo giới (eo nam dày hơn, mông nữ rộng hơn)
- `n` — độ vuông của tiết diện (eo tròn hơn, lồng ngực dẹt hơn)
- lấy mẫu 64 điểm đều theo tham số góc

`a/b` và `n` quyết định **dáng**. Kích thước do bước chuẩn hoá quyết định.

### 3.3 Chuẩn hoá chu vi — thứ tự bắt buộc

```
1. sinh 64 điểm của tiết diện theo (a/b, n)
2. đắp bầu ngực (nếu là tầng ngực và giới nữ)     ← PHẢI trước bước 3
3. tính chiều dài cung thực tế bằng tổng đoạn thẳng
4. nhân toàn bộ điểm với  k = chu_vi_mục_tiêu / chiều_dài_cung
```

**Đảo bước 2 và 4 là sai.** Bầu ngực làm tăng chiều dài cung; chuẩn hoá trước rồi mới đắp
thì `chest` không còn đúng. Đây là lỗi im lặng — test bất biến ở mục 8 tồn tại để bắt nó.

Siêu ê-líp không có công thức chu vi dạng đóng, nên bắt buộc đo bằng lấy mẫu. Sai số của
xấp xỉ đa giác 64 cạnh nhỏ hơn nhiều so với dung sai 0.5mm.

**Ngoại lệ duy nhất: tầng vai.** `shoulderToShoulder` là *bề rộng*, không phải chu vi, nên
tầng vai định `a` trực tiếp và **bỏ qua bước 3–4**. Mọi tầng khác đều chuẩn hoá chu vi.

### 3.4 Bảng tầng

| Tầng | Chu vi lấy từ | Ghi chú |
|---|---|---|
| Chân cổ | `neck` | đỉnh thân |
| Vai | `shoulderToShoulder` | là **bề rộng** → định `a` trực tiếp, không chuẩn hoá chu vi |
| Nách | `highBust` | |
| Ngực | `chest` | nữ: đắp bầu ngực |
| Chân ngực | `underbust` | |
| Eo | `waist` | mốc neo |
| Hông | `hips` | |
| Mông nở | `seat` | |
| Đũng | nội suy giữa mông nở và đùi | |
| Đùi / gối / cổ chân | `upperLeg` / `knee` / `ankle` | mỗi chân một ống |
| Bắp tay / khuỷu / cổ tay | `biceps` / nội suy / `wrist` | mỗi tay một ống |

Đây là các tầng **có số đo**. Giữa chúng chèn thêm tầng nội suy để bề mặt mượt — tổng
khoảng 24 tầng cho thân. Số tầng là hằng số biên dịch, không phụ thuộc số đo (điều kiện của
mục 6.1).

### 3.5 Bầu ngực (giới nữ)

Đắp hai bướu vào nửa trước của tiết diện ngực:

- **Vị trí ngang:** `x = ±bustSpan / 2`
- **Vị trí dọc:** đỉnh tại `y_ngực`, tắt dần lên `y_nách` và xuống `y_chân_ngực`
- **Độ nhô:** suy từ `chest − underbust` — đây chính là cách xác định cỡ cúp áo ngực,
  nên không cần bắt nhập thêm số đo
- **Hàm tắt dần:** Gauss theo cả phương ngang lẫn phương dọc, để bầu ngực là khối liền
  chứ không phải một vành nổi ở đúng một tầng

### 3.6 Tay và chân

Ống thuôn dựng bằng chính cơ chế tiết diện ở trên, đặt dọc theo:

- **Tay:** từ đầu vai (`x = ±shoulderToShoulder / 2`, `y = y_hps`) xuống cổ tay.
  Chiều dài `shoulderToWrist`, khuỷu tại `shoulderToElbow`.
- **Chân:** từ đũng xuống sàn. Chiều dài `inseam`. Tâm mỗi chân đặt tại `x = ±a_hông / 2`.

**Mối nối vai–nách: thân và tay là hai lưới rời, cho lồng vào nhau ở vai.**
Không liền mạch. Khâu lưới (mesh stitching) tốn nhiều công và không phục vụ mục tiêu nào
của Phase 1; ma-nơ-canh thật cũng có đường nối ở vị trí đó.

## 4. Luồng dữ liệu

```
                  ┌──────────────┐
   form số đo ───▶│    store     │◀─── thanh trượt panel 3D
                  │ measurements │
                  └──────┬───────┘
                         │ notify
              ┌──────────┴──────────┐
              ▼                     ▼
        dựng lại lưới          vẽ lại rập
        (mỗi `input`)          (khi `change`)
```

Một nguồn sự thật, không vòng phản hồi, không lệch trôi.

### 4.1 Refactor bắt buộc: `src/store.js`

`main.js` hiện giữ trạng thái **trong chính các ô input DOM** (`readMeasurements()` đọc ngược
từ DOM). Cách đó chỉ đúng khi có một giao diện duy nhất; thêm panel 3D là hỏng.

`store.js` — một object cộng pub/sub, khoảng 20 dòng, không framework:

```js
{ design, measurements: {...}, estimated: [...tên số đo], easePct: {...}, sa }
```

`estimated` là **mảng**, không phải `Set` — nó phải đi qua `JSON.stringify` để vào
`localStorage`, mà `Set` serialize ra `{}`.

`main.js` chuyển sang đọc/ghi store thay vì DOM. Đây là điều kiện cần của Phase 1, không
phải dọn dẹp tuỳ hứng.

### 4.2 Nhịp cập nhật

| Việc | Kích hoạt | Chi phí |
|---|---|---|
| Dựng lại lưới 3D | mỗi `input` | < 1 ms |
| Vẽ lại rập | `change` (thả chuột) | ~30 ms |

## 5. Số đo thiếu

Thân cần ~38 số đo, block chỉ cần 11–16. Phần thiếu suy từ bộ mẫu `@freesewing/models`
bằng **hai** hệ số tỉ lệ độc lập:

```
k_chu_vi    = chest_người_dùng        / chest_mẫu
k_chiều_dài = hpsToWaistBack_người_dùng / hpsToWaistBack_mẫu
```

Áp `k_chu_vi` cho mọi số đo vòng, `k_chiều_dài` cho mọi số đo dài. Một hệ số duy nhất sẽ sai:
người thấp mập và người cao gầy có thể cùng vòng ngực.

**Số ước lượng phải hiện rõ là ước lượng** — nhãn xám kèm chữ "ước lượng"; bấm vào thì
chuyển thành số người dùng tự nhập và bỏ khỏi tập `estimated`. Để người dùng tưởng vòng
mông kia là số họ đo là cách nhanh nhất làm mất niềm tin vào cả tính năng.

Mẫu dùng để suy chọn theo block: Bella → `cisFemaleAdult38`, Brian → `cisMaleAdult38`.
Giới tính của thân bám theo block. Tách thành công tắc độc lập khi có nhu cầu thật.

## 6. Render và hiệu năng

Mượt là **hệ quả của cấu trúc**, không phải kết quả tối ưu:

1. **Số đỉnh cố định.** `24 tầng × 64 điểm` không đổi dù số đo thế nào → cấp phát
   `Float32Array` một lần, cập nhật ghi đè tại chỗ, bật `needsUpdate`. Không cấp phát mới,
   không rác GC, không dựng lại buffer GPU.
2. **Render theo yêu cầu.** Chỉ vẽ khi số đo đổi hoặc camera động. Không có vòng lặp
   `requestAnimationFrame` chạy vô hạn làm nóng máy khi không có gì thay đổi.
3. **Một lệnh vẽ.** Thân + 2 tay + 2 chân gộp vào một `BufferGeometry`.

Quy mô: ~3.000 đỉnh / ~6.000 tam giác. Pháp tuyến tính lại mỗi lần dựng (`computeVertexNormals`),
O(n), không đáng kể ở quy mô này.

Thư viện: **three.js (MIT)**, thuần, không react-three-fiber. Thêm ~150 KB gzip vào bundle
hiện tại 74 KB — chấp nhận được cho ứng dụng chạy local.

## 7. Giao diện

- Khu vực bên phải thành 2 tab: **Rập** | **Thân 3D**.
- Panel trái giữ nguyên, thêm mục **"Số đo thân"** cho các số đo chỉ thân dùng.
- Trên thân vẽ **vòng tầng đo**; rê chuột hiện tên tầng và số đo — vừa để định hướng, vừa là
  bằng chứng trực quan rằng chu vi khớp số đo.
- Điều khiển camera: xoay / thu phóng (OrbitControls). Không có tư thế, không có chuyển động.

Mọi chuỗi tiếng Việt vào `src/vi.js` như quy ước đã có trong `CLAUDE.md`.

## 8. Kiểm thử

Hình học tách hoàn toàn khỏi DOM nên chạy được bằng `node --test`, không cần trình duyệt.

**Bất biến chính:**

```
Với mọi tầng: chu vi ĐO LẠI TRÊN MẢNG ĐỈNH ĐÃ SINH ≈ số đo đầu vào (±0.5 mm)
```

Đo trên chính dữ liệu xuất ra, không đo trên công thức. Nếu bầu ngực làm sai chu vi, hoặc
thứ tự chuẩn hoá ở mục 3.3 bị đảo, test này bắt được ngay.

Test phụ:

1. Thứ tự tầng theo `y` không bị đảo với số đo cực đoan (rất thấp / rất mập / rất gầy).
2. Không có `NaN` trong mảng đỉnh với mọi đầu vào hợp lệ.
3. `estimate()` luôn trả về đủ bộ số đo mà `buildBody` cần.
4. Số đỉnh không đổi giữa hai lần dựng với số đo khác nhau (điều kiện của mục 6.1).

## 9. Cấu trúc file

```
src/store.js            trạng thái + pub/sub
src/body/levels.js      số đo → bảng tầng (y, chu vi mục tiêu, tỉ lệ dáng)
src/body/section.js     siêu ê-líp + bầu ngực + chuẩn hoá chu vi
src/body/mesh.js        bảng tầng → đỉnh/chỉ số (loft thân, ống tay chân)
src/body/estimate.js    suy số đo thiếu
src/view3d.js           cảnh three.js, nối vào store
test/body.test.mjs
```

Sửa: `src/main.js` (chuyển sang store), `index.html` (tab), `src/app.css`, `src/vi.js`.

## 10. Nguồn và ghi công

Ghi vào `README.md` đúng như bảng dưới. Nói rõ cái gì fork, cái gì không.

| Nguồn | License | Quan hệ |
|---|---|---|
| [FreeSewing](https://freesewing.dev/) v4 | MIT | **Dùng trực tiếp qua npm, KHÔNG fork.** Block Bella/Brian là code của họ. |
| [three.js](https://threejs.org/) | MIT | Dùng qua npm. |
| [GarmentCode](https://github.com/maria-korosteleva/GarmentCode) (ETH) | MIT | **Không dùng dòng code nào.** Chỉ tham khảo ý tưởng tham số hoá rập. |
| [Anny](https://github.com/naver/anny) (Naver) | Apache 2.0 | **Không dùng code, không dùng asset.** Cân nhắc rồi loại — xem mục 2.1. |
| MakeHuman / MPFB2 | CC0 | **Không dùng asset.** Cân nhắc rồi loại — xem mục 2.1. |

**Hiện dự án không fork gì cả.** README phải viết đúng câu đó, không để mập mờ khiến người
đọc tưởng có fork.

## 11. Rủi ro

| Rủi ro | Xử lý |
|---|---|
| Đảo thứ tự đắp-bầu-ngực và chuẩn hoá chu vi | Test bất biến mục 8 |
| Tầng vượt nhau với số đo cực đoan | Kẹp thứ tự `y` + test |
| Số ước lượng bị hiểu nhầm là số đo thật | Nhãn "ước lượng" rõ ràng, mục 5 |
| Refactor store làm hỏng Phase 0 | Test `tile.test.mjs` hiện có phải tiếp tục xanh |
| Trôi sang làm việc của Phase 2/3 | Mục "ngoài phạm vi" ở mục 1 |
| Mối nối vai xấu | Chấp nhận. Ghi `ponytail:` kèm đường nâng cấp (khâu lưới) |
