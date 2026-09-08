# Spec — Thân người 3D bằng Anny (Phase 1, bản 2)

Ngày: 2026-09-08 · Trạng thái: chờ duyệt
**Thay thế [spec 2026-09-07](2026-09-07-3d-mannequin-design.md)**, vốn sai từ mục 2.1.

## 0. Vì sao có bản 2

Bản 1 hỏi sai câu. Nó đặt "ma-nơ-canh dựng từ số đo" đối lập với "người thật", trong khi
"người thật" theo cách người dùng dùng từ nghĩa là *nhân vật ngoài đời*. Cái người dùng
muốn từ đầu là **thân người liền mạch kiểu [Anny](https://github.com/naver/anny) /
GarmentCode** — không phải khối hình học ghép lại.

Bản 1 đã cài đặt xong và **bị vứt bỏ**: `src/body/*` cùng test của nó. Lý do vứt chứ không
giữ làm dự phòng: `CLAUDE.md` nói 3D là để *kiểm chứng*; một thân sai dáng còn tệ hơn không
có thân nào, và bảo trì hai bộ hình học là lãng phí.

Mọi con số dưới đây **đo được trên máy này**, không lấy từ tài liệu.

## 1. Mục tiêu

Thân người 3D đầy đủ, nam và nữ, biến đổi theo số đo, chỉnh được từ cả form rập lẫn panel
3D, không giật lag.

Tiêu chí xong:

1. Thân **trông ra người** — mesh liền mạch có đầu, tay, chân, không phải khối ghép.
2. Đổi số đo → thân cập nhật, kéo thanh trượt không khựng.
3. Số đo khớp trong dung sai đã công bố; phần **không khớp được phải hiện rõ**, không giấu.
4. Sửa số đo ở form rập hay panel 3D đều được, không lệch nhau.
5. Không cần nhập 38 số đo mới thấy được thân.

**Không** thuộc Phase 1: mặc trang phục lên thân, tư thế/chuyển động, mô phỏng vải.

## 2. Anny — những gì đã kiểm chứng

`anny 0.6.0`, cài bằng `pip install anny` (47 MB) + `torch` CPU.

| Hạng mục | Số đo được |
|---|---|
| License | Code **Apache 2.0**; asset MakeHuman/MPFB2 **CC0**. Topology SMPL-X tải riêng — **không dùng** |
| Mesh | 13.718 đỉnh, 27.420 tam giác |
| Tham số phenotype | `gender, age, muscle, weight, height, proportions`, mỗi cái ∈ [0,1] |
| Local change | 256 target; trong đó **20 target `measure-*`** của MakeHuman |
| Khởi tạo model | 2,8 s khi chỉ nạp 9 target cần dùng (78 s nếu nạp cả 256 — **đừng nạp cả**) |
| Forward pass | 30 ms |
| Hệ toạ độ | **mét, trục z hướng lên**. Nữ = `gender 1.0` |
| Anthropometry có sẵn | chỉ `height, mass, volume, bmi, waist_circumference` — **không đủ**, phải tự đo |

20 target `measure-*` ánh xạ gần 1:1 sang số đo freesewing: `bust-circ`, `underbust-circ`,
`waist-circ`, `hips-circ`, `neck-circ`, `thigh-circ`, `knee-circ`, `upperarm-circ`,
`wrist-circ`, `ankle-circ`, `calf-circ`, `shoulder-dist`, `napetowaist-dist`…

Đây là điều bản 1 không biết, và nó thay đổi mọi thứ: **khớp số đo không còn là bài toán
phải tự giải.**

## 3. Ba tính chất làm nên kiến trúc

Cả ba đều đo được, không suy đoán.

### 3.1 Target là tuyến tính từng khúc, và **chồng chất chính xác**

Ở một phenotype cố định, với **hai delta mỗi target** (một tại `+1`, một tại `−1`):

```
V(t) = V₀ + Σ ( tⱼ·Δ⁺ⱼ  nếu tⱼ ≥ 0,  |tⱼ|·Δ⁻ⱼ  nếu tⱼ < 0 )
```

Sai số tối đa trên mọi đỉnh, với 5 tổ hợp ngẫu nhiên trong [−1.5, 1.5]: **0,0001 mm**.

Phải là **hai** delta. `measure-bust-circ` có `cos(Δ⁺, Δ⁻) = −0.78` → nhánh tăng và nhánh
giảm là **hai target khác nhau** của MakeHuman, không phải ảnh gương. Dùng một delta cho
cả hai chiều gây sai tới **19,8 mm** ở nhánh âm. (`waist`, `underbust` có cos = −1.0, là ảnh
gương thật, nhưng gửi cả hai cho đồng nhất — tốn không đáng kể.)

**Hệ quả: browser tự dựng mesh khi kéo thanh trượt. Không gọi mạng, không có độ trễ.**

### 3.2 Số đo là hàm tuyến tính của target

Với tầng đo đã khoá, số đo cũng tuyến tính theo target:

```
m = m₀ + J⁺·t⁺ + J⁻·t⁻        (J là ma trận 9×9)
```

Sai số tối đa qua 6 tổ hợp ngẫu nhiên: **1,72 mm**.

**Hệ quả lớn: browser KHÔNG cần cài lại thuật toán đo mesh bằng JS.** Nó nhận `m₀` và hai ma
trận `J`, rồi giải hệ 9×9 để đi từ số đo mong muốn ra giá trị target. Chưa tới 1 ms.

Độ nhạy đường chéo (mm số đo trên mỗi đơn vị target, nhánh dương / nhánh âm):

| | chest | underbust | waist | seat | neck | upperLeg | biceps | wrist | knee |
|---|---|---|---|---|---|---|---|---|---|
| + | 162 | 84 | 89 | 175 | 51 | 40 | 81 | 57 | 70 |
| − | −163 | **−27** | −86 | −87 | −36 | −26 | −82 | −24 | −40 |

`underbust` lệch nhánh nặng nhất (+84 / −27) — nó rất khó *giảm*.

### 3.3 Các số đo ghép chéo rất mạnh

| Đổi | Kéo theo | mm / đơn vị |
|---|---|---|
| waist | underbust | **+92** |
| underbust | chest | **+92** |
| seat | upperLeg | **+73** |
| seat | waist | +28 |
| chest | underbust | +18 |

**Hệ quả: phải giải cả hệ cùng lúc.** Chỉnh từng số một (Gauss-Seidel) mất 21 s và vẫn kẹt,
vì các số đo đánh nhau. Giải hệ 9×9 xử lý đúng chuyện này và tức thì.

## 4. Kiến trúc

```
browser (three.js, store, UI đã có)
    │  POST /api/fit  { số đo }        ← chỉ khi đổi giới / chiều cao / cân nặng (~2 s)
    │  ◀ V₀ + chỉ số + 18 delta + m₀ + J⁺ + J⁻ + phần lệch
    │
    │  kéo thanh trượt số đo           ← giải 9×9 rồi cộng delta, ngay trong browser
    ▼
service Python (localhost): Anny + thước dây + fit phenotype
```

- **Python chỉ chạy khi phenotype đổi.** Mọi thứ khác nằm trong browser.
- Vite proxy `/api` sang cổng Python → **không có CORS**.
- Nếu service tắt: tab 3D báo lỗi rõ ràng, **phần rập vẫn chạy nguyên vẹn**
  (`CLAUDE.md`: "Nếu 3D chết, app vẫn phải xuất được rập").

### 4.1 Service

Dùng `http.server` của thư viện chuẩn. Hai endpoint, chạy localhost, Vite đã lo proxy —
thêm FastAPI/uvicorn chỉ để có 2 route là thừa.

`POST /api/fit` trả về một khối nhị phân:

```
[uint32 headerLen][JSON header (utf-8)][float32 V₀][int32 indices]
[mỗi target: uint32 n, int32 idx[n], float32 vec[n*3]] × 18
```

Header chứa `m₀`, `J⁺`, `J⁻`, tên target, tầng đo, phần lệch, phenotype, số lượng.

Kích thước thật: mesh 161 KB + delta thưa **~200 KB** (dày sẽ là 1.447 KB — mỗi target chỉ
đụng 446–1137 đỉnh nên gửi thưa).

### 4.2 Đơn vị — chỗ dễ sai

Anny dùng **mét, z hướng lên**. Dự án dùng **mm, y hướng lên** (`CLAUDE.md`).
Đổi ở **đúng một chỗ**: biên của service, ngay trước khi đóng gói. Trong Python giữ nguyên
mét/z-up để khớp thư viện; browser chỉ nhận mm/y-up.

## 5. Thước dây — nơi hai lỗi đã xảy ra

Đo thân là chỗ khó nhất, và tôi đã sai hai lần. Cả hai đều ghi lại để không lặp.

### 5.1 Tầng đo tìm theo GIẢI PHẪU, rồi KHOÁ

**Không được** dùng `hpsToBust`, `hpsToWaistFront` làm độ cao. Chúng đo **dọc theo bề mặt
cơ thể**, vòng qua bầu ngực, nên dài hơn khoảng cách thẳng đứng. Dùng làm độ cao khiến tầng
mông rơi xuống dưới đũng và đo thành hai chân.

**Không được** neo vào `BASE_MESH_WAIST_VERTICES` của MakeHuman rồi bước theo số đo dọc:
vòng eo của mesh nằm **thấp hơn eo may mặc ~250 mm**.

Cách đúng:

| Tầng | Cách tìm |
|---|---|
| eo | vòng đỉnh `BASE_MESH_WAIST_VERTICES` của mesh |
| nách | cao nhất mà mặt cắt còn tách thành **3 vòng** (thân + 2 tay) |
| ngực | chu vi **lớn nhất** giữa eo và nách |
| chân ngực | chu vi **nhỏ nhất** giữa eo và ngực |
| đũng | cao nhất mà mặt cắt tách thành **hai chân** (một vòng x>0, một vòng x<0) |
| mông nở | chu vi **lớn nhất** giữa đũng và eo |
| cổ | thẳng từ xương `neck01` + 15 mm. **Không đi tìm "vòng hẹp nhất"** — cách đó bắt nhầm một vòng 150 mm |

**Tìm một lần sau bước phenotype, rồi KHOÁ.** Nếu tầng chạy theo trong lúc fit thì "chỗ hẹp
nhất" tụt dần khi ngực nở — mục tiêu tự chạy khỏi chính nó, và phần lệch kẹt ở −84 mm.

### 5.2 Tay chân cắt VUÔNG GÓC với xương

Tay buông sát thân, nên mặt phẳng **ngang** gộp cổ tay với thân làm một vòng → `NaN`.
Cắt bằng mặt phẳng vuông góc với đoạn xương, lấy vòng có trọng tâm gần điểm đo nhất. Đây
cũng là cách đo đúng ngoài đời: thước quanh cổ tay vuông góc với cẳng tay.

### 5.3 Chu vi = chu vi bao lồi

Thước dây kéo căng không lọt vào chỗ lõm. Lấy chu vi **bao lồi** của mặt cắt, không phải chu
vi đường viền.

## 6. Quy trình fit

**Bước 1 — phenotype (cần torch, ~1 s).** Nhị phân tìm `height` khớp chiều cao, rồi `weight`
khớp sai số trung bình của ngực/eo/mông. `gender` lấy theo block đang chọn.

**Bước 2 — khoá tầng đo, dựng mô hình tuyến tính (~0,5 s).** 18 forward pass ra `Δ±`,
18 lần đo ra `J±`.

**Bước 3 — giải target.** Giải `J·t = m_mong_muốn − m₀`, kẹp vào **[−2, +2]**, lặp lại vài
vòng trên nhánh dấu đúng.

Bước 3 chạy **trong browser**, mỗi lần người dùng đổi số đo.

### 6.1 Biên ±2, không phải ±1 — có bằng chứng

Người dùng đã duyệt cho target vượt ±1. Đo được:

| Biên | Số đo khớp trong 2 mm | Lệch chân ngực |
|---|---|---|
| ±1 | 7/9 | −84 mm |
| **±2** | **8/9** | **−17 mm** |
| ±3 | 8/9 | −2 mm nhưng ngực lệch +26 |

Chọn **±2**. Ảnh render ở ±2 vẫn ra người bình thường, không méo ở biên.

### 6.2 Phần lệch còn lại — nói thẳng

Fit trên bộ số đo nữ size 38 của freesewing, biên ±2:

```
chest 0 · waist 0 · seat 0 · neck 0 · upperLeg 0 · knee 0 · biceps 0 · wrist 0
underbust −17 mm
```

`underbust` là số đo khó nhất: nhánh giảm chỉ có −27 mm/đơn vị, và nó bị kéo mạnh bởi
`waist` (+92) lẫn `chest` (+18).

**Phần lệch phải hiện trên giao diện, từng số đo một.** Người dùng phải thấy "chân ngực:
bạn nhập 872, thân đang là 855, lệch −17" chứ không phải một thân trông đúng mà số thì sai.
Đây là ứng dụng may: số đo sai âm thầm là rập sai.

## 7. Giao diện

Giữ nguyên phần đã làm ở bản 1 — chúng không phụ thuộc hình học:
store, tab **Rập / Thân 3D**, panel **Số đo thân**, nhãn **ước lượng**, `src/vi.js`.

Thêm:

- **Bảng lệch** trong panel 3D: mỗi số đo, giá trị mong muốn, giá trị thân, phần lệch.
  Lệch > 5 mm tô màu cảnh báo.
- **Trạng thái service**: đang fit / sẵn sàng / không kết nối được.
- Vòng tầng đo giữ nguyên, nhưng vẽ tại tầng giải phẫu đã khoá, nhãn kèm phần lệch.

## 8. Kiểm thử

Hình học chuyển sang Python nên test cũng chuyển theo (`pytest`).

**Bất biến chính** — thay cho "chu vi bằng đúng số đo" của bản 1, vốn không còn đúng nữa:

```
Với mỗi số đo: | đo lại trên mesh đã dựng − giá trị service báo | < 1 mm
```

Nghĩa là service **không được nói dối** về thân nó vừa dựng. Nó được phép không khớp số đo
người dùng, nhưng phải báo đúng phần lệch.

Test khác:

1. **Chồng chất chính xác**: `V(t)` từ delta khớp `V(t)` từ Anny trong 0,01 mm. Đây là điều
   kiện để browser dựng mesh — hỏng cái này là hỏng "không giật lag".
2. **Jacobian tuyến tính**: `m₀ + J·t` khớp số đo thật trong 3 mm với t ngẫu nhiên ∈ [−1.5, 1.5].
3. **Thứ tự tầng**: nách > ngực > chân ngực > eo > mông nở > đũng, với cả nam lẫn nữ.
4. **Không NaN**: mọi số đo hữu hạn với số đo cực đoan (rất thấp/cao/mập/gầy).
5. **Đổi đơn vị**: mesh browser nhận được là mm, y-up, chân chạm y=0.
6. Test JS: bộ giải 9×9 hội tụ; kẹp target vào [−2,2]; parser nhị phân đọc đúng.

## 9. Cấu trúc file

```
service/
  pyproject.toml       khai báo anny + torch(cpu) + numpy
  body_service.py      http.server, 2 endpoint, đóng gói nhị phân
  anny_body.py         nạp model, fit phenotype, dựng Δ± và J±
  tape.py              cắt mặt phẳng, bao lồi, tầng giải phẫu, đo chi
  tests/test_tape.py   bất biến chính + 5 test kia
src/
  body3d.js            parse nhị phân, giải 9×9, dựng mesh (thay cho src/body/*)
  view3d.js            sửa: nhận mesh từ service
  main.js              sửa: gọi /api/fit, bảng lệch
vite.config.js         MỚI: proxy /api -> cổng Python
```

**Xoá**: `src/body/estimate.js`, `section.js`, `levels.js`, `mesh.js`, và `test/body.test.mjs`.
`estimate()` (suy số đo thiếu) **chuyển sang Python** vì service cần bộ số đo đầy đủ.

## 10. Nguồn và ghi công

`README.md` phải sửa: dự án **hiện có dùng asset của bên thứ ba**, khác với trước.

| Nguồn | License | Quan hệ |
|---|---|---|
| Anny (Naver Labs) | Apache 2.0 | **Dùng qua pip, không fork.** Mesh và blendshape là của họ. |
| MakeHuman / MPFB2 | CC0 | Asset gốc của Anny, kể cả 20 target `measure-*`. |
| FreeSewing v4 | MIT | Dùng qua npm, không fork. |
| three.js | MIT | Dùng qua npm, không fork. |
| SMPL-X topology | non-commercial | **Không cài, không dùng.** Anny có hỗ trợ nhưng phải tải riêng. |

## 11. Rủi ro

| Rủi ro | Xử lý |
|---|---|
| Dùng một delta thay vì hai | Test chồng chất; sai 19,8 mm ở nhánh âm |
| Tầng đo chạy theo trong lúc fit | Khoá sau bước phenotype; ghi rõ trong `tape.py` |
| Dùng `hpsToXxx` làm độ cao | Mục 5.1; test thứ tự tầng bắt được |
| Lẫn đơn vị mét/mm, z-up/y-up | Đổi tại đúng một chỗ; test riêng |
| Phần lệch bị giấu | Bảng lệch là **bắt buộc**, không phải tuỳ chọn |
| Service tắt làm hỏng cả app | Tab 3D hỏng riêng; rập không phụ thuộc |
| Cài torch nặng | `--index-url .../cpu`, ~200 MB; ghi trong README |
| Nạp cả 256 local change | 78 s khởi động thay vì 2,8 s. Chỉ nạp 9 target dùng tới |
