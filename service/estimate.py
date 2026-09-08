"""Suy số đo thiếu từ bộ mẫu.

BẢN SAO LOGIC của src/estimate.js — sửa ở đây thì sửa cả bên đó. Tồn tại hai bản có chủ
đích: form "Số đo thân" phải hiện nhãn "ước lượng" trước khi gọi service, vì tab Rập chạy
được khi không có Python. Dữ liệu dùng chung samples.json nên không thể lệch.

Dùng HAI hệ số riêng biệt: một hệ số duy nhất sẽ sai vì người thấp mập và người cao gầy
có thể cùng vòng ngực.
"""
import json
import pathlib

SAMPLES = json.loads((pathlib.Path(__file__).parent / "samples.json").read_text("utf-8"))

GIRTH = {"ankle", "biceps", "chest", "head", "heel", "highBust", "hips", "knee",
         "neck", "seat", "underbust", "upperLeg", "waist", "wrist"}
NO_SCALE = {"shoulderSlope"}          # tính bằng ĐỘ, không phải mm


def estimate(measurements, sample):
    k_girth = (measurements.get("chest") or sample["chest"]) / sample["chest"]
    k_length = ((measurements.get("hpsToWaistBack") or sample["hpsToWaistBack"])
                / sample["hpsToWaistBack"])
    out = dict(measurements)
    estimated = []
    for name, v in sample.items():
        cur = out.get(name)
        if isinstance(cur, (int, float)) and cur > 0:
            continue
        if name in NO_SCALE:
            out[name] = v
        else:
            out[name] = round(v * (k_girth if name in GIRTH else k_length))
        estimated.append(name)
    return out, estimated
