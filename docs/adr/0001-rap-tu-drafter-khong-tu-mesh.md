---
status: accepted
date: 2026-09-07
---

# Rập sinh từ drafter tham số, không trải phẳng từ mesh 3D

Mảnh rập được dựng bằng drafter tham số hoá (freesewing) từ số đo. Không trải phẳng mesh 3D
bằng ABF++ hay LSCM. Lý do: mảnh trải phẳng bị méo, không có chiết, không may được. Rập phải
đúng theo cách dựng: chiết, ply, canh sợi, đường may. LLM chỉ chọn tham số trong schema, không
bao giờ sinh toạ độ. Thân 3D chỉ để kiểm chứng: thân hỏng thì app vẫn phải xuất được rập.

## Considered Options

- **Trải phẳng mesh (ABF++/LSCM):** bị loại. Xem `docs/00-research-and-feasibility.md`.
- **Research image-to-pattern (Sewformer, DressCode, ChatGarment):** bị loại. License mơ hồ,
  phụ thuộc Maya + Qualoth.
