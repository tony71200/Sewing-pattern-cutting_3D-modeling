"""Anny: nạp model, tìm tầng đo theo giải phẫu, đo thân, fit phenotype.

Đơn vị nội bộ là MÉT, trục z hướng lên — giống Anny. Đổi sang mm/y-up chỉ ở
body_service.py, ngay trước khi gửi cho browser.
"""
import re
import numpy as np
import torch
import anny

from tape import cut, girth_at

# 9 target measure-* của MakeHuman và số đo freesewing tương ứng, CÙNG THỨ TỰ.
TARGETS = [
    "measure-bust-circ-incr", "measure-underbust-circ-incr", "measure-waist-circ-incr",
    "measure-hips-circ-incr", "measure-neck-circ-incr", "measure-thigh-circ-incr",
    "measure-upperarm-circ-incr", "measure-wrist-circ-incr", "measure-knee-circ-incr",
]
NAMES = ["chest", "underbust", "waist", "seat", "neck",
         "upperLeg", "biceps", "wrist", "knee"]

UP = np.array([0.0, 0.0, 1.0])
_MODEL = None


def load_model():
    """Chỉ nạp 9 target cần dùng: nạp cả 256 làm khởi động 78s thay vì 2.8s."""
    global _MODEL
    if _MODEL is None:
        _MODEL = anny.Anny(local_changes=TARGETS, facial_actions="none").to(
            dtype=torch.float32)
    return _MODEL


def body(model, phenotype, targets):
    t = lambda d: {k: torch.tensor([float(v)]) for k, v in d.items()} if d else None
    o = model(phenotype_kwargs=t(phenotype), local_changes_kwargs=t(targets))
    return (o["rest_vertices"][0].detach().cpu().numpy(),
            o["rest_bone_heads"][0].detach().cpu().numpy())


def _bone_z(H, model, pattern):
    idx = [i for i, b in enumerate(model.bone_labels) if re.fullmatch(pattern, b)]
    return float(H[idx][:, 2].mean())


def _torso(V, F, z):
    return girth_at(V, F, np.array([0.0, 0.0, z]), UP, max_dist=0.20)


def anatomical_levels(V, H, model):
    """Tìm tầng đo trên chính mesh. Gọi MỘT LẦN sau bước phenotype rồi KHOÁ.

    Không dùng hpsToBust/hpsToWaistFront của freesewing làm độ cao: chúng đo dọc theo bề
    mặt cơ thể, vòng qua bầu ngực, nên dài hơn khoảng cách thẳng đứng.
    Không neo vào BASE_MESH_WAIST_VERTICES rồi bước theo số đo dọc: vòng eo của mesh nằm
    thấp hơn eo may mặc khoảng 250mm.
    """
    F = model.faces.cpu().numpy()
    zw = float(V[anny.anthropometry.BASE_MESH_WAIST_VERTICES][:, 2].mean())
    z_sh = _bone_z(H, model, r"upperarm01\.L")
    z_hip = _bone_z(H, model, r"upperleg01\.L")
    z_kn = _bone_z(H, model, r"lowerleg01\.L")

    n_loops = lambda z: len(cut(V, F, np.array([0.0, 0.0, z]), UP))
    zs = np.linspace(zw + 0.02, z_sh, 20)
    z_arm = max([z for z in zs if n_loops(z) >= 3] or [z_sh - 0.12])

    zs = np.linspace(zw + 0.05, z_arm - 0.005, 12)
    z_bust = float(zs[int(np.nanargmax([_torso(V, F, z) for z in zs]))])
    zs = np.linspace(zw + 0.01, z_bust - 0.01, 10)
    z_ub = float(zs[int(np.nanargmin([_torso(V, F, z) for z in zs]))])

    def legs_split(z):
        cx = [l[:, 0].mean() for l in cut(V, F, np.array([0.0, 0.0, z]), UP)]
        return any(x > 0.03 for x in cx) and any(x < -0.03 for x in cx)

    zs = np.linspace(z_hip, z_kn, 24)
    z_cr = float(max([z for z in zs if legs_split(z)] or [z_hip - 0.1]))
    zs = np.linspace(z_cr + 0.01, zw - 0.02, 12)
    z_seat = float(zs[int(np.nanargmax([_torso(V, F, z) for z in zs]))])

    # Cổ lấy thẳng từ xương. Đi tìm "vòng hẹp nhất" ở vùng này bắt nhầm một vòng 150mm.
    z_neck = _bone_z(H, model, r"neck01") + 0.015
    return dict(neck=z_neck, armpit=z_arm, bust=z_bust, underbust=z_ub,
                waist=zw, seat=z_seat, crotch=z_cr)


def limb_taps(H, model):
    """(điểm, trục) cho từng vòng đo chi. Mặt phẳng cắt VUÔNG GÓC với xương."""
    idx = {b: i for i, b in enumerate(model.bone_labels)}
    P = lambda b: H[idx[b]]
    u = lambda v: v / (np.linalg.norm(v) + 1e-9)
    sh, el, wr = P("upperarm01.L"), P("lowerarm01.L"), P("wrist.L")
    hip, kn = P("upperleg01.L"), P("lowerleg01.L")
    a_up, a_lo, a_leg = u(el - sh), u(wr - el), u(kn - hip)
    return dict(biceps=(sh + a_up * 0.12, a_up),
                wrist=(wr - a_lo * 0.015, a_lo),
                upperLeg=(hip + a_leg * 0.10, a_leg),
                knee=(kn, a_leg))


def measure_body(V, H, levels, taps, model):
    """Bộ số đo, MM. Khoá trùng NAMES."""
    F = model.faces.cpu().numpy()
    out = {
        "chest": _torso(V, F, levels["bust"]),
        "underbust": _torso(V, F, levels["underbust"]),
        "waist": _torso(V, F, levels["waist"]),
        "seat": _torso(V, F, levels["seat"]),
        "neck": _torso(V, F, levels["neck"]),
    }
    for name, (p, ax) in taps.items():
        out[name] = girth_at(V, F, p, ax, near=p, max_dist=0.12)
    return {k: out[k] for k in NAMES}


def _bisect(f, lo, hi, n=9):
    flo, fhi = f(lo), f(hi)
    if not (np.isfinite(flo) and np.isfinite(fhi)) or flo * fhi > 0:
        return lo if abs(flo) < abs(fhi) else hi        # ngoài tầm -> ghim ở đầu tốt hơn
    for _ in range(n):
        mid = 0.5 * (lo + hi)
        fm = f(mid)
        if flo * fm <= 0:
            hi, fhi = mid, fm
        else:
            lo, flo = mid, fm
    return 0.5 * (lo + hi)


def fit_phenotype(model, want):
    """Chiều cao rồi cân nặng. Chỉ hai tham số — phần còn lại để target measure-* lo."""
    ph = dict(gender=float(want.get("gender", 1.0)), age=0.5, muscle=0.5,
              weight=0.5, height=0.5, proportions=0.5)

    def height_err(h):
        V, _ = body(model, {**ph, "height": h}, None)
        return (V[:, 2].max() - V[:, 2].min()) * 1000 - want["height"]

    ph["height"] = _bisect(height_err, 0.0, 1.0)

    def torso_err(w):
        V, H = body(model, {**ph, "weight": w}, None)
        L = anatomical_levels(V, H, model)
        m = measure_body(V, H, L, limb_taps(H, model), model)
        return float(np.nanmean([m[k] - want[k] for k in ("chest", "waist", "seat")]))

    ph["weight"] = _bisect(torso_err, 0.0, 1.0, n=8)
    return ph
