"""Mô hình tuyến tính quanh một phenotype.

Đo được trên máy này:
  * với HAI delta mỗi target, chồng chất chính xác tới 0.0001mm
  * số đo là hàm tuyến tính của target trong 1.72mm
Hai tính chất đó cho phép browser dựng mesh và giải số đo mà không gọi service.
"""
from dataclasses import dataclass
import numpy as np

from anny_body import (TARGETS, NAMES, body, anatomical_levels, limb_taps, measure_body)


@dataclass
class LinearModel:
    V0: np.ndarray          # (N,3) mét, z-up
    dpos: dict              # target -> (N,3)
    dneg: dict              # target -> (N,3)
    m0: np.ndarray          # (9,) mm
    Jpos: np.ndarray        # (9,9) hàng = số đo, cột = target
    Jneg: np.ndarray
    levels: dict
    taps: dict
    phenotype: dict
    H0: np.ndarray


def build_linear(model, phenotype):
    V0, H0 = body(model, phenotype, None)
    levels = anatomical_levels(V0, H0, model)   # tìm MỘT LẦN rồi khoá
    taps = limb_taps(H0, model)
    meas = lambda V: np.array([measure_body(V, H0, levels, taps, model)[n] for n in NAMES])
    m0 = meas(V0)

    dpos, dneg = {}, {}
    Jp = np.zeros((9, 9))
    Jn = np.zeros((9, 9))
    for j, key in enumerate(TARGETS):
        Vp, _ = body(model, phenotype, {key: 1.0})
        Vn, _ = body(model, phenotype, {key: -1.0})
        dpos[key] = Vp - V0
        dneg[key] = Vn - V0
        Jp[:, j] = meas(Vp) - m0
        Jn[:, j] = meas(Vn) - m0
    return LinearModel(V0, dpos, dneg, m0, Jp, Jn, levels, taps, dict(phenotype), H0)


def apply(lin, t):
    """Dựng mesh từ vector target. Nhánh dấu phải đúng — xem test_bust_co_hai_nhanh."""
    V = lin.V0.copy()
    for j, key in enumerate(TARGETS):
        x = float(t[j])
        V += (x * lin.dpos[key]) if x >= 0 else ((-x) * lin.dneg[key])
    return V


def predict(lin, t):
    t = np.asarray(t, float)
    return lin.m0 + lin.Jpos @ np.where(t >= 0, t, 0) + lin.Jneg @ np.where(t < 0, -t, 0)


def solve_targets(lin, want, limit=2.0, iters=4):
    """Newton có tập hoạt động (active set) trên mô hình tuyến tính từng khúc.

    Ba chi tiết, mỗi cái đều cần thiết — bỏ cái nào cũng tụt kết quả (đo trên bộ số đo
    nữ size 38, biên ±2):

    1. Giải CẢ HỆ, không chỉnh từng số một: các số đo ghép chéo rất mạnh
       (eo -> chân ngực khoảng +92mm/đơn vị) nên chỉnh lẻ sẽ đánh nhau.
    2. GHIM target chạm biên rồi giải lại cho phần còn lại. Newton thường vẫn tính bước
       như thể biến đã ghim còn di chuyển được -> kẹt ở 6/9.
    3. BỎ số đo j khỏi mục tiêu khi target j đã ghim. Đường chéo Jacobian trội hẳn nên
       target ghim ở biên nghĩa là số đo đó ngoài tầm với; giữ nó lại chỉ khiến bộ giải
       bóp méo số đo khác để đuổi theo — vòng eo bị đẩy lệch +9mm chỉ để cứu chân ngực.
       Với ứng dụng may đó là đánh đổi sai: eo lái rập trực tiếp.

    Chỉ (1): 6/9.  (1)+(2): 7/9 nhưng eo lệch 9mm.  Cả ba: 8/9, phần lệch dồn hết vào
    đúng số đo không thể đạt.
    """
    want = np.asarray(want, float)
    t = np.zeros(9)
    for _ in range(iters):
        J = np.where(t >= 0, lin.Jpos, -lin.Jneg)     # đạo hàm theo nhánh dấu hiện tại
        free = np.ones(9, bool)
        step = np.zeros(9)
        for _ in range(9):
            r = want - predict(lin, t + step)
            d = np.zeros(9)
            d[free] = np.linalg.lstsq(J[np.ix_(free, free)], r[free], rcond=None)[0]
            cand = t + step + d
            over = free & ((cand > limit + 1e-9) | (cand < -limit - 1e-9))
            if not over.any():
                step += d
                break
            step[over] = np.clip(cand[over], -limit, limit) - t[over]
            free &= ~over
            if not free.any():
                break
        t = np.clip(t + step, -limit, limit)
    return t
