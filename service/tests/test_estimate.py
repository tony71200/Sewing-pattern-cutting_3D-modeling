from estimate import estimate, SAMPLES


def test_tra_ve_du_bo_so_do():
    out, _ = estimate({"chest": 1034}, SAMPLES["bella"])
    for k in SAMPLES["bella"]:
        assert isinstance(out[k], (int, float)), f"thiếu {k}"


def test_so_nguoi_dung_nhap_khong_bi_dung_vao():
    out, _ = estimate({"chest": 900, "waist": 700}, SAMPLES["bella"])
    assert out["chest"] == 900 and out["waist"] == 700


def test_vong_dung_he_so_chu_vi_dai_dung_he_so_chieu_dai():
    s = SAMPLES["bella"]
    out, _ = estimate({"chest": s["chest"] * 2, "hpsToWaistBack": s["hpsToWaistBack"]}, s)
    assert out["hips"] == round(s["hips"] * 2)
    assert out["waistToFloor"] == s["waistToFloor"]


def test_shoulderSlope_la_DO_nen_khong_nhan_ti_le():
    s = SAMPLES["bella"]
    out, _ = estimate({"chest": s["chest"] * 3}, s)
    assert out["shoulderSlope"] == s["shoulderSlope"]


def test_estimated_liet_ke_dung():
    _, est = estimate({"chest": 1034, "waist": 800}, SAMPLES["bella"])
    assert "chest" not in est and "waist" not in est and "hips" in est
