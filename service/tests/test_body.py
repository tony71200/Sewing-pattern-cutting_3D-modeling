import math
import numpy as np
import pytest
from anny_body import (TARGETS, NAMES, load_model, body, anatomical_levels,
                       limb_taps, measure_body, fit_phenotype)

WANT_F = dict(chest=1034, underbust=872, waist=825, seat=1081, neck=380,
              upperLeg=620, biceps=313, wrist=166, knee=380, height=1594)
WANT_M = dict(chest=1080, underbust=980, waist=900, seat=1030, neck=430,
              upperLeg=600, biceps=340, wrist=180, knee=400, height=1760)


@pytest.fixture(scope="session")
def model():
    return load_model()


def test_chi_nap_9_target():
    """Nạp cả 256 local change làm khởi động 78s thay vì 2.8s."""
    assert len(TARGETS) == 9
    assert len(NAMES) == 9
    assert all(t.startswith("measure-") for t in TARGETS)


def test_mesh_dung_kich_thuoc(model):
    V, H = body(model, dict(gender=1.0, age=0.5, muscle=0.5, weight=0.5,
                            height=0.5, proportions=0.5), None)
    assert V.shape == (13718, 3)
    assert model.faces.shape[1] == 3
    assert 1.2 < V[:, 2].max() - V[:, 2].min() < 2.2, "chiều cao phải hợp lý (mét)"


@pytest.mark.parametrize("gender", [0.0, 1.0])
def test_thu_tu_tang_khong_dao(model, gender):
    ph = dict(gender=gender, age=0.5, muscle=0.5, weight=0.5, height=0.5, proportions=0.5)
    V, H = body(model, ph, None)
    L = anatomical_levels(V, H, model)
    order = ["armpit", "bust", "underbust", "waist", "seat", "crotch"]
    for a, b in zip(order, order[1:]):
        assert L[a] > L[b], f"{a} (z={L[a]:.3f}) phải cao hơn {b} (z={L[b]:.3f})"
    assert L["neck"] > L["armpit"], "cổ phải cao hơn nách"


def test_khong_co_nan_voi_so_do_cuc_doan(model):
    for w in (0.0, 0.5, 1.0):
        for h in (0.0, 0.5, 1.0):
            ph = dict(gender=1.0, age=0.5, muscle=0.5, weight=w, height=h, proportions=0.5)
            V, H = body(model, ph, None)
            L = anatomical_levels(V, H, model)
            m = measure_body(V, H, L, limb_taps(H, model), model)
            for k, v in m.items():
                assert math.isfinite(v), f"w={w} h={h}: {k} là NaN"
                assert 30 < v < 3000, f"w={w} h={h}: {k}={v} vô lý"


def test_nu_co_nguc_lon_hon_chan_nguc_ro_ret(model):
    def ratio(g):
        ph = dict(gender=g, age=0.5, muscle=0.5, weight=0.5, height=0.5, proportions=0.5)
        V, H = body(model, ph, None)
        m = measure_body(V, H, anatomical_levels(V, H, model), limb_taps(H, model), model)
        return m["chest"] / m["underbust"]
    assert ratio(1.0) > ratio(0.0), "gender=1.0 phải là nữ"


@pytest.mark.parametrize("want", [WANT_F, WANT_M])
def test_fit_phenotype_khop_chieu_cao(model, want):
    ph = fit_phenotype(model, want)
    V, _ = body(model, ph, None)
    got = (V[:, 2].max() - V[:, 2].min()) * 1000
    assert abs(got - want["height"]) < 15, f"chiều cao {got:.0f} vs {want['height']}"
    assert all(0.0 <= v <= 1.0 for k, v in ph.items()), "phenotype phải trong [0,1]"
