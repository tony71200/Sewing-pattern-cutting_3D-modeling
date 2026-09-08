import numpy as np
import pytest
from anny_body import load_model, body, NAMES, TARGETS, anatomical_levels, limb_taps, measure_body
from linear import build_linear, apply, predict, solve_targets

PH = dict(gender=1.0, age=0.5, muscle=0.5, weight=1.0, height=0.52, proportions=0.5)


@pytest.fixture(scope="session")
def lin():
    return build_linear(load_model(), PH)


def test_hai_delta_moi_target(lin):
    assert set(lin.dpos) == set(TARGETS)
    assert set(lin.dneg) == set(TARGETS)


def test_bust_co_hai_nhanh_khac_nhau(lin):
    """measure-bust-circ: nhánh tăng và nhánh giảm là HAI target khác nhau của MakeHuman
    (cos ~ -0.78), không phải ảnh gương. Dùng một delta sai tới 19.8mm ở nhánh âm."""
    p = lin.dpos["measure-bust-circ-incr"].ravel()
    n = lin.dneg["measure-bust-circ-incr"].ravel()
    cos = float(p @ n / (np.linalg.norm(p) * np.linalg.norm(n)))
    assert cos > -0.95, f"cos={cos:.3f}: nếu là -1 thì giả định hai nhánh sai"


def test_BAT_BIEN_chong_chat_chinh_xac(lin):
    """Điều kiện để browser tự dựng mesh khi kéo thanh trượt. Hỏng cái này là hỏng
    'không giật lag' — browser sẽ phải gọi service mỗi lần kéo."""
    model = load_model()
    rng = np.random.default_rng(0)
    for _ in range(5):
        t = rng.uniform(-1.5, 1.5, 9)
        V_true, _ = body(model, PH, dict(zip(TARGETS, t)))
        err = np.abs(apply(lin, t) - V_true).max() * 1000
        assert err < 0.01, f"lệch {err:.4f}mm — chồng chất không còn chính xác"


def test_jacobian_du_tuyen_tinh(lin):
    """Điều kiện để browser giải hệ 9x9 thay vì phải cài lại thuật toán đo mesh bằng JS."""
    model = load_model()
    rng = np.random.default_rng(1)
    for _ in range(4):
        t = rng.uniform(-1.5, 1.5, 9)
        V = apply(lin, t)
        _, H = body(model, PH, dict(zip(TARGETS, t)))
        real = np.array([measure_body(V, H, lin.levels, lin.taps, model)[n] for n in NAMES])
        assert np.abs(predict(lin, t) - real).max() < 3.0


def test_ghep_cheo_manh_nen_phai_giai_ca_he(lin):
    """eo -> chân ngực khoảng +92mm/đơn vị. Chỉnh từng số một sẽ đánh nhau."""
    j_waist_to_ub = lin.Jpos[NAMES.index("underbust"), TARGETS.index("measure-waist-circ-incr")]
    assert abs(j_waist_to_ub) > 40, f"ghép chéo chỉ {j_waist_to_ub:.1f}, kiểm tra lại"


def test_solve_targets_kep_trong_bien(lin):
    want = np.array([1034, 872, 825, 1081, 380, 620, 313, 166, 380], float)
    t = solve_targets(lin, want, limit=2.0)
    assert t.shape == (9,)
    assert np.all(np.abs(t) <= 2.0 + 1e-9)


def test_solve_targets_khop_8_tren_9(lin):
    """Đo được: biên ±2 cho 8/9 trong 2mm; chân ngực là số duy nhất ngoài tầm với."""
    want = np.array([1034, 872, 825, 1081, 380, 620, 313, 166, 380], float)
    t = solve_targets(lin, want, limit=2.0)
    res = predict(lin, t) - want
    ok = int((np.abs(res) <= 2.0).sum())
    assert ok >= 8, f"chỉ {ok}/9 khớp: {dict(zip(NAMES, res.round()))}"


def test_khong_hy_sinh_so_do_de_dat_de_cuu_so_do_ngoai_tam(lin):
    """Vòng eo dễ đạt (độ nhạy 89mm/đơn vị, target xa biên). Nếu nó lệch thì bộ giải đang
    bóp méo eo để cứu chân ngực — với ứng dụng may đó là đánh đổi sai, eo lái rập trực tiếp.
    Bình phương tối thiểu thường sẽ làm đúng chuyện đó nếu không bỏ số đo đã ghim."""
    want = np.array([1034, 872, 825, 1081, 380, 620, 313, 166, 380], float)
    res = predict(lin, solve_targets(lin, want, limit=2.0)) - want
    for n in ("waist", "chest", "seat"):
        assert abs(res[NAMES.index(n)]) <= 2.0, \
            f"{n} lệch {res[NAMES.index(n)]:.0f}mm — bộ giải đang hy sinh nó"
