"""HTTP service cho thân 3D. Chỉ được gọi khi phenotype đổi.

Dùng http.server của thư viện chuẩn: hai endpoint, chạy localhost, Vite đã proxy /api nên
không có CORS. Thêm FastAPI/uvicorn chỉ để có 2 route là thừa.
"""
import json
import struct
import numpy as np
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from anny_body import NAMES, TARGETS, load_model, fit_phenotype, measure_body
from linear import build_linear, solve_targets, apply
from estimate import estimate, SAMPLES

MM = 1000.0
PORT = 8791
_CACHE = {}


def to_browser(V):
    """Anny (mét, z lên) -> browser (mm, y lên, chân chạm y=0)."""
    out = np.empty_like(V)
    out[:, 0] = V[:, 0] * MM
    out[:, 1] = (V[:, 2] - V[:, 2].min()) * MM
    out[:, 2] = -V[:, 1] * MM
    return out.astype(np.float32)


def _delta_to_browser(D):
    """Delta là hiệu vị trí -> chỉ xoay trục, KHÔNG trừ gốc.
    Trừ gốc hai lần là mesh bay đi."""
    out = np.empty_like(D)
    out[:, 0] = D[:, 0] * MM
    out[:, 1] = D[:, 2] * MM
    out[:, 2] = -D[:, 1] * MM
    return out.astype(np.float32)


def pack(lin, t, want, faces, model):
    Vm = apply(lin, t)
    # Gửi mesh GỐC (V0), không phải mesh đã áp target: delta được tính từ V0, nên nếu gửi
    # mesh đã áp thì browser cộng delta lần nữa và mọi thứ nhân đôi (đo được: lệch 50mm).
    # Browser áp `targetValues` trong header để ra đúng mesh này.
    V = to_browser(lin.V0)
    idx = faces.astype(np.int32).ravel()
    # ĐO LẠI mesh thật, không báo giá trị dự đoán từ Jacobian: dự đoán lệch tới 1.72mm và
    # service là bên duy nhất biết sự thật về thân nó vừa dựng.
    real = measure_body(Vm, lin.H0, lin.levels, lin.taps, model)
    m = np.array([real[n] for n in NAMES])

    chunks = []
    for key in TARGETS:
        for D in (lin.dpos[key], lin.dneg[key]):
            Db = _delta_to_browser(D)
            keep = np.where(np.abs(Db).max(1) > 1e-3)[0].astype(np.int32)
            chunks.append((keep, Db[keep].ravel()))

    header = {
        "version": 1, "units": "mm", "up": "y",
        "vertexCount": int(len(V)), "indexCount": int(len(idx)),
        "names": NAMES, "targets": TARGETS,
        # `base` là số đo tại t=0, gốc của mô hình tuyến tính -> browser dùng cái này.
        # `measurements` là số đo ĐO LẠI trên mesh đã fit -> sự thật để hiện bảng lệch.
        # Lẫn hai cái này là bảng lệch sai và bộ giải của browser lệch khỏi service.
        "base": {n: float(v) for n, v in zip(NAMES, lin.m0)},
        "measurements": {n: float(v) for n, v in zip(NAMES, m)},
        "jacobianPos": lin.Jpos.tolist(), "jacobianNeg": lin.Jneg.tolist(),
        "want": {n: float(v) for n, v in zip(NAMES, want)},
        "residual": {n: float(a - b) for n, a, b in zip(NAMES, m, want)},
        "targetValues": {n: float(x) for n, x in zip(NAMES, t)},
        "phenotype": lin.phenotype, "limit": 2.0,
    }
    hb = json.dumps(header).encode("utf-8")
    parts = [struct.pack("<I", len(hb)), hb, V.ravel().tobytes(), idx.tobytes()]
    for keep, vec in chunks:
        parts += [struct.pack("<I", len(keep)), keep.tobytes(), vec.tobytes()]
    return b"".join(parts)


def unpack(buf):
    """Chỉ dùng trong test — browser có parser riêng bằng JS."""
    (n,) = struct.unpack_from("<I", buf, 0)
    header = json.loads(buf[4:4 + n])
    o = 4 + n
    vc, ic = header["vertexCount"], header["indexCount"]
    pos = np.frombuffer(buf, np.float32, vc * 3, o); o += vc * 12
    idx = np.frombuffer(buf, np.int32, ic, o); o += ic * 4
    deltas = []
    for _ in range(len(header["targets"]) * 2):
        (c,) = struct.unpack_from("<I", buf, o); o += 4
        i = np.frombuffer(buf, np.int32, c, o); o += c * 4
        v = np.frombuffer(buf, np.float32, c * 3, o); o += c * 12
        deltas.append((i, v))
    return {"header": header, "positions": pos, "indices": idx, "deltas": deltas}


def fit_request(payload):
    design = payload.get("design", "bella")
    full, _ = estimate(payload.get("measurements", {}), SAMPLES[design])
    full["gender"] = 1.0 if design == "bella" else 0.0
    full["height"] = full["waistToFloor"] + full["hpsToWaistBack"] + 70

    model = load_model()
    ph = fit_phenotype(model, full)
    key = tuple(round(ph[k], 4) for k in sorted(ph))
    lin = _CACHE.get(key)
    if lin is None:
        lin = build_linear(model, ph)
        _CACHE.clear()                 # ponytail: cache 1 phenotype. Đủ cho 1 người dùng.
        _CACHE[key] = lin
    want = np.array([full[n] for n in NAMES], float)
    t = solve_targets(lin, want, limit=2.0)
    return pack(lin, t, want, model.faces.cpu().numpy(), model)


LANDING = """<!doctype html>
<html lang="vi"><meta charset="utf-8"><title>Service thân 3D</title>
<style>
 body{font:15px/1.6 system-ui,sans-serif;max-width:34em;margin:12vh auto;padding:0 1.5em;color:#222}
 h1{font-size:19px;margin:0 0 .2em} p{margin:.8em 0}
 code{background:#f2f2f2;padding:1px 5px;border-radius:3px}
 a{font-size:20px;font-weight:600}
 .ok{color:#276749}
</style>
<h1>Service thân 3D đang chạy <span class="ok">&#10003;</span></h1>
<p>Đây <strong>không phải</strong> giao diện ứng dụng — cổng này chỉ để app gọi dữ liệu thân
người. Ứng dụng nằm ở:</p>
<p><a href="http://localhost:5173">http://localhost:5173</a></p>
<p>Chưa mở được? Nhấp đúp <code>RunApp.bat</code> trong thư mục dự án
(hoặc chạy <code>npm run dev</code> nếu đang sửa code).</p>
<p>Cửa sổ đang chạy service này cứ để nguyên. Đóng service: bấm <code>Ctrl+C</code>.</p>
</html>""".encode("utf-8")


# Trang mo tu file:// (ADR-0004) goi thang cong nay, khong qua proxy Vite: can CORS.
# "*" la du: chi nghe 127.0.0.1, khong cookie. Private-Network: Chrome hoi them khi
# mot trang khong phai localhost goi vao dia chi loopback.
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Private-Network": "true",
}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _cors(self):
        for k, v in CORS.items():
            self.send_header(k, v)

    def _send(self, code, body, ctype):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self._cors()
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Content-Length", "0")
        self._cors()
        self.end_headers()

    def do_GET(self):
        if self.path == "/api/health":
            return self._send(200, b'{"ok":true}', "application/json")
        if self.path.startswith("/api/"):
            return self._send(404, b'{"error":"not found"}', "application/json")
        # Mở thẳng cổng này trong trình duyệt là chuyện người dùng SẼ làm — nó được in ra
        # lúc khởi động. Trả JSON "not found" thì trông như hỏng. Giải thích tử tế hơn.
        self._send(200, LANDING, "text/html; charset=utf-8")

    def do_POST(self):
        if self.path != "/api/fit":
            return self._send(404, b'{"error":"not found"}', "application/json")
        try:
            n = int(self.headers.get("Content-Length", 0))
            payload = json.loads(self.rfile.read(n) or b"{}")
            self._send(200, fit_request(payload), "application/octet-stream")
        except Exception as e:                       # trả lỗi đọc được, đừng để browser treo
            self._send(500, json.dumps({"error": str(e)}).encode(), "application/json")


if __name__ == "__main__":
    import time
    t0 = time.time()
    print("dang nap Anny...")
    load_model()
    # Hâm nóng: lần fit đầu tiên mất ~8s vì Warp/torch biên dịch kernel, các lần sau ~1s.
    # Chịu 8s lúc khởi động còn hơn để người dùng đợi ở lần bấm đầu tiên.
    print("dang ham nong (bien dich kernel, mat vai giay)...")
    fit_request({"design": "bella", "measurements": {}})
    # Chi dung ASCII o day: console cmd.exe mac dinh khong ma hoa duoc dau tieng Viet lan
    # em-dash, va print() se nem UnicodeEncodeError lam service chet ngay khi vua san sang.
    print()
    print(f"  SAN SANG sau {time.time() - t0:.0f}s.")
    print(f"  Service lang nghe o cong {PORT}. Day KHONG phai trang web de mo.")
    print("  Mo ung dung: nhay doi RunApp.bat (hoac 'npm run dev' -> http://localhost:5173)")
    print("  Dong service: Ctrl+C")
    print()
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
