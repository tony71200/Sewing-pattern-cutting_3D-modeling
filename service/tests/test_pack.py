import numpy as np
import pytest
from anny_body import load_model, NAMES, TARGETS, measure_body
from linear import build_linear, solve_targets, apply, predict
from body_service import pack, unpack, MM, to_browser

PH = dict(gender=1.0, age=0.5, muscle=0.5, weight=1.0, height=0.52, proportions=0.5)
WANT = np.array([1034, 872, 825, 1081, 380, 620, 313, 166, 380], float)


@pytest.fixture(scope="session")
def blob():
    model = load_model()
    lin = build_linear(model, PH)
    t = solve_targets(lin, WANT, limit=2.0)
    return pack(lin, t, WANT, model.faces.cpu().numpy(), model), lin, t


def test_doi_he_truc_metz_up_sang_mm_yup():
    """Anny: mét, z lên. Browser: mm, y lên, chân chạm y=0."""
    V = np.array([[0.1, 0.2, -0.8], [0.0, 0.0, 0.9]])
    out = to_browser(V)
    assert out[:, 1].min() == pytest.approx(0.0), "chân phải chạm y=0"
    assert out[1, 1] == pytest.approx(1700.0), "cao 1.7m -> 1700mm"
    assert out[0, 0] == pytest.approx(100.0)


def test_round_trip_giu_nguyen_so_lieu(blob):
    buf, lin, t = blob
    d = unpack(buf)
    assert d["header"]["units"] == "mm" and d["header"]["up"] == "y"
    assert d["header"]["vertexCount"] == len(lin.V0)
    assert d["positions"].shape == (len(lin.V0) * 3,)
    # positions là mesh GỐC, không phải mesh đã áp target — delta tính từ V0 nên browser
    # phải tự áp. Gửi mesh đã áp thì browser cộng lần nữa, lệch 50mm.
    np.testing.assert_allclose(d["positions"], to_browser(lin.V0).ravel(), rtol=0, atol=1e-3)


def test_header_co_du_thu_browser_can(blob):
    h = unpack(blob[0])["header"]
    for k in ("measurements", "jacobianPos", "jacobianNeg", "want", "residual",
              "targetValues", "phenotype", "limit", "names", "targets"):
        assert k in h, f"header thiếu {k}"
    assert np.array(h["jacobianPos"]).shape == (9, 9)
    assert h["names"] == NAMES and h["targets"] == TARGETS


def test_delta_gui_dang_THUA(blob):
    """Delta dày là 1447KB, thưa chỉ ~200KB. Mỗi target chỉ đụng 446-1137 đỉnh."""
    d = unpack(blob[0])
    assert len(d["deltas"]) == 18
    for idx, vec in d["deltas"]:
        assert len(idx) < 3000, "gửi thưa, không gửi cả 13718 đỉnh"
        assert vec.shape == (len(idx) * 3,)


def test_BAT_BIEN_CHINH_service_khong_noi_doi(blob):
    """Service được phép không khớp số đo người dùng, nhưng KHÔNG được nói sai về thân
    nó vừa dựng. Nên nó phải ĐO LẠI mesh, không được báo giá trị dự đoán từ Jacobian
    (dự đoán lệch tới 1.72mm — đủ để một cái áo sai)."""
    buf, lin, t = blob
    h = unpack(buf)["header"]
    model = load_model()
    real = measure_body(apply(lin, t), lin.H0, lin.levels, lin.taps, model)
    for n in NAMES:
        assert abs(h["measurements"][n] - real[n]) < 1.0, \
            f"{n}: service báo {h['measurements'][n]:.1f} nhưng thân là {real[n]:.1f}"
        assert abs(h["residual"][n] - (real[n] - h["want"][n])) < 1.0


def test_du_doan_jacobian_sat_voi_do_that(blob):
    """Browser dùng Jacobian để cập nhật bảng lệch khi kéo thanh trượt. Sai số của phép
    xấp xỉ đó phải nhỏ, và phải biết nó là bao nhiêu."""
    buf, lin, t = blob
    h = unpack(buf)["header"]
    err = np.abs(predict(lin, t) - np.array([h["measurements"][n] for n in NAMES]))
    assert err.max() < 3.0, f"lệch {err.max():.2f}mm giữa dự đoán và đo thật"
