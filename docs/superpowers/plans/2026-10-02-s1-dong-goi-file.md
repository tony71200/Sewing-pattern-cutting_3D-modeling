# S1 — Đóng gói một file chạy từ `file://`: kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nhấp đúp `RunApp.bat` hoặc mở thẳng `dist/index.html` là app chạy đủ: vẽ rập, in 1:1, lưu và nạp bản ghi. Tab Thân 3D gọi được service. Mỗi lỗi trong tài liệu lỗi có harness bắt.

**Architecture:**
- `vite-plugin-singlefile` + `base: './'` nhúng mọi thứ vào một `index.html`.
- Browser chọn gốc URL service theo `location.protocol`. Service trả header CORS và PNA.
- Một hàm thuần `recordToState` nạp lại bản ghi `.json`.
- Harness viết trước và phải chạy đỏ:
  - `node --test` cho build và launcher.
  - `pytest` cho CORS.
  - Chrome headless cho `file://`.

**Tech Stack:** Vite 8.2 + JS thuần (không TypeScript), `node:test`, Python 3.12 `http.server` + pytest, Chrome/Edge headless, cmd `.bat`.

**Spec:** [`docs/superpowers/specs/2026-10-02-s1-dong-goi-file-design.md`](../specs/2026-10-02-s1-dong-goi-file-design.md)
· ADR: [0003](../../adr/0003-service-python-la-du-phong-va-chuan-doi-chieu.md), [0004](../../adr/0004-mot-file-html-mo-tu-file-protocol.md)

## Global Constraints

**Phạm vi**
- Không đổi giao diện hay thứ tự tab (thuộc S2). Không đụng thân 3D ngoài URL service (thuộc S3).
- Không đổi bất cứ thứ gì ảnh hưởng tỉ lệ in. `src/tile.js` và CSS `@media print` giữ nguyên.

**Chuỗi và đơn vị**
- Mọi chuỗi tiếng Việt **mới** nằm trong `src/vi.js`.
- Đơn vị lõi là mm. Bản ghi có `units !== 'mm'` thì từ chối.

**Service**
- Gốc URL service khi chạy `file://` là đúng `http://127.0.0.1:8791`.
- Header CORS đúng nguyên văn:
  - `Access-Control-Allow-Origin: *`
  - `Access-Control-Allow-Methods: POST, GET, OPTIONS`
  - `Access-Control-Allow-Headers: Content-Type`
  - `Access-Control-Allow-Private-Network: true`
- Lệnh `print()` trong `body_service.py` chỉ dùng ASCII. Đã có test canh.

**File `.bat`**
- Chỉ byte ASCII, mọi dòng kết thúc CRLF, không lệnh `chcp`. Nhắc tới chữ `chcp` trong dòng
  `rem` thì được.
- File mới tạo bằng công cụ ghi file sẽ là LF, phải đổi sang CRLF. Test sẽ bắt nếu quên.

**Môi trường**
- Node ≥ 22.12 (Vite 8 đòi `^20.19.0 || >=22.12.0`).
- `vite-plugin-singlefile` bản `^2.3.3` (cùng bản dự án Rubik đang dùng với Vite 8).
- Bundle `dist/index.html` < 8 MB.

**Lệnh và commit**
- Chạy test JS: `npm test`. Chạy test Python: `.venv/Scripts/python -m pytest service -q`.
  Cả hai chạy từ gốc repo.
- Commit trên nhánh `20260908_than-3d-anny`. Cuối mỗi message commit thêm dòng
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## File Structure

| File | Trạng thái | Trách nhiệm |
|---|---|---|
| `vite.config.js` | sửa | thêm `base: './'` + `viteSingleFile()`, giữ proxy dev |
| `package.json` | sửa | devDep `vite-plugin-singlefile`; script `service` → `.venv`; script `smoke` |
| `src/body3d.js` | sửa | thêm `serviceBase(protocol)` |
| `src/main.js` | sửa | `fetch` dùng `serviceBase`; nút + input Mở bản ghi |
| `src/store.js` | sửa | thêm `recordToState(record, knownDesigns)` |
| `src/vi.js` | sửa | thêm `RECORD` (chuỗi nạp bản ghi) |
| `index.html` | sửa | thêm `<button id="open">` + `<input id="openFile" type="file" hidden>` |
| `service/body_service.py` | sửa | CORS trên mọi response, `do_OPTIONS`, trang landing và dòng in khởi động nhắc `RunApp.bat` |
| `RunApp.bat` | tạo | build nếu cần, mở `dist\index.html` |
| `Setup.bat` | sửa | hướng dẫn cuối trỏ sang `RunApp.bat` |
| `scripts/smoke-file.mjs` | tạo | Chrome headless mở `file://`, kiểm SVG rập + lỗi console |
| `test/dist.test.mjs` | tạo | build thật vào thư mục tạm, kiểm một file / không tham chiếu ngoài / dung lượng |
| `test/launch.test.mjs` | tạo | script `service` dùng `.venv`; mọi `.bat` ASCII + CRLF + không `chcp` |
| `test/body3d.test.mjs` | sửa | test `serviceBase` |
| `test/store.test.mjs` | sửa | test `recordToState` |
| `service/tests/test_pack.py` | sửa | test CORS POST + preflight |
| `docs/tai-lieu-loi.md` | tạo | L01–L13 |
| `CLAUDE.md`, `README.md` | sửa | cách chạy mới, `npm run smoke`, trỏ tới tài liệu lỗi |

---

### Task 1: Build thành một file (L03, L04, L10)

**Files:**
- Create: `test/dist.test.mjs`
- Modify: `vite.config.js` (toàn file, 9 dòng), `package.json` (devDependencies)

**Interfaces:**
- Consumes: không
- Produces: `npm run build` sinh **duy nhất** `dist/index.html` chạy được từ `file://`. Task 5 và 7 dựa vào điều này.

- [ ] **Step 1: Viết test hỏng**

Tạo `test/dist.test.mjs`:

```js
// Harness L03/L04/L10 (docs/tai-lieu-loi.md): app phải là MỘT file html mở được từ file://.
// Build thật vào thư mục tạm — không đụng dist/ của người dùng.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'vite'
import { mkdtempSync, readdirSync, readFileSync, statSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const outDir = mkdtempSync(join(tmpdir(), 'ps-dist-'))
await build({ root, logLevel: 'error', build: { outDir, emptyOutDir: true } })
const htmlPath = join(outDir, 'index.html')
const html = readFileSync(htmlPath, 'utf8')
process.on('exit', () => rmSync(outDir, { recursive: true, force: true }))

// Bỏ NỘI DUNG script/style inline (giữ thẻ) để chỉ còn thuộc tính của thẻ HTML.
const tagsOnly = html
  .replace(/(<script\b[^>]*>)[\s\S]*?(<\/script>)/gi, '$1$2')
  .replace(/(<style\b[^>]*>)[\s\S]*?(<\/style>)/gi, '$1$2')

test('build ra đúng một file index.html, không có thư mục assets', () => {
  const files = readdirSync(outDir, { recursive: true })
  assert.deepEqual(files, ['index.html'])
})

test('không thẻ nào trỏ ra ngoài: file:// chặn module/asset ngoài, offline không có CDN', () => {
  const refs = [...tagsOnly.matchAll(/\b(?:src|href)\s*=\s*["']([^"']*)["']/gi)].map((m) => m[1])
  const bad = refs.filter((r) => !r.startsWith('data:') && !r.startsWith('#'))
  assert.deepEqual(bad, [], `tham chiếu ngoài: ${bad.join(', ')}`)
})

test('CSS không tải font/ảnh từ ngoài (url() chỉ được là data:)', () => {
  const styles = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n')
  const urls = [...styles.matchAll(/url\(\s*["']?([^"')]+)/gi)].map((m) => m[1])
  const bad = urls.filter((u) => !u.startsWith('data:') && !u.startsWith('#'))
  assert.deepEqual(bad, [], `url() ngoài: ${bad.join(', ')}`)
})

test('dung lượng dưới 8 MB (S3 sẽ thêm ~3 MB dữ liệu thân)', () => {
  const mb = statSync(htmlPath).size / 2 ** 20
  assert.ok(mb < 8, `index.html ${mb.toFixed(1)} MB`)
})
```

- [ ] **Step 2: Chạy test, xác nhận hỏng**

Chạy: `node --test test/dist.test.mjs`

Kỳ vọng: FAIL ở 2 test:
- `build ra đúng một file`: có thêm `assets/index-*.js` và `assets/index-*.css`.
- `không thẻ nào trỏ ra ngoài`: có `/assets/index-….js`.

- [ ] **Step 3: Cài plugin**

Chạy: `npm i -D vite-plugin-singlefile@^2.3.3`

Kỳ vọng: `package.json` có `"vite-plugin-singlefile": "^2.3.3"` trong `devDependencies`.

- [ ] **Step 4: Sửa `vite.config.js`**

Thay toàn bộ file bằng:

```js
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// ADR-0004: app là MỘT file dist/index.html mở thẳng từ ổ đĩa. file:// chặn
// <script type="module" src> và fetch file bên cạnh, nên mọi thứ phải nằm inline.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  server: {
    // Chỉ cho `npm run dev`: proxy để browser và service cùng origin.
    // Chạy từ file:// thì không có proxy — xem serviceBase() trong src/body3d.js.
    proxy: { '/api': { target: 'http://127.0.0.1:8791', changeOrigin: false } },
  },
})
```

- [ ] **Step 5: Chạy test, xác nhận qua**

Chạy: `node --test test/dist.test.mjs`. Kỳ vọng: 4/4 pass.

Chạy: `npm test`. Kỳ vọng: toàn bộ pass (20 test cũ + 4 mới).

- [ ] **Step 6: Commit**

```bash
git add test/dist.test.mjs vite.config.js package.json package-lock.json
git commit -m "build: mot file index.html mo duoc tu file:// (vite-plugin-singlefile)"
```

---

### Task 2: Gọi service từ `file://` (L07)

**Files:**
- Modify: `src/body3d.js` (thêm hàm sau `parseFit`)
- Modify: `src/main.js:10` (import), `src/main.js:382` (fetch)
- Modify: `service/body_service.py:135-170` (class `Handler`)
- Test: `test/body3d.test.mjs`, `service/tests/test_pack.py`

**Interfaces:**
- Consumes: không
- Produces: `serviceBase(protocol: string): string`, export từ `src/body3d.js`.

- [ ] **Step 1: Viết test JS hỏng**

Trong `test/body3d.test.mjs`, đổi dòng import:

```js
import { parseFit, solve9, solveTargets, buildPositions, predictMeasurements, serviceBase } from '../src/body3d.js'
```

Thêm vào cuối file:

```js
test('serviceBase: file:// gọi thẳng cổng 8791, còn lại đi qua proxy Vite', () => {
  assert.equal(serviceBase('file:'), 'http://127.0.0.1:8791')
  assert.equal(serviceBase('http:'), '')
  assert.equal(serviceBase('https:'), '')
})
```

- [ ] **Step 2: Viết test Python hỏng**

Thêm vào cuối `service/tests/test_pack.py`:

```python
import threading
import urllib.request
from http.server import ThreadingHTTPServer


@pytest.fixture
def server(monkeypatch):
    """Handler thật trên cổng ngẫu nhiên; fit_request giả để không nạp Anny."""
    import body_service
    monkeypatch.setattr(body_service, "fit_request", lambda payload: b"BLOB")
    srv = ThreadingHTTPServer(("127.0.0.1", 0), body_service.Handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{srv.server_address[1]}"
    srv.shutdown()


def test_cors_post_tu_trang_file(server):
    """L07: trang mo tu file:// gui Origin: null, khong co proxy Vite."""
    req = urllib.request.Request(server + "/api/fit", data=b"{}", method="POST",
                                 headers={"Content-Type": "application/json", "Origin": "null"})
    with urllib.request.urlopen(req) as r:
        assert r.status == 200
        assert r.headers["Access-Control-Allow-Origin"] == "*"
        assert r.read() == b"BLOB"


def test_cors_preflight_co_private_network(server):
    """Content-Type JSON kich hoat preflight; Chrome con hoi them Private Network Access."""
    req = urllib.request.Request(server + "/api/fit", method="OPTIONS", headers={
        "Origin": "null",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
        "Access-Control-Request-Private-Network": "true",
    })
    with urllib.request.urlopen(req) as r:
        assert r.status == 204
        assert r.headers["Access-Control-Allow-Origin"] == "*"
        assert "POST" in r.headers["Access-Control-Allow-Methods"]
        assert "content-type" in r.headers["Access-Control-Allow-Headers"].lower()
        assert r.headers["Access-Control-Allow-Private-Network"] == "true"
```

- [ ] **Step 3: Chạy cả hai, xác nhận hỏng**

Chạy: `node --test test/body3d.test.mjs`
Kỳ vọng: FAIL. Lỗi `SyntaxError: The requested module '../src/body3d.js' does not provide an export named 'serviceBase'`.

Chạy: `.venv/Scripts/python -m pytest service/tests/test_pack.py -q -k cors`
Kỳ vọng: 2 failed.
- POST: `KeyError` / `None != '*'`, vì không có header.
- OPTIONS: `HTTPError 501: Unsupported method ('OPTIONS')`.

- [ ] **Step 4: Thêm `serviceBase` vào `src/body3d.js`**

Chèn ngay sau hàm `parseFit` (sau dấu `}` đóng `parseFit`):

```js
/**
 * Gốc URL của service thân 3D. `npm run dev` có proxy Vite nên gọi đường tương đối;
 * mở dist/index.html từ ổ đĩa (file://) thì không có proxy, phải gọi thẳng cổng.
 */
export function serviceBase(protocol) {
  return protocol === 'file:' ? 'http://127.0.0.1:8791' : ''
}
```

- [ ] **Step 5: Dùng nó trong `src/main.js`**

Dòng 10, đổi thành:

```js
import { parseFit, solveTargets, predictMeasurements, serviceBase } from './body3d.js'
```

Trong `refetchBody()`, đổi `const res = await fetch('/api/fit', {` thành:

```js
    const res = await fetch(`${serviceBase(location.protocol)}/api/fit`, {
```

- [ ] **Step 6: CORS trong `service/body_service.py`**

Ngay trên `class Handler(BaseHTTPRequestHandler):`, thêm:

```python
# Trang mo tu file:// (ADR-0004) goi thang cong nay, khong qua proxy Vite: can CORS.
# "*" la du: chi nghe 127.0.0.1, khong cookie. Private-Network: Chrome hoi them khi
# mot trang khong phai localhost goi vao dia chi loopback.
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Private-Network": "true",
}
```

Trong `Handler`, thay `_send` và thêm `do_OPTIONS`:

```python
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
```

- [ ] **Step 7: Chạy test, xác nhận qua**

Chạy: `npm test`. Kỳ vọng: toàn bộ pass.

Chạy: `.venv/Scripts/python -m pytest service -q`. Kỳ vọng: 38 passed (36 cũ + 2 mới).

- [ ] **Step 8: Commit**

```bash
git add src/body3d.js src/main.js service/body_service.py test/body3d.test.mjs service/tests/test_pack.py
git commit -m "feat(service): CORS + PNA, browser goi thang 127.0.0.1:8791 khi chay tu file://"
```

---

### Task 3: Mở lại bản ghi `.json` (L09)

**Files:**
- Modify: `src/vi.js` (thêm export `RECORD` cuối file)
- Modify: `src/store.js` (thêm import + hàm `recordToState`)
- Modify: `index.html` (khối `.actions`)
- Modify: `src/main.js` (import, handler, gắn sự kiện sau dòng `$('save').addEventListener('click', onSave)`)
- Test: `test/store.test.mjs`

**Interfaces:**
- Consumes: định dạng bản ghi `draft()` xuất ra (`src/main.js:219-229`):
  `{ design, designVersion, units: 'mm', sa, measurements, easePct, draftedAt }`
- Produces: `recordToState(record: object, knownDesigns: string[]): { design, sa, measurements, easePct, estimated: [] }`.
  Ném `Error` kèm thông điệp tiếng Việt lấy từ `RECORD`.

- [ ] **Step 1: Viết test hỏng**

Trong `test/store.test.mjs`, đổi dòng import thành:

```js
import { getState, setState, setMeasurement, subscribe, resetForTest, recordToState } from '../src/store.js'
```

Thêm vào cuối file:

```js
// Đúng hình dạng draft() trong src/main.js xuất ra.
const RECORD_OK = {
  design: 'bella',
  designVersion: '4.10.1',
  units: 'mm',
  sa: 12,
  measurements: { chest: 1034, waist: 825, hpsToWaistBack: 410 },
  easePct: { chestEase: 11 },
  draftedAt: '2026-10-02T08:00:00.000Z',
}

test('recordToState: nạp lại đúng thứ đã lưu, estimated rỗng', () => {
  const patch = recordToState(RECORD_OK, ['bella', 'brian'])
  assert.deepEqual(patch, {
    design: 'bella',
    sa: 12,
    measurements: { chest: 1034, waist: 825, hpsToWaistBack: 410 },
    easePct: { chestEase: 11 },
    estimated: [],
  })
})

test('recordToState: round-trip qua JSON như file thật', () => {
  const patch = recordToState(JSON.parse(JSON.stringify(RECORD_OK)), ['bella', 'brian'])
  assert.equal(patch.measurements.chest, 1034)
})

test('recordToState: từ chối đơn vị khác mm', () => {
  assert.throws(() => recordToState({ ...RECORD_OK, units: 'inch' }, ['bella']), /mm/)
})

test('recordToState: từ chối block lạ', () => {
  assert.throws(() => recordToState({ ...RECORD_OK, design: 'teagan' }, ['bella', 'brian']), /teagan/)
})

test('recordToState: từ chối số đo không phải số', () => {
  const bad = { ...RECORD_OK, measurements: { chest: '1034' } }
  assert.throws(() => recordToState(bad, ['bella']), /số đo/)
})

test('recordToState: từ chối thứ không phải bản ghi', () => {
  assert.throws(() => recordToState(null, ['bella']), /bản ghi/)
  assert.throws(() => recordToState([], ['bella']), /bản ghi/)
})
```

- [ ] **Step 2: Chạy test, xác nhận hỏng**

Chạy: `node --test test/store.test.mjs`
Kỳ vọng: FAIL. Lỗi `does not provide an export named 'recordToState'`.

- [ ] **Step 3: Thêm chuỗi vào `src/vi.js`**

Thêm vào cuối file:

```js
/** Nạp lại bản ghi .json — đường chuyển số đo từ `npm run dev` sang file:// (L09). */
export const RECORD = {
  open: 'Mở bản ghi .json',
  loaded: (name) => `Đã nạp ${name}. Rập đã vẽ lại theo số đo trong file.`,
  versionDiffers: (then, now) =>
    ` Bản ghi vẽ bằng drafter ${then}, hiện là ${now}: rập có thể khác bản cũ.`,
  notRecord: 'File này không phải bản ghi rập (file .json do nút "Lưu bản ghi" tạo).',
  units: (u) => `Bản ghi dùng đơn vị "${u}", app chỉ nhận mm.`,
  design: (d) => `Bản ghi là block "${d}", app không có block này.`,
  measurements: 'Bản ghi có số đo không phải số.',
}
```

- [ ] **Step 4: Thêm `recordToState` vào `src/store.js`**

Thêm ở đầu file, ngay dưới hai dòng comment đầu:

```js
import { RECORD } from './vi.js'
```

Thêm vào cuối file:

```js
/**
 * Bản ghi .json (do draft() xuất) -> patch cho setState. Hàm thuần, ném lỗi tiếng Việt.
 * Thay HẲN số đo/cử động bằng thứ trong file: mục đích là tái tạo đúng rập cũ.
 * `knownDesigns`: key các block app đang có (store không biết freesewing).
 */
export function recordToState(record, knownDesigns) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error(RECORD.notRecord)
  if (record.units !== 'mm') throw new Error(RECORD.units(record.units))
  if (!knownDesigns.includes(record.design)) throw new Error(RECORD.design(record.design))
  const m = record.measurements
  if (!m || typeof m !== 'object' || !Object.values(m).every(Number.isFinite)) {
    throw new Error(RECORD.measurements)
  }
  return {
    design: record.design,
    sa: Number.isFinite(record.sa) ? record.sa : DEFAULT.sa,
    measurements: { ...m },
    easePct: { ...(record.easePct ?? {}) },
    estimated: [],
  }
}
```

- [ ] **Step 5: Chạy test, xác nhận qua**

Chạy: `node --test test/store.test.mjs`. Kỳ vọng: 10/10 pass.

- [ ] **Step 6: Gắn vào giao diện**

Trong `index.html`, khối `<div class="actions">`, ngay sau dòng nút `save`, thêm:

```html
        <button id="open" type="button" class="ghost"></button>
        <input id="openFile" type="file" accept=".json,application/json" hidden />
```

Trong `src/main.js`:

Dòng 7, đổi import `vi.js` thành:

```js
import { MEASUREMENTS, OPTIONS, SVG_STRINGS, UI, RECORD } from './vi.js'
```

Dòng 8, thêm `recordToState` vào import `store.js`:

```js
import { getState, setState, setMeasurement, subscribe, save, load, recordToState } from './store.js'
```

Ngay sau hàm `onSave`, thêm:

```js
async function onOpenFile(e) {
  const file = e.target.files?.[0]
  e.target.value = '' // chọn lại đúng file đó vẫn phải bắn 'change'
  if (!file) return
  try {
    let record
    try {
      record = JSON.parse(await file.text())
    } catch {
      throw new Error(RECORD.notRecord)
    }
    setState(recordToState(record, Object.keys(DESIGNS)))
    select.value = getState().design
    $('sa').value = String(getState().sa)
    buildMeasurementForm()
    buildBodyForm()
    buildEaseForm()
    showPreview(draft())
    const now = lastDraft.record.designVersion
    let msg = RECORD.loaded(file.name)
    if (record.designVersion && record.designVersion !== now) {
      msg += RECORD.versionDiffers(record.designVersion, now)
    }
    status(msg)
  } catch (err) {
    status(err.message, true)
  }
}
```

Ngay sau dòng `$('save').addEventListener('click', onSave)`, thêm:

```js
$('open').textContent = RECORD.open
$('open').addEventListener('click', () => $('openFile').click())
$('openFile').addEventListener('change', onOpenFile)
```

- [ ] **Step 7: Kiểm bằng trình duyệt (`npm run dev`)**

1. Mở bằng `preview_start` với `{name: "pattern-studio"}`.
2. Bấm **Lưu bản ghi .json**, lấy file vừa tải về.
3. Đổi một số đo (ví dụ vòng ngực +50).
4. Bấm **Mở bản ghi .json**, chọn file đó.

Kỳ vọng:
- Ô số đo về lại giá trị cũ.
- Dòng trạng thái báo "Đã nạp …".
- Console không có lỗi (`read_console_messages`).

Thử thêm một file `.json` sai, ví dụ `{"units":"inch"}`. Kỳ vọng: dòng trạng thái đỏ "Bản ghi dùng đơn vị "inch"…".

- [ ] **Step 8: Commit**

```bash
git add src/vi.js src/store.js src/main.js index.html test/store.test.mjs
git commit -m "feat: mo lai ban ghi .json (chuyen so do tu npm run dev sang file://)"
```

---

### Task 4: Launcher: `RunApp.bat`, `npm run service` dùng `.venv` (L02, L05)

**Files:**
- Create: `test/launch.test.mjs`, `RunApp.bat`
- Modify: `package.json` (script `service`), `Setup.bat` (đoạn hướng dẫn cuối),
  `service/body_service.py` (`LANDING` + các dòng `print` khởi động)

**Interfaces:**
- Consumes: `npm run build` ra một file (Task 1).
- Produces: `RunApp.bat [rebuild]`. Task 7 dùng nó.

- [ ] **Step 1: Viết test hỏng**

Tạo `test/launch.test.mjs`:

```js
// Harness L02 + L05 (docs/tai-lieu-loi.md): những cách khởi động người dùng thật sự bấm.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

test('L02: npm run service dùng python trong .venv, không phải python hệ thống', () => {
  assert.match(pkg.scripts.service, /\.venv[\\/]+Scripts[\\/]+python/i)
})

const bats = readdirSync(root).filter((f) => /\.bat$/i.test(f))

test('có RunApp.bat ở gốc repo', () => {
  assert.ok(bats.includes('RunApp.bat'), `chỉ thấy: ${bats.join(', ')}`)
})

for (const name of bats) {
  test(`L05: ${name} thuần ASCII, CRLF, không gọi chcp`, () => {
    const bytes = readFileSync(join(root, name))
    const nonAscii = [...bytes].findIndex((b) => b > 127)
    assert.equal(nonAscii, -1, `byte ngoài ASCII tại vị trí ${nonAscii}`)
    const lines = bytes.toString('latin1').split('\n')
    const lfOnly = lines.slice(0, -1).findIndex((l) => !l.endsWith('\r'))
    assert.equal(lfOnly, -1, `dòng ${lfOnly + 1} kết thúc LF, cmd cần CRLF`)
    const chcp = lines.findIndex((l) => !/^\s*(rem\b|::)/i.test(l) && /\bchcp\b/i.test(l))
    assert.equal(chcp, -1, `dòng ${chcp + 1} gọi chcp`)
  })
}
```

- [ ] **Step 2: Chạy test, xác nhận hỏng**

Chạy: `node --test test/launch.test.mjs`

Kỳ vọng: 2 FAIL.
- `L02` không khớp `python service/body_service.py`.
- `có RunApp.bat` báo chỉ thấy `RunService.bat, Setup.bat`.

Hai test `L05` cho `RunService.bat` và `Setup.bat` phải **PASS**. Chúng đã đúng sẵn, `chcp` chỉ xuất hiện trong dòng `rem`.

- [ ] **Step 3: Sửa `package.json`**

Đổi dòng script `service` thành:

```json
    "service": ".venv\\Scripts\\python.exe service/body_service.py",
```

- [ ] **Step 4: Tạo `RunApp.bat`**

```bat
@echo off
rem ============================================================================
rem  Pattern Studio - mo ung dung
rem
rem  Nhay doi file nay. Lan dau: cai thu vien + build (vai phut). Cac lan sau:
rem  mo ngay dist\index.html trong trinh duyet, khong can server (ADR-0004).
rem  Sua code xong muon thay ket qua:   RunApp.bat rebuild
rem
rem  File nay CHI DUNG ASCII va khong goi "chcp 65001" (docs/tai-lieu-loi.md L05).
rem  Chay trong cmd nen khong vuong ExecutionPolicy cua PowerShell (L01).
rem ============================================================================
setlocal EnableExtensions
cd /d "%~dp0"

echo.
echo  ==========================================
echo   Pattern Studio
echo  ==========================================
echo.

if not exist "package.json" (
    echo  [LOI] Khong thay package.json. RunApp.bat phai nam o thu muc goc du an.
    goto :fail
)

where node >nul 2>&1
if errorlevel 1 (
    echo  [LOI] Chua cai Node.js. Tai ban LTS tai https://nodejs.org/
    echo  Cai xong, MO LAI cua so nay roi chay lai RunApp.bat.
    goto :fail
)
node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=12)?0:1)"
if errorlevel 1 (
    echo  [LOI] Node.js qua cu, can 22.12 tro len. Dang co:
    node -v
    goto :fail
)

if not exist "node_modules\.bin\vite.cmd" (
    echo  Cai thu vien JavaScript ^(npm install^)...
    call npm install
    if errorlevel 1 goto :fail_npm
)

if /i "%~1"=="rebuild" goto :build
if exist "dist\index.html" goto :open

:build
echo  Build ^(npm run build^)...
call npm run build
if errorlevel 1 goto :fail_npm
rem npm co the in loi ma van thoat 0: kiem tra chinh ket qua
if not exist "dist\index.html" goto :fail_npm

:open
echo  Mo dist\index.html ...
start "" "%~dp0dist\index.html"
echo.
echo  Tab "Than 3D" can service: nhay doi RunService.bat ^(cua so rieng^).
echo.
endlocal & exit /b 0

:fail_npm
echo.
echo  [LOI] npm that bai. Doc thong bao phia tren.
echo  Neu loi EPERM: dong cac cua so "npm run dev" dang chay roi thu lai.

:fail
echo.
echo  Nhan phim bat ky de dong cua so nay...
pause >nul
endlocal & exit /b 1
```

- [ ] **Step 5: Đổi `RunApp.bat` sang CRLF**

Công cụ ghi file tạo ra LF. Chạy:

```bash
node -e "const fs=require('fs');const f='RunApp.bat';fs.writeFileSync(f,fs.readFileSync(f,'utf8').replace(/\r?\n/g,'\r\n'))"
```

- [ ] **Step 6: Sửa hướng dẫn cuối `Setup.bat`**

Thay khối:

```bat
echo  Cach chay:
echo    1. Nhay doi RunService.bat        ^(service than 3D^)
echo    2. Mo cua so khac, chay:  npm run dev
echo    3. Vao trinh duyet:  http://localhost:5173
echo.
echo  Buoc 1 co the bo qua: khi do tab Rap van chay day du,
echo  chi tab Than 3D la khong dung duoc.
```

bằng:

```bat
echo  Cach chay:
echo    1. Nhay doi RunApp.bat            ^(mo ung dung^)
echo    2. Nhay doi RunService.bat        ^(chi can cho tab Than 3D^)
echo.
echo  Buoc 2 co the bo qua: khi do tab Rap van chay day du,
echo  chi tab Than 3D la khong dung duoc.
```

Và thay dòng:

```bat
echo  Cach chay:  npm run dev    roi vao  http://localhost:5173
```

bằng:

```bat
echo  Cach chay:  nhay doi RunApp.bat
```

Sửa xong thì kiểm `Setup.bat` vẫn CRLF. Sửa bằng công cụ có thể giữ hoặc làm mất CRLF. Test ở Step 8 sẽ bắt. Nếu FAIL, chạy lệnh ở Step 5 với `f='Setup.bat'`.

- [ ] **Step 7: Trang landing và dòng in khởi động của service**

Trong `service/body_service.py`, khối `LANDING`, thay đoạn:

```html
<p>Chưa mở được? Mở một cửa sổ terminal khác trong thư mục dự án và chạy
<code>npm run dev</code>.</p>
```

bằng:

```html
<p>Chưa mở được? Nhấp đúp <code>RunApp.bat</code> trong thư mục dự án
(hoặc chạy <code>npm run dev</code> nếu đang sửa code).</p>
```

Trong khối `if __name__ == "__main__":`, thay dòng:

```python
    print("  Mo cua so khac, chay 'npm run dev', roi vao:  http://localhost:5173")
```

bằng:

```python
    print("  Mo ung dung: nhay doi RunApp.bat (hoac 'npm run dev' -> http://localhost:5173)")
```

- [ ] **Step 8: Chạy test, xác nhận qua**

Chạy: `npm test`. Kỳ vọng: toàn bộ pass, gồm 5 test trong `launch.test.mjs`.

Chạy: `.venv/Scripts/python -m pytest service -q`. Kỳ vọng: 38 passed. Test landing vẫn thấy
`localhost:5173` và `npm run dev`. Test ASCII cho `print` vẫn qua.

- [ ] **Step 9: Thử `npm run service` thật**

Chạy ở nền (`run_in_background`): `npm run service`. Đợi dòng `SAN SANG` (khoảng 10–20 s) bằng
Monitor hoặc đọc log. Sau đó:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X OPTIONS http://127.0.0.1:8791/api/fit
```

Kỳ vọng: `204`. Dừng tiến trình service.

Trước đây lệnh này chết ngay với `ModuleNotFoundError: No module named 'anny'`.

- [ ] **Step 10: Commit**

```bash
git add test/launch.test.mjs RunApp.bat package.json Setup.bat service/body_service.py
git commit -m "feat: RunApp.bat mo dist/index.html; npm run service dung .venv"
```

---

### Task 5: Smoke test trên trình duyệt thật từ `file://` (L03)

**Files:**
- Create: `scripts/smoke-file.mjs`
- Modify: `package.json` (thêm script `smoke`)

**Interfaces:**
- Consumes: `dist/index.html` (Task 1). Lúc khởi động app tự gọi `onDraft()`, nên `#preview` có
  `<svg>` mà không cần bấm gì (`src/main.js`, cuối file).
- Produces: `npm run smoke`. Thoát 0 là xanh, 1 là đỏ, 2 là bỏ qua (không có trình duyệt). Mã 2
  **không** được coi là xanh.

- [ ] **Step 1: Viết script**

Tạo `scripts/smoke-file.mjs`:

```js
// Harness L03 (docs/tai-lieu-loi.md): mở dist/index.html bằng file:// trong Chrome/Edge
// headless, xác nhận rập vẽ ra và console không có lỗi. node --test không làm được việc
// này: nó không có trình duyệt, nên không thấy được lệnh chặn module/fetch của file://.
// Thoát: 0 xanh · 1 đỏ · 2 bỏ qua (không có trình duyệt) — 2 KHÔNG phải xanh.
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const html = fileURLToPath(new URL('../dist/index.html', import.meta.url))
if (!existsSync(html)) {
  console.error('DO: chua co dist/index.html. Chay: npm run build')
  process.exit(1)
}

const browser = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find(existsSync)
if (!browser) {
  console.log('BO QUA: khong thay Chrome/Edge. Smoke CHUA chay - khong phai xanh.')
  process.exit(2)
}

const profile = mkdtempSync(join(tmpdir(), 'ps-smoke-'))
const r = spawnSync(
  browser,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    `--user-data-dir=${profile}`,
    '--enable-logging=stderr',
    '--v=0',
    '--virtual-time-budget=8000',
    '--dump-dom',
    pathToFileURL(html).href,
  ],
  { encoding: 'utf8', maxBuffer: 256 * 2 ** 20, timeout: 120_000 },
)
rmSync(profile, { recursive: true, force: true })

const problems = []
const preview = r.stdout.match(/<section id="preview"[^>]*>([\s\S]*?)<\/section>/)
if (!preview) problems.push('khong thay #preview trong DOM (app khong chay?)')
else if (!preview[1].includes('<svg')) problems.push('#preview khong co <svg>: rap khong ve ra')
const errors = (r.stderr || '').split('\n').filter((l) => /Uncaught|CONSOLE\(\d+\)\].*Error/i.test(l))
problems.push(...errors.map((l) => `console: ${l.trim()}`))

if (problems.length) {
  console.error(`DO (${browser}):\n  ` + problems.join('\n  '))
  process.exit(1)
}
console.log(`XANH: dist/index.html mo tu file:// ve ra rap, console sach (${browser})`)
```

- [ ] **Step 2: Thêm script vào `package.json`**

Trong `"scripts"`, thêm sau `"preview"`:

```json
    "smoke": "node scripts/smoke-file.mjs",
```

- [ ] **Step 3: Chứng minh harness biết báo đỏ**

Build đúng, rồi cố ý làm hỏng `dist/index.html`: thêm một module ngoài (bị `file://` chặn) và
một lỗi JS. Chạy:

```bash
npm run build
node -e "const fs=require('fs');const f='dist/index.html';fs.writeFileSync(f,fs.readFileSync(f,'utf8').replace('<script type=\"module\" crossorigin>','<script type=\"module\" crossorigin src=\"/assets/missing.js\"></script><script>throw new Error(\"smoke-red\")</script><script type=\"module\" crossorigin>'))"
npm run smoke
```

Kỳ vọng: thoát 1, in `DO` kèm dòng console `smoke-red`. Step 4 build lại nên bản hỏng này
không còn.

- [ ] **Step 4: Chạy trên bản build đúng**

Chạy: `npm run build && npm run smoke`

Kỳ vọng: `XANH: dist/index.html mo tu file:// ve ra rap, console sach (...)`, thoát 0.

Nếu `#preview` rỗng vì `--virtual-time-budget` quá ngắn, tăng lên `15000`. Không được nới điều
kiện kiểm.

- [ ] **Step 5: Commit**

```bash
git add scripts/smoke-file.mjs package.json
git commit -m "test: npm run smoke mo dist/index.html bang Chrome headless tu file://"
```

---

### Task 6: Tài liệu lỗi + cập nhật CLAUDE.md, README

**Files:**
- Create: `docs/tai-lieu-loi.md`
- Modify: `CLAUDE.md` (hai khối lệnh bash + một dòng trỏ), `README.md` (mục "Mở ứng dụng", bảng lệnh, cây file)

**Interfaces:**
- Consumes: tên các test đã tạo ở Task 1–5.
- Produces: tài liệu. Không có code.

- [ ] **Step 1: Viết `docs/tai-lieu-loi.md`**

````markdown
# Tài liệu lỗi

Lỗi đã gặp hoặc dễ gặp, mỗi lỗi kèm harness bắt nó. **Gặp lỗi lạ: đọc file này trước.**
Sửa xong một lỗi mới thì thêm một mục ở đây, kèm harness, hoặc ghi rõ "chưa có — lý do".

Chạy toàn bộ harness:

```bash
npm test                                  # build, launcher, store, body3d, tile
.venv/Scripts/python -m pytest service -q # service, CORS
npm run build && npm run smoke            # mở file:// bằng Chrome headless
```

## L01 — PowerShell chặn npm
Triệu chứng: `npm : File C:\Program Files\nodejs\npm.ps1 cannot be loaded because running scripts is disabled on this system.`
Nguyên nhân: ExecutionPolicy mặc định của Windows là `Restricted`. Trong PowerShell, `npm` gọi `npm.ps1`.
Sửa: dùng `RunApp.bat` / `RunService.bat` (chạy trong cmd), hoặc gõ lệnh trong cmd. Không đổi chính sách máy thay người dùng.
Harness: chưa có — chính sách thuộc về máy, không thuộc về repo. Các file `.bat` tránh được lỗi này vì chạy bằng cmd.

## L02 — `npm run service` báo thiếu anny
Triệu chứng: `ModuleNotFoundError: No module named 'anny'`
Nguyên nhân: script gọi `python` hệ thống, không phải Python trong `.venv`.
Sửa: script `service` trỏ tới `.venv\Scripts\python.exe`.
Harness: `test/launch.test.mjs` › `L02: npm run service dùng python trong .venv`

## L03 — Mở `dist/index.html` ra trang trắng
Triệu chứng: trang trắng. Console báo bị chặn tải `/assets/…js` từ origin `null`.
Nguyên nhân: `file://` chặn `<script type="module" src>` và mọi file bên ngoài.
Sửa: `vite-plugin-singlefile` (ADR-0004).
Harness: `test/dist.test.mjs` › `build ra đúng một file…`, `không thẻ nào trỏ ra ngoài…`; `npm run smoke`

## L04 — Asset dùng đường dẫn tuyệt đối
Triệu chứng: như L03.
Nguyên nhân: thiếu `base: './'`, nên Vite sinh ra `/assets/...`.
Sửa: `base: './'` trong `vite.config.js`.
Harness: `test/dist.test.mjs` › `không thẻ nào trỏ ra ngoài…`

## L05 — File `.bat` chạy sai kỳ lạ
Triệu chứng: `echo.` in ra `o.`, `set` mất giá trị, chữ có dấu thành rác.
Nguyên nhân: gọi `chcp 65001` giữa file làm cmd đọc lệch byte; có ký tự ngoài ASCII; dòng kết thúc LF.
Sửa: `.bat` chỉ dùng ASCII, CRLF (`.gitattributes`), không `chcp`.
Harness: `test/launch.test.mjs` › `L05: <tên>.bat thuần ASCII, CRLF, không gọi chcp`

## L06 — Rập rộng gấp 100 lần, không báo lỗi
Triệu chứng: rập to bất thường. Cử động 11% thành 1100%.
Nguyên nhân: option phần trăm truyền thẳng `11` thay vì phân số `0.11`.
Sửa: chỉ chia 100 ở một chỗ, `draft()` trong `src/main.js`.
Harness: chưa có — `draft()` còn dính DOM. S2 tách phần chuyển option ra thành hàm thuần rồi viết test.

## L07 — Tab Thân 3D báo "Failed to fetch" khi chạy từ `file://`
Triệu chứng: `Không kết nối được service thân 3D: Failed to fetch`, dù `RunService.bat` đang chạy.
Nguyên nhân: không có proxy Vite; service thiếu header CORS / Private Network Access.
Sửa: `serviceBase()` trong `src/body3d.js`; `CORS` + `do_OPTIONS` trong `service/body_service.py`.
Harness: `test/body3d.test.mjs` › `serviceBase…`; `service/tests/test_pack.py::test_cors_post_tu_trang_file`, `::test_cors_preflight_co_private_network`

## L08 — Service không khởi động: cổng 8791 bị chiếm
Triệu chứng: `RunService.bat` báo `Cong 8791 dang bi chiem`.
Nguyên nhân: một service cũ vẫn đang chạy.
Sửa: đóng cửa sổ cũ, hoặc `taskkill /F /PID <pid>`.
Harness: `RunService.bat` tự kiểm trước khi chạy.

## L09 — Số đo "biến mất" khi chuyển từ `npm run dev` sang `file://`
Triệu chứng: mở `dist/index.html` thấy số đo mẫu, không thấy số mình đã nhập.
Nguyên nhân: localStorage tách theo origin: `http://localhost:5173` ≠ `file://`.
Sửa: ở bản cũ bấm **Lưu bản ghi .json**, sang bản mới bấm **Mở bản ghi .json**.
Harness: `test/store.test.mjs` › `recordToState: …` (6 test)

## L10 — Offline thì vỡ font/giao diện
Triệu chứng: font rơi về font hệ thống, chữ Việt có dấu lệch dòng.
Nguyên nhân: font hoặc CSS tải từ CDN/Google Fonts.
Sửa: đóng gói font bằng `@fontsource`, nhúng inline.
Harness: `test/dist.test.mjs` › `CSS không tải font/ảnh từ ngoài…`

## L11 — Sửa code rồi mà app vẫn như cũ
Triệu chứng: thay đổi không hiện khi mở `dist/index.html`.
Nguyên nhân: `dist/` là bản build cũ.
Sửa: `RunApp.bat rebuild`.
Harness: chưa có — muốn tự động thì phải so thời gian sửa file nguồn với thời gian build; để sau nếu lỗi này lặp lại.

## L12 — Lỗi Phase 1 đã mắc ở thân 3D
| Lỗi | Harness |
|---|---|
| Một delta cho cả hai chiều target, nhánh âm sai 19,8 mm | `service/tests/test_linear.py::test_hai_delta_moi_target`, `::test_bust_co_hai_nhanh_khac_nhau` |
| Gửi mesh đã áp target, browser cộng thêm lần nữa (lệch 50 mm) | `test/body3d.test.mjs` › `positions là mesh GỐC…` |
| Lẫn `base` với `measurements` trong header | `test/body3d.test.mjs` › `header có cả base lẫn measurements…` |
| Đổi trục / trừ gốc hai lần, mesh bay đi | `service/tests/test_pack.py::test_doi_he_truc_metz_up_sang_mm_yup` |
| Service báo giá trị dự đoán thay vì đo lại | `service/tests/test_pack.py::test_BAT_BIEN_CHINH_service_khong_noi_doi` |
| Bộ giải hy sinh eo để cứu chân ngực | `service/tests/test_linear.py::test_khong_hy_sinh_so_do_de_dat_de_cuu_so_do_ngoai_tam` |
| Tầng đo trôi theo khi fit (kẹt ở −84 mm) | chưa có test riêng — CLAUDE.md luật 2; S3 thêm khi port thước dây |

## L13 — Service chết ngay khi vừa sẵn sàng
Triệu chứng: `UnicodeEncodeError` ngay sau dòng nạp Anny.
Nguyên nhân: `print()` chữ có dấu ra console cmd.exe, vốn không mã hoá được.
Sửa: dòng `print` khởi động chỉ dùng ASCII.
Harness: `service/tests/test_pack.py::test_thong_bao_khoi_dong_thuan_ASCII`
````

- [ ] **Step 2: Sửa CLAUDE.md**

Thay khối:

````markdown
```bash
npm run dev     # vite, cổng 5173
npm test        # node --test, kiểm tra toán chia trang
npm run build
```
````

bằng:

````markdown
**App là một file `dist/index.html` mở từ `file://` ([ADR-0004](docs/adr/0004-mot-file-html-mo-tu-file-protocol.md)).**
Người dùng nhấp đúp `RunApp.bat` (build nếu chưa có, rồi mở). `file://` chặn module/fetch
ngoài, không có proxy: đừng thêm asset ngoài, CDN, `fetch` file cạnh bên.

**Gặp lỗi lạ → đọc [`docs/tai-lieu-loi.md`](docs/tai-lieu-loi.md) trước. Sửa xong lỗi mới →
thêm mục + harness.**

```bash
RunApp.bat            # người dùng: build nếu cần + mở dist/index.html  (RunApp.bat rebuild)
npm run dev           # phát triển, cổng 5173, có proxy /api
npm test              # node --test: toán chia trang, build một file, launcher, store, body3d
npm run build
npm run smoke         # Chrome headless mở dist/index.html từ file://
```
````

Thay khối:

````markdown
```bash
npm run service   # cổng 8791, Vite proxy /api sang đây
.venv/Scripts/python -m pytest service
```
````

bằng:

````markdown
```bash
npm run service   # cổng 8791 (.venv). Dev: proxy /api. file://: gọi thẳng, cần CORS
.venv/Scripts/python -m pytest service
```
````

- [ ] **Step 3: Sửa README.md**

Mục `## Mở ứng dụng`: thay từ dòng ` ```bash` / `npm run dev` / ` ``` ` cho tới hết đoạn
"…để bạn đợi ở lần bấm đầu tiên." bằng:

````markdown
**Nhấp đúp `RunApp.bat`.** Lần đầu nó cài thư viện và build (vài phút). Các lần sau nó mở
ngay `dist/index.html` trong trình duyệt, không cần server hay terminal. Sửa code xong thì chạy
`RunApp.bat rebuild`.

Muốn dùng tab **Thân 3D** thì **nhấp đúp `RunService.bat`** (cửa sổ riêng, để nguyên). Nó kiểm
tra `.venv`, thư viện và cổng 8791 trước khi chạy, và không tự đóng cửa sổ khi lỗi. Lần đầu mất
khoảng 10 giây để biên dịch kernel.

Chuyển từ bản `npm run dev` cũ sang? Số đo **không** tự theo sang (khác origin). Ở bản cũ bấm
**Lưu bản ghi .json**, sang bản mới bấm **Mở bản ghi .json**.

Gặp lỗi: xem [`docs/tai-lieu-loi.md`](docs/tai-lieu-loi.md).
````

Trong bảng lệnh (gần dòng `npm run build    # build bản tĩnh vào dist/`): thêm dòng
`npm run smoke    # mở dist/index.html bằng Chrome headless để kiểm`. Sửa dòng `npm run service`
thành `npm run service  # service thân 3D, cổng 8791 (dùng .venv)`.

Trong cây file (gần dòng `Setup.bat …`): thêm dòng
`RunApp.bat                       mở ứng dụng (nháy đôi; "rebuild" để build lại)`.

- [ ] **Step 4: Kiểm tên test trong tài liệu khớp với thật**

Chạy:

```bash
grep -oE "test_[a-zA-Z0-9_]+" docs/tai-lieu-loi.md | sort -u | while read t; do grep -rq "def $t" service/tests || echo "THIEU: $t"; done
```

Kỳ vọng: không in gì. Nếu có dòng `THIEU`, sửa tài liệu cho đúng tên test.

- [ ] **Step 5: Commit**

```bash
git add docs/tai-lieu-loi.md CLAUDE.md README.md
git commit -m "docs: tai lieu loi L01-L13, cach chay moi (RunApp.bat, file://)"
```

---

### Task 7: Nghiệm thu theo tiêu chí xong của spec §6

**Files:** không sửa code. Lỗi tìm thấy ở đây thì quay lại task tương ứng, kèm test đỏ trước.

- [ ] **Step 1: Toàn bộ harness**

```bash
npm test
.venv/Scripts/python -m pytest service -q
npm run build && npm run smoke
```

Kỳ vọng: cả ba xanh. Smoke in `XANH`, thoát 0.

- [ ] **Step 2: `RunApp.bat` từ trạng thái sạch (tiêu chí 2)**

```bash
rm -rf dist
cmd //c "echo.|RunApp.bat"
```

Kỳ vọng: in `Build (npm run build)...`, rồi `Mo dist\index.html ...`, thoát 0. `dist/` chỉ có
`index.html`.

Chạy lại `cmd //c "echo.|RunApp.bat"`. Kỳ vọng: không build lại, mở ngay.

- [ ] **Step 3: `file://` trong trình duyệt, tab Rập (tiêu chí 2)**

Mở `file:///D:/001_PersonalProject/Sewing%20pattern_pattern%20cutting_3D%20modeling/dist/index.html`
bằng `navigate` của built-in browser. Nếu pane không mở được `file://`, dùng Claude in Chrome
và báo lại.

Kiểm:
- Rập Bella vẽ ra.
- Đổi block sang Brian, rập vẽ ra.
- `read_console_messages` không có lỗi.

- [ ] **Step 4: Tab Thân 3D từ `file://` (tiêu chí 4, rủi ro chính của spec §7)**

1. Chạy `RunService.bat` ở nền: `cmd //c "echo.|RunService.bat"` với `run_in_background`. Đợi
   cổng 8791 LISTENING.
2. Trên trang `file://` bấm tab **Thân 3D**.

Kỳ vọng: thân dựng ra, bảng lệch có 9 dòng.

Nếu bị chặn (console báo CORS hoặc Private Network): **dừng**, ghi nguyên văn lỗi vào L07 của tài
liệu lỗi, báo người dùng. Áp phương án lùi trong spec §7. Không tự nới bảo mật trình duyệt.

Xong thì dừng service.

- [ ] **Step 5: Lưu ở dev → mở ở `file://` (tiêu chí 5)**

1. `preview_start {name: "pattern-studio"}`.
2. Nhập vòng ngực 1100, bấm **Lưu bản ghi .json**.
3. Sang tab `file://`, bấm **Mở bản ghi .json**, chọn file đó.

Kỳ vọng: vòng ngực 1100, rập vẽ lại, dòng trạng thái "Đã nạp …".

- [ ] **Step 6: `npm run dev` vẫn chạy (tiêu chí 6)**

Trên preview dev: tab Rập vẽ được. Tab Thân 3D (service bật) dựng được thân. Console sạch.

- [ ] **Step 7: In 1:1 — NGƯỜI DÙNG làm (tiêu chí 3)**

Báo người dùng làm các bước sau trước khi cắt toile:
1. Mở `dist/index.html` từ `RunApp.bat`.
2. Bấm **In 1:1 (A4)**.
3. Trong hộp thoại in: tỉ lệ **100% / Actual size**, không "Fit to page".
4. In trang 1, đo ô hiệu chuẩn. Phải đúng **100 mm** cả hai chiều.

Chưa có xác nhận này thì S1 **chưa xong**.

- [ ] **Step 8: Đánh dấu xong**

Khi Step 1–7 đều đạt, thêm ngay dưới dòng `Ngày: …` ở đầu spec một dòng
`**Trạng thái:** xong <ngày thật YYYY-MM-DD>, in 1:1 đã đo 100 mm`. Rồi commit:

```bash
git add docs/superpowers/specs/2026-10-02-s1-dong-goi-file-design.md
git commit -m "docs: S1 nghiem thu xong"
```
