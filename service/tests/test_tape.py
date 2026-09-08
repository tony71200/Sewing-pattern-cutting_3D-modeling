import math
import numpy as np
import pytest
from tape import cut, hull_perimeter, girth_at


def prism(n=32, r=0.1, h=1.0, axis=(0, 0, 1), centre=(0, 0, 0)):
    """Lăng trụ đều n cạnh. Chu vi mặt cắt biết trước CHÍNH XÁC: n*2*r*sin(pi/n)."""
    a = np.array(axis, float)
    a /= np.linalg.norm(a)
    u = np.cross(a, [0, 0, 1.0])
    if np.linalg.norm(u) < 1e-6:
        u = np.cross(a, [1.0, 0, 0])
    u /= np.linalg.norm(u)
    w = np.cross(a, u)
    ang = np.arange(n) * 2 * np.pi / n
    ring = r * (np.cos(ang)[:, None] * u + np.sin(ang)[:, None] * w)
    c = np.array(centre, float)
    V = np.vstack([c - a * h / 2 + ring, c + a * h / 2 + ring])
    F = []
    for i in range(n):
        j = (i + 1) % n
        F += [[i, n + i, j], [j, n + i, n + j]]
    return V, np.array(F)


EXACT = lambda n, r: n * 2 * r * math.sin(math.pi / n) * 1000  # mm


def test_cut_tra_ve_dung_mot_vong():
    V, F = prism()
    loops = cut(V, F, np.array([0, 0, 0.0]), np.array([0, 0, 1.0]))
    assert len(loops) == 1


def test_chu_vi_lang_tru_dung_chinh_xac():
    for n, r in [(32, 0.1), (64, 0.25), (16, 0.05)]:
        V, F = prism(n=n, r=r)
        got = girth_at(V, F, np.array([0, 0, 0.0]), np.array([0, 0, 1.0]))
        assert abs(got - EXACT(n, r)) < 0.01, f"n={n} r={r}: {got} != {EXACT(n, r)}"


def test_cat_vuong_goc_voi_truc_nghieng():
    """Lăng trụ nghiêng: cắt vuông góc với trục phải ra ĐÚNG chu vi đó.
    Cắt ngang sẽ ra hình bầu dục lớn hơn — đó là lý do chi phải cắt vuông góc với xương."""
    axis = np.array([0.6, 0.0, 0.8])
    V, F = prism(n=32, r=0.1, axis=axis)
    perp = girth_at(V, F, np.array([0, 0, 0.0]), axis)
    assert abs(perp - EXACT(32, 0.1)) < 0.01
    flat = girth_at(V, F, np.array([0, 0, 0.0]), np.array([0, 0, 1.0]))
    assert flat > perp + 10, "cắt ngang phải cho chu vi lớn hơn hẳn"


def test_hai_ong_roi_nhau_ra_hai_vong():
    V1, F1 = prism(centre=(-0.3, 0, 0))
    V2, F2 = prism(centre=(0.3, 0, 0))
    V = np.vstack([V1, V2])
    F = np.vstack([F1, F2 + len(V1)])
    loops = cut(V, F, np.array([0, 0, 0.0]), np.array([0, 0, 1.0]))
    assert len(loops) == 2
    xs = sorted(float(l[:, 0].mean()) for l in loops)
    assert xs[0] < -0.2 and xs[1] > 0.2


def test_girth_at_chon_vong_gan_diem_do_nhat():
    V1, F1 = prism(r=0.1, centre=(-0.3, 0, 0))
    V2, F2 = prism(r=0.2, centre=(0.3, 0, 0))
    V = np.vstack([V1, V2])
    F = np.vstack([F1, F2 + len(V1)])
    near = np.array([0.3, 0, 0.0])
    assert abs(girth_at(V, F, near, np.array([0, 0, 1.0]), near=near) - EXACT(32, 0.2)) < 0.01


def test_khong_co_vong_thi_tra_nan():
    V, F = prism()
    assert math.isnan(girth_at(V, F, np.array([0, 0, 5.0]), np.array([0, 0, 1.0])))


def test_bao_loi_bo_qua_cho_lom():
    """Thước dây kéo căng không lọt vào chỗ lõm."""
    V, F = prism(n=32, r=0.1)
    V[5] *= 0.3  # kéo một đỉnh vào trong
    got = girth_at(V, F, np.array([0, 0, 0.0]), np.array([0, 0, 1.0]))
    assert got > EXACT(32, 0.1) - 1.0, "bao lồi phải gần như không đổi khi có chỗ lõm"
