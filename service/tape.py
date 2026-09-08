"""Thước dây cho mesh cơ thể.

Hai luật rút ra từ việc đo sai:
  * đo chi bằng mặt phẳng VUÔNG GÓC VỚI XƯƠNG, không phải mặt phẳng ngang. Tay buông sát
    thân nên mặt cắt ngang gộp cổ tay với thân thành một vòng.
  * chu vi là chu vi BAO LỒI. Thước dây kéo căng không lọt vào chỗ lõm.
"""
import numpy as np


def cut(V, F, point, normal):
    """Các vòng khép kín của giao tuyến mesh với mặt phẳng. Trả về list mảng (N,3)."""
    n = np.asarray(normal, float)
    n = n / np.linalg.norm(n)
    s = (V - np.asarray(point, float)) @ n
    tri = F[np.abs(np.sign(s[F]).sum(1)) != 3]     # tam giác có đỉnh ở cả hai phía
    if len(tri) == 0:
        return []
    P, S = V[tri], s[tri]
    pts, owner = [], []
    for a, b in ((0, 1), (1, 2), (2, 0)):
        m = S[:, a] * S[:, b] < 0
        t = (S[m, a] / (S[m, a] - S[m, b]))[:, None]
        pts.append(P[m, a] + (P[m, b] - P[m, a]) * t)
        owner.append(np.where(m)[0])
    # mỗi tam giác bị cắt cho đúng 2 giao điểm -> sắp theo tam giác rồi ghép đôi = 1 đoạn
    pts = np.concatenate(pts)[np.argsort(np.concatenate(owner), kind="stable")]
    A, B = pts[0::2], pts[1::2]

    key = lambda q: tuple(np.round(q, 6))
    parent = {}

    def find(k):
        while parent.setdefault(k, k) != k:
            k = parent[k]
        return k

    for a, b in zip(A, B):
        parent[find(key(a))] = find(key(b))
    comps = {}
    for a, b in zip(A, B):
        comps.setdefault(find(key(a)), []).extend([a, b])
    return [np.array(c) for c in comps.values() if len(c) > 6]


def hull_perimeter(loop, normal):
    """Chu vi bao lồi của một vòng, đo trong mặt phẳng cắt. Đơn vị theo `loop` (mét)."""
    n = np.asarray(normal, float)
    n = n / np.linalg.norm(n)
    u = np.cross(n, [0, 0, 1.0])
    if np.linalg.norm(u) < 1e-6:
        u = np.cross(n, [1.0, 0, 0])
    u /= np.linalg.norm(u)
    w = np.cross(n, u)
    P = np.stack([loop @ u, loop @ w], 1)
    P = P[np.lexsort((P[:, 1], P[:, 0]))]
    cr = lambda o, a, b: (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    def half(pts):
        h = []
        for p in pts:
            while len(h) >= 2 and cr(h[-2], h[-1], p) <= 0:
                h.pop()
            h.append(p)
        return h

    hull = np.array(half(P)[:-1] + half(P[::-1])[:-1])
    return float(np.sum(np.linalg.norm(np.roll(hull, -1, 0) - hull, axis=1)))


def girth_at(V, F, point, normal, near=None, max_dist=0.25):
    """Chu vi (MM) của vòng có trọng tâm gần `near` nhất. `nan` nếu không có vòng nào đủ gần."""
    loops = cut(V, F, point, normal)
    if not loops:
        return float("nan")
    ref = np.asarray(near if near is not None else point, float)
    d = [float(np.linalg.norm(l.mean(0) - ref)) for l in loops]
    i = int(np.argmin(d))
    if d[i] > max_dist:
        return float("nan")
    return hull_perimeter(loops[i], normal) * 1000.0
