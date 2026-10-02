---
status: accepted
date: 2026-10-02
supersedes: (thân dựng bằng service Python trên mỗi request, spec 2026-09-08 §4)
---

# Thân 3D là Anny bake sẵn, dựng ngay trên browser

Thân phải khớp số đo, vì nó dùng để kiểm chứng fit, không phải hình đại diện. Vì vậy vẫn dùng
Anny (Apache 2.0, asset CC0), nhưng tính sẵn một lần bằng Python thành **gói dữ liệu thân**.
Browser tự fit chiều cao/cân nặng và giải 9 target. Python không còn cần lúc chạy app.

Gói nhỏ được nhờ hai điều đã đo trên anny 0.6.0:

- Mesh rest pose chỉ là `template + Σ w·blendshape`, không có skinning.
- Khi cố định age = muscle = proportions = 0.5 và gender theo block, mọi blendshape macro gộp
  được thành 5 hình theo các hệ số {W_min, W_max, h, h·W_min, h·W_max}. Sai khác ≤ 1,5e-4 mm.

Cả hai giới khoảng 2,2 MB, gồm 18 delta `measure-*` dùng chung.

## Considered Options

- **GLB tĩnh (Sketchfab, MrKaizen7, `assets/`) co giãn theo vòng/xương:** bị loại.
  - Không có morph target.
  - Dáng cách điệu: eo nữ ở 0,69H, ngực/eo/mông ~71/51/82 cm.
  - Ngực và mông không có xương riêng để co giãn.
  - Khớp được tại tầng đo nhưng đoán bừa giữa các tầng.
- **Hình học thủ tục (spec 2026-09-07):** đã thử rồi bỏ.
- **`annyjs` của NAVER (bản demo chạy trên browser):** chưa công bố, không có license.
- **SMPL/SMPL-X:** license non-commercial.
- **Thanh trượt gender liên tục:** không có rập nào tương ứng. Gender = block (Bella 1, Brian 0).

## Consequences

- Thước dây (`tape.py`) phải có bản JS. Kết quả phải khớp bản Python, có harness đối chiếu.
- Chiều cao giờ đổi theo số đo ngay, không cần bấm dựng lại.
- age, muscle, proportions bị khoá. Đổi chúng thì phải bake lại.
