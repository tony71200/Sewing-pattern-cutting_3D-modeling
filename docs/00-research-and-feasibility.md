# Khảo sát & đánh giá khả thi

Ngày: 2026-09-07. Nguồn: xem cuối file.

## 1. Tóm tắt: dự án này là 3 dự án dán lại

| Thành phần | Độ khó thật | Trạng thái ngoài đời |
|---|---|---|
| Số đo → ma-nơ-canh 3D tham số | Dễ–trung bình | **Đã giải xong.** Lấy về mà dùng. |
| Ảnh → hiểu trang phục | Trung bình | VLM làm được — *nếu* output là tham số có schema |
| Trang phục → rập cắt được thật | **Rất khó** | Nơi 90% dự án dạng này chết |
| Drape 3D trong browser | Khó | Chạy được, nhưng "gần đúng", không phải CLO3D |

Phần bạn nghĩ là khó (3D) là phần dễ nhất. Phần bạn mô tả bằng một câu
("xuất ra mẫu ráp để cắt trên vải") là phần khó nhất.

## 2. Cái gì đã có sẵn — đừng viết lại

### Người 3D theo số đo

- **Anny** (Naver Labs) — Apache 2.0, asset CC0 lấy từ MakeHuman/MPFB2. Tham số hoá theo
  **phenotype nhân trắc học** (giới, tuổi, cơ, cân nặng, chiều cao, tỉ lệ), hiệu chuẩn theo
  thống kê WHO, differentiable, PyTorch. → **Lựa chọn đúng.**
- **MakeHuman / MPFB2** — asset CC0, có Blender add-on. Nguồn gốc của Anny.
- **SMPL / SMPL-X** — phổ biến nhất trong paper, nhưng license **non-commercial research
  only**; thương mại phải mua qua Meshcapade. Dùng cho dự án cá nhân thì hợp lệ, nhưng nếu
  có ngày muốn mở ra thì phải viết lại → đừng dựng nền lên nó.

Cảnh báo: các model này nhận **tham số shape**, không nhận thẳng "vòng ngực 92cm". Đi từ số
đo sang tham số là bài toán tối ưu ngược (đo trên mesh → sai số → hiệu chỉnh). Có sẵn
`GarmentMeasurements` (đi kèm GarmentCode) làm việc này. Đây là 1–2 tuần công việc, không
phải một buổi tối.

### Rập tham số hoá

- **GarmentCode** (ETH Zurich, Korosteleva & Sorkine-Hornung) — **MIT**. DSL kiểu OOP mô tả
  rập theo component phân cấp; có configurator online; có `GarmentCodeData` 115k mẫu 3D +
  rập. → **Tài liệu tham khảo giá trị nhất cho dự án này.** Python.
- **freesewing** — MIT, thư viện **JavaScript** rập tham số: thiết kế viết bằng code, nhận số
  đo tuỳ chỉnh, xuất SVG/PDF. Repo GitHub đã archive, nhà mới ở
  `codeberg.org/freesewing/freesewing`. → Nếu app là web JS, đây là nền gần nhất.
- **Seamly2D** (GPLv3+, fork từ Valentina 2017) / **Valentina** — desktop, công thức tham số,
  thợ may thật đang dùng. Không nhúng được vào web, nhưng **cách họ mô tả rập là chuẩn mực
  nên bắt chước**.

### Ảnh → rập (nghiên cứu)

- **Sewformer** (SAIL) — transformer, dự đoán panel + quan hệ ráp từ 1 ảnh, có checkpoint.
  **Nhưng**: mô phỏng cần **Maya + Qualoth** (thương mại), script Windows, license không ghi rõ.
- **ChatGarment** — VLM fine-tune, **xuất JSON** (loại/kiểu trang phục + thuộc tính số) rồi
  nạp vào **GarmentCode**. → **Chính xác là kiến trúc nên chép.**
- **AIpparel** — foundation model đa mô thức, 120k trang phục, tokenize rập cho LLM học.
- **DressCode, GarmentX, DressWild, GarmageNet, Design2GarmentCode, Image2Garment** — cùng
  hướng, 2024–2026. Lĩnh vực đang chạy rất nhanh.

Tất cả đều là code nghiên cứu: cần GPU, phụ thuộc lộn xộn, license mơ hồ, không ai bảo trì
cho bạn. **Đọc để lấy kiến trúc, đừng đưa vào pipeline.**

### Drape trong browser

- WebGPU + XPBD chạy thật: paper 2025 đo được va chạm real-time giữa vải 4K–100k node và mesh
  100k tam giác. Có `three-simplecloth`, các demo XPBD WebGPU.
- **"OpenClo" — cẩn thận.** Kết quả tìm kiếm mô tả rất hấp dẫn (2D editor + 3D + XPBD Rust/
  WASM + tech pack PDF). **Repo `github.com/sssamuelll/openclo` trả 404** khi kiểm tra trực
  tiếp (cả HTML lẫn API). Coi như không tồn tại cho tới khi tự xác minh được.

## 3. Cái không khả thi — nói thẳng

**a) "LLM tái tạo trang phục từ ảnh" ở mức trung thực.** Từ một tấm ảnh, VLM không biết:
loại vải và độ rủ, độ co giãn, lượng ease, cấu trúc bên trong (lót, dựng, viền, nẹp), mặt sau
của áo, tỉ lệ thật khi không có vật chuẩn tỉ lệ, và quan trọng nhất: **nếp gấp trên ảnh là do
đường cắt hay do tư thế người mẫu**. Kỳ vọng đúng là *"cùng loại, cùng dáng, gần đúng"*, không
phải *"bản sao"*.

**b) Suy số đo cơ thể từ ảnh.** Cần vật chuẩn tỉ lệ, sai số cộng dồn, và lệch 2cm vòng ngực là
hỏng áo. Bắt nhập tay.

**c) Đi đường 3D → trải phẳng → rập.** Bẫy lớn nhất, và trực giác nói nó đúng. Vải **không
phải mặt khả triển**: trải phẳng bằng ABF++/LSCM luôn sinh méo. Rập thật cần chiết (dart),
đường ráp đặt đúng chỗ, canh sợi thẳng thớ, ease. Nghiên cứu nghiêm túc ("Computational
pattern making from 3D garment models", ETH) phải thêm hẳn: đối xứng đường ráp, đặt chiết,
canh sợi, và độ đo méo mô hình hoá tính dị hướng của vải dệt. → **Đó là cả một luận án, không
phải một module.** Đi ngược lại: rập tham số hoá đúng theo construction, rồi drape lên để
kiểm chứng.

**d) Drape trong browser ngang CLO3D.** CLO có ~15 năm kỹ thuật về seam sewing,
self-collision, solver ổn định. Bạn sẽ có "hình dung được", không phải "tin được".

**e) Không có vòng lặp thử thật.** Không thể biết rập đúng hay sai nếu chưa cắt vải mộc và mặc
thử. Thiếu bước này thì toàn bộ pipeline chỉ là đồ hoạ.

## 4. Cái khả thi và đáng làm

- Form số đo → drafter tham số → SVG/PDF tile A4 có seam allowance + notch + canh sợi. **Tự nó
  đã là sản phẩm dùng được.**
- Ma-nơ-canh 3D biến đổi theo số đo (Anny/MakeHuman + three.js morph targets).
- VLM → **spec JSON schema chặt, thiên về enum** (loại: sơ mi / cổ: bẻ ve / tay: raglan dài /
  dáng: ôm…) + vài số liên tục. Người dùng **sửa spec trong form** rồi mới draft.
- Thư viện block cơ bản tự viết dần (thân, tay, cổ, chân váy). Đây mới là khối lượng công việc
  thật — không phải lời gọi LLM.
- Drape XPBD xem trước, dán nhãn "gần đúng".

## 5. Ước lượng thật (làm một mình, ngoài giờ)

| Phase | Nội dung | Thời gian |
|---|---|---|
| 0 | Form số đo + 1 block + xuất PDF cắt được + **mặc thử toile** | 3–6 tuần |
| 1 | Ma-nơ-canh 3D theo số đo | 3–5 tuần |
| 2 | Schema spec + VLM + form sửa + 4–6 block | 6–10 tuần |
| 3 | Drape XPBD | 2–4 tháng, và có thể không bao giờ đủ tốt |

Nếu phase 0 không xong trong 6 tuần, phần còn lại không có ý nghĩa.

## 6. Rủi ro cần theo dõi

1. **Ease và canh sợi bị bỏ quên** → rập nhìn đúng, mặc sai. Đưa vào schema ngay từ đầu.
2. **Vải co / vải co giãn** → knit cần stretch factor, woven cần độ co sau giặt. Là input.
3. **LLM sai thầm lặng** → luôn cho người xem và sửa spec trước khi draft.
4. **Trôi sang làm 3D vì nó vui hơn** → 3D không xuất được rập.
5. **License** → không SMPL nếu có ý định mở rộng.

## Nguồn

- [GarmentCode (GitHub, MIT)](https://github.com/maria-korosteleva/GarmentCode) · [paper](https://arxiv.org/pdf/2306.03642) · [GarmentCodeData](https://www.ecva.net/papers/eccv_2024/papers_ECCV/papers/07721.pdf)
- [ChatGarment](https://chatgarment.github.io/) · [arXiv](https://arxiv.org/pdf/2412.17811)
- [AIpparel](https://georgenakayama.github.io/AIpparel/) · [arXiv](https://arxiv.org/pdf/2412.03937)
- [Sewformer (GitHub)](https://github.com/sail-sg/sewformer) · [TOG paper](https://dl.acm.org/doi/abs/10.1145/3618319)
- [DressCode](https://github.com/IHe-KaiI/DressCode) · [Design2GarmentCode](https://arxiv.org/html/2412.08603v3) · [DressWild](https://arxiv.org/html/2602.16502v1) · [GarmentX](https://arxiv.org/pdf/2504.20409)
- [Anny (Naver, Apache 2.0)](https://github.com/naver/anny) · [blog](https://europe.naverlabs.com/blog/anny-a-free-to-use-3d-human-parametric-model-for-all-ages/) · [arXiv](https://arxiv.org/abs/2511.03589)
- [MPFB / MakeHuman license](https://static.makehumancommunity.org/mpfb/faq/why_use.html)
- [SMPL-X model license](https://smpl-x.is.tue.mpg.de/modellicense.html)
- [freesewing](https://freesewing.dev/) · [Seamly2D (GPLv3+)](https://github.com/FashionFreedom/Seamly2D) · [Valentina](https://en.wikipedia.org/wiki/Valentina_%28software%29)
- [Computational pattern making from 3D garment models (ETH)](https://igl.ethz.ch/projects/computational-patternmaking/) · [garment-flattening](https://github.com/CorentinDumery/garment-flattening) · [Inverse Garment Modeling](https://arxiv.org/pdf/2403.06841)
- [Real-Time Cloth Simulation Using WebGPU](https://arxiv.org/abs/2507.11794) · [three-simplecloth](https://github.com/bandinopla/three-simplecloth) · [WebGPU XPBD cloth](https://github.com/ccincotti3/webgpu_cloth_simulator)
