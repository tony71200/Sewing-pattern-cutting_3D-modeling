# Kế hoạch triển khai — Ma-nơ-canh 3D tham số (Phase 1)

> **Cho agent thực thi:** BẮT BUỘC dùng sub-skill `superpowers:subagent-driven-development`
> (khuyến nghị) hoặc `superpowers:executing-plans` để làm từng task một. Các bước dùng
> checkbox (`- [ ]`) để theo dõi.

**Mục tiêu:** Dựng ma-nơ-canh toàn thân trên web, biến đổi theo số đo cơ thể (nam và nữ),
chỉnh được từ cả form rập lẫn panel 3D, không giật lag.

**Kiến trúc:** Sinh hình học thủ tục từ các lát cắt ngang. Mỗi tầng là một siêu ê-líp được
nhân hệ số cho **chu vi đúng bằng số đo**, nên hai chiều là chính xác chứ không phải xấp xỉ —
không cần giải bài toán ngược. Số đỉnh cố định nên cập nhật là ghi đè tại chỗ vào
`Float32Array` đã cấp phát sẵn, không cấp phát mới, không rác GC.

**Công nghệ:** JavaScript thuần (ESM), Vite 8, three.js 0.185 (MIT), `node --test`.
Không framework UI, không TypeScript.

**Spec:** [`docs/superpowers/specs/2026-09-07-3d-mannequin-design.md`](../specs/2026-09-07-3d-mannequin-design.md)

## Ràng buộc toàn cục

Mọi task đều phải tuân thủ. Lấy nguyên văn từ `CLAUDE.md` và spec.

- **Đơn vị là mm.** Số nguyên hoặc float mm. Không inch, không đơn vị trừu tượng ở core.
- **Ngoại lệ duy nhất: `shoulderSlope` tính bằng ĐỘ.** Không được nhân tỉ lệ, không được coi
  là mm.
- **Option phần trăm truyền vào freesewing dưới dạng phân số**: 11% → `0.11`. Đã xử lý ở
  `draft()` trong `src/main.js`, đừng làm hỏng khi refactor.
- **Mọi chuỗi tiếng Việt nằm trong `src/vi.js`.** UI lẫn nhãn in trên rập. Không hardcode
  chuỗi ở file khác.
- **Trục toạ độ 3D:** `y` hướng lên, gốc ở sàn, đơn vị mm. `z > 0` là **phía trước** cơ thể.
  `x > 0` là bên **trái** người xem.
- **Số tầng và số điểm mỗi tầng là hằng số**, không phụ thuộc số đo. Đây là điều kiện của
  yêu cầu "không giật lag" — vi phạm là hỏng kiến trúc, không phải hỏng hiệu năng.
- **Chuẩn hoá chu vi luôn là bước CUỐI** của việc dựng một tiết diện. Đắp bầu ngực xong mới
  chuẩn hoá. Đảo thứ tự là lỗi im lặng.
- **Số đo ước lượng phải hiển thị rõ là ước lượng.**
- `npm test` phải xanh sau mỗi task. Test `test/tile.test.mjs` của Phase 0 không được đỏ.
- Đánh dấu chỗ cắt góc có chủ đích bằng comment `ponytail:` kèm trần và đường nâng cấp.

## Cấu trúc file

| File | Trách nhiệm |
|---|---|
| `src/store.js` | **Tạo.** Trạng thái + pub/sub. Một nguồn sự thật duy nhất. |
| `src/body/estimate.js` | **Tạo.** Suy số đo thiếu từ bộ mẫu bằng hai hệ số tỉ lệ. |
| `src/body/section.js` | **Tạo.** Một tiết diện: siêu ê-líp, bầu ngực, chuẩn hoá chu vi. |
| `src/body/levels.js` | **Tạo.** Số đo → bảng tầng (y, chu vi mục tiêu, tỉ lệ dáng). |
| `src/body/mesh.js` | **Tạo.** Bảng tầng → đỉnh/chỉ số. Loft thân + ống tay chân. |
| `src/view3d.js` | **Tạo.** Cảnh three.js, render theo yêu cầu, nối vào store. |
| `src/main.js` | **Sửa.** Chuyển từ đọc DOM sang đọc store. |
| `src/vi.js` | **Sửa.** Thêm số đo thân và chuỗi UI 3D. |
| `index.html` | **Sửa.** Tab Rập / Thân 3D, mục "Số đo thân". |
| `src/app.css` | **Sửa.** Style tab, canvas, nhãn ước lượng. |
| `test/body.test.mjs` | **Tạo.** Test hình học — chạy trong node, không cần trình duyệt. |
| `test/store.test.mjs` | **Tạo.** Test store. |

Toàn bộ `src/body/*` là toán thuần, **không import DOM, không import three.js**. Đây là lý do
test chạy được bằng `node --test`.

---

## Task 1: Store — một nguồn sự thật

Hiện `main.js` giữ trạng thái trong chính các ô input DOM (`readMeasurements()` đọc ngược ra
từ DOM). Cách đó chỉ đúng khi có một giao diện. Thêm panel 3D là hỏng. Task này phải làm
trước mọi task khác.

**Files:**
- Tạo: `src/store.js`
- Tạo: `test/store.test.mjs`
- Sửa: `src/main.js`

**Interfaces:**
- Cung cấp cho task sau:
  - `getState() → { design, measurements, estimated, easePct, sa }`
  - `setMeasurement(name: string, value: number) → void`
  - `setState(patch: object) → void`
  - `subscribe(fn: (state) => void) → () => void` (trả về hàm huỷ đăng ký)
  - `load() → void` (nạp từ localStorage), `save() → void`

- [ ] **Bước 1: Viết test thất bại**

Tạo `test/store.test.mjs`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getState, setState, setMeasurement, subscribe, resetForTest } from '../src/store.js'

test('setState gộp vào state và báo cho subscriber', () => {
  resetForTest()
  let calls = 0
  subscribe(() => calls++)
  setState({ sa: 15 })
  assert.equal(getState().sa, 15)
  assert.equal(calls, 1)
})

test('unsubscribe thì không nhận thông báo nữa', () => {
  resetForTest()
  let calls = 0
  const off = subscribe(() => calls++)
  setState({ sa: 12 })
  off()
  setState({ sa: 13 })
  assert.equal(calls, 1)
})

test('setMeasurement ghi số đo và bỏ tên đó khỏi danh sách ước lượng', () => {
  resetForTest()
  setState({ measurements: { chest: 1000 }, estimated: ['hips', 'seat'] })
  setMeasurement('hips', 950)
  assert.equal(getState().measurements.hips, 950)
  assert.deepEqual(getState().estimated, ['seat'])
})

test('estimated là mảng, serialize được qua JSON', () => {
  resetForTest()
  setState({ estimated: ['hips'] })
  const round = JSON.parse(JSON.stringify(getState()))
  assert.deepEqual(round.estimated, ['hips'])
})
```

- [ ] **Bước 2: Chạy test cho chắc là nó đỏ**

Chạy: `node --test test/store.test.mjs`
Mong đợi: FAIL — `Cannot find module '../src/store.js'`

- [ ] **Bước 3: Viết `src/store.js`**

```js
// Một nguồn sự thật cho toàn app. Form rập và panel 3D cùng đọc-ghi lên đây,
// nên không có bài toán đồng bộ hai chiều — chỉ có một state, hai giao diện.

const KEY = 'pattern-studio/v2'

const DEFAULT = {
  design: 'bella',
  measurements: {},
  // Tên các số đo do máy suy ra, KHÔNG phải người dùng nhập. Là mảng chứ không
  // phải Set vì phải đi qua JSON.stringify để vào localStorage (Set ra '{}').
  estimated: [],
  easePct: {},
  sa: 10,
}

let state = { ...DEFAULT }
const subs = new Set()

export const getState = () => state

export function setState(patch) {
  state = { ...state, ...patch }
  notify()
}

export function setMeasurement(name, value) {
  state = {
    ...state,
    measurements: { ...state.measurements, [name]: value },
    estimated: state.estimated.filter((n) => n !== name),
  }
  notify()
}

export function subscribe(fn) {
  subs.add(fn)
  return () => subs.delete(fn)
}

function notify() {
  for (const fn of subs) fn(state)
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* localStorage đầy hoặc bị chặn — không chặn việc dùng app */
  }
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) state = { ...DEFAULT, ...JSON.parse(raw) }
  } catch {
    /* dữ liệu hỏng — dùng mặc định */
  }
}

/** Chỉ dùng trong test. */
export function resetForTest() {
  state = { ...DEFAULT }
  subs.clear()
}
```

- [ ] **Bước 4: Chạy test cho chắc là nó xanh**

Chạy: `node --test test/store.test.mjs`
Mong đợi: PASS 4/4

- [ ] **Bước 5: Chuyển `main.js` sang dùng store**

Trong `src/main.js`, thay các hàm đọc/ghi DOM. Cụ thể:

Thêm import ở đầu file:

```js
import { getState, setState, setMeasurement, subscribe, save, load } from './store.js'
```

Thay `loadSaved()` và `persist()` (bỏ hẳn hai hàm này) — mọi chỗ gọi chúng chuyển sang
`getState()` / `save()`.

`readMeasurements()` đổi thành đọc store thay vì DOM:

```js
function readMeasurements() {
  const { measurements } = getState()
  const bad = []
  for (const name of design().patternConfig?.measurements ?? []) {
    const v = measurements[name]
    if (!Number.isFinite(v) || v <= 0) bad.push(MEASUREMENTS[name]?.t ?? name)
  }
  if (bad.length) throw new Error(`Thiếu hoặc sai số đo: ${bad.join(', ')}`)
  return measurements
}
```

Mỗi ô input số đo khi `input` thì gọi `setMeasurement(name, Number(value))` thay vì để giá
trị nằm im trong DOM. Mỗi thanh trượt ease khi `input` thì gọi:

```js
setState({ easePct: { ...getState().easePct, [name]: Number(slider.value) } })
```

Ô `#sa` khi `input` gọi `setState({ sa: Number(input.value) })`.
Ô `#design` khi `change` gọi `setState({ design: select.value })`.

`draft()` lấy `sa`, `easePct`, `design` từ `getState()` thay vì từ DOM.

Cuối file, thay `buildMeasurementForm(); buildEaseForm(); onDraft()` bằng:

```js
load()
if (!Object.keys(getState().measurements).length) {
  setState({ measurements: { ...DESIGNS[getState().design].sample } })
}
buildMeasurementForm()
buildEaseForm()
subscribe(save)
onDraft()
```

- [ ] **Bước 6: Chạy toàn bộ test**

Chạy: `npm test`
Mong đợi: PASS — cả `tile.test.mjs` (5) lẫn `store.test.mjs` (4), tổng 9, fail 0

- [ ] **Bước 7: Kiểm tra trong trình duyệt**

Chạy: `npm run dev`, mở http://localhost:5173

Kiểm bằng mắt, cả bốn điều sau phải đúng:
1. Rập hiện ra khi tải trang.
2. Đổi một số đo → bấm *Vẽ rập* → rập đổi theo.
3. Kéo thanh trượt ease → thả tay → rập đổi theo.
4. Tải lại trang (F5) → số đo và ease vẫn còn (đã lưu localStorage).

- [ ] **Bước 8: Commit**

```bash
git add src/store.js test/store.test.mjs src/main.js
git commit -m "refactor: tách trạng thái ra store thay vì giữ trong DOM

Điều kiện cần của Phase 1: panel 3D và form rập phải cùng đọc-ghi một
nguồn sự thật. Giữ state trong ô input DOM chỉ đúng khi có một giao diện.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 2: Suy số đo thiếu

Thân cần 38 số đo, block chỉ cần 11–16. Không thể bắt người dùng nhập 38 số mới xem được thân.

**Files:**
- Tạo: `src/body/estimate.js`
- Tạo: `test/body.test.mjs`

**Interfaces:**
- Dùng của task trước: không.
- Cung cấp cho task sau:
  - `estimate(measurements: object, sample: object) → { measurements: object, estimated: string[] }`
  - `SAMPLES: { bella: object, brian: object }`

- [ ] **Bước 1: Viết test thất bại**

Tạo `test/body.test.mjs`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { estimate, SAMPLES } from '../src/body/estimate.js'

test('trả về đủ bộ số đo của mẫu', () => {
  const { measurements } = estimate({ chest: 1034 }, SAMPLES.bella)
  for (const name of Object.keys(SAMPLES.bella)) {
    assert.ok(Number.isFinite(measurements[name]), `thiếu ${name}`)
  }
})

test('số người dùng nhập không bị đụng vào', () => {
  const { measurements } = estimate({ chest: 900, waist: 700 }, SAMPLES.bella)
  assert.equal(measurements.chest, 900)
  assert.equal(measurements.waist, 700)
})

test('số đo vòng dùng hệ số chu vi, số đo dài dùng hệ số chiều dài', () => {
  const s = SAMPLES.bella
  // vòng ngực gấp đôi mẫu, chiều dài thân giữ nguyên
  const { measurements } = estimate(
    { chest: s.chest * 2, hpsToWaistBack: s.hpsToWaistBack },
    s
  )
  assert.equal(measurements.hips, Math.round(s.hips * 2), 'vòng mông phải theo hệ số chu vi')
  assert.equal(measurements.waistToFloor, s.waistToFloor, 'chiều dài không được đổi')
})

test('shoulderSlope là ĐỘ nên không được nhân tỉ lệ', () => {
  const s = SAMPLES.bella
  const { measurements } = estimate({ chest: s.chest * 3 }, s)
  assert.equal(measurements.shoulderSlope, s.shoulderSlope)
})

test('estimated liệt kê đúng những tên do máy suy ra', () => {
  const { estimated } = estimate({ chest: 1034, waist: 800 }, SAMPLES.bella)
  assert.ok(!estimated.includes('chest'))
  assert.ok(!estimated.includes('waist'))
  assert.ok(estimated.includes('hips'))
})
```

- [ ] **Bước 2: Chạy test cho chắc là nó đỏ**

Chạy: `node --test test/body.test.mjs`
Mong đợi: FAIL — `Cannot find module '../src/body/estimate.js'`

- [ ] **Bước 3: Viết `src/body/estimate.js`**

```js
import { cisFemaleAdult38, cisMaleAdult38 } from '@freesewing/models'

export const SAMPLES = { bella: cisFemaleAdult38, brian: cisMaleAdult38 }

/** Số đo là chu vi (vòng). Phần còn lại coi là khoảng cách/chiều dài. */
const GIRTH = new Set([
  'ankle', 'biceps', 'chest', 'head', 'heel', 'highBust', 'hips', 'knee',
  'neck', 'seat', 'underbust', 'upperLeg', 'waist', 'wrist',
])

/** Không phải mm — không được nhân tỉ lệ. */
const NO_SCALE = new Set(['shoulderSlope'])

/**
 * Điền các số đo còn thiếu bằng cách suy từ bộ mẫu.
 *
 * Dùng HAI hệ số riêng biệt. Một hệ số duy nhất sẽ sai: người thấp mập và
 * người cao gầy có thể cùng vòng ngực.
 */
export function estimate(measurements, sample) {
  const kGirth = (measurements.chest ?? sample.chest) / sample.chest
  const kLength =
    (measurements.hpsToWaistBack ?? sample.hpsToWaistBack) / sample.hpsToWaistBack

  const out = { ...measurements }
  const estimated = []

  for (const [name, sampleValue] of Object.entries(sample)) {
    if (Number.isFinite(out[name]) && out[name] > 0) continue
    const k = NO_SCALE.has(name) ? 1 : GIRTH.has(name) ? kGirth : kLength
    out[name] = NO_SCALE.has(name) ? sampleValue : Math.round(sampleValue * k)
    estimated.push(name)
  }

  return { measurements: out, estimated }
}
```

- [ ] **Bước 4: Chạy test cho chắc là nó xanh**

Chạy: `node --test test/body.test.mjs`
Mong đợi: PASS 5/5

- [ ] **Bước 5: Commit**

```bash
git add src/body/estimate.js test/body.test.mjs
git commit -m "feat(body): suy số đo thiếu bằng hai hệ số tỉ lệ

Hệ số chu vi cho số đo vòng, hệ số chiều dài cho khoảng cách. Một hệ số
duy nhất sẽ sai vì người thấp mập và cao gầy có thể cùng vòng ngực.
shoulderSlope là độ nên không nhân tỉ lệ.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 3: Tiết diện — siêu ê-líp và chuẩn hoá chu vi

Đây là hạt nhân làm cho "hai chiều chính xác" thành hiện thực.

**Files:**
- Tạo: `src/body/section.js`
- Sửa: `test/body.test.mjs`

**Interfaces:**
- Cung cấp cho task sau:
  - `SEGMENTS: 64` (hằng số, số điểm mỗi tầng)
  - `superellipse(a: number, b: number, n: number) → Array<[x, z]>` (64 điểm)
  - `perimeter(pts: Array<[x, z]>) → number`
  - `scaleToGirth(pts: Array<[x, z]>, target: number) → Array<[x, z]>`

- [ ] **Bước 1: Viết test thất bại**

Thêm vào cuối `test/body.test.mjs`:

```js
import { superellipse, perimeter, scaleToGirth, SEGMENTS } from '../src/body/section.js'

test('siêu ê-líp trả về đúng số điểm cố định', () => {
  assert.equal(superellipse(100, 80, 2).length, SEGMENTS)
  assert.equal(superellipse(300, 50, 4).length, SEGMENTS)
})

test('n=2 cho ê-líp thường, chu vi khớp công thức Ramanujan', () => {
  const a = 100, b = 60
  const p = perimeter(superellipse(a, b, 2))
  const h = ((a - b) ** 2) / ((a + b) ** 2)
  const ramanujan = Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)))
  // đa giác 64 cạnh nội tiếp nên ngắn hơn đường cong thật một chút
  assert.ok(Math.abs(p - ramanujan) / ramanujan < 0.001, `lệch ${p} vs ${ramanujan}`)
})

test('scaleToGirth cho chu vi ĐÚNG BẰNG mục tiêu', () => {
  for (const [a, b, n, target] of [
    [100, 80, 2, 900],
    [300, 50, 4, 1034],
    [50, 50, 2, 380],
    [200, 90, 3, 1200],
  ]) {
    const pts = scaleToGirth(superellipse(a, b, n), target)
    assert.ok(
      Math.abs(perimeter(pts) - target) < 0.5,
      `a=${a} b=${b} n=${n}: được ${perimeter(pts)}, cần ${target}`
    )
  }
})

test('scaleToGirth giữ nguyên tỉ lệ dáng', () => {
  const raw = superellipse(200, 100, 2)
  const scaled = scaleToGirth(raw, 1000)
  const ratioRaw = Math.max(...raw.map((p) => p[0])) / Math.max(...raw.map((p) => p[1]))
  const ratioScaled =
    Math.max(...scaled.map((p) => p[0])) / Math.max(...scaled.map((p) => p[1]))
  assert.ok(Math.abs(ratioRaw - ratioScaled) < 1e-9)
})

test('không sinh NaN với tham số biên', () => {
  for (const pts of [superellipse(1, 1, 2), superellipse(500, 1, 8)]) {
    assert.ok(pts.every(([x, z]) => Number.isFinite(x) && Number.isFinite(z)))
  }
})
```

- [ ] **Bước 2: Chạy test cho chắc là nó đỏ**

Chạy: `node --test test/body.test.mjs`
Mong đợi: FAIL — `Cannot find module '../src/body/section.js'`

- [ ] **Bước 3: Viết `src/body/section.js`**

```js
// Một tiết diện ngang của thân.
//
// Toán thuần, không đụng DOM và không đụng three.js — nhờ vậy test chạy được
// bằng `node --test`, và sai 2mm bị bắt ở đây chứ không phải sau khi cắt vải.
//
// Toạ độ: x = ngang (dương là bên trái người xem), z = trước-sau (dương là phía trước).
// Chiều cao y do levels.js quyết định, không thuộc về file này.

/** Số điểm mỗi tầng. HẰNG SỐ — số đỉnh không được phụ thuộc số đo. */
export const SEGMENTS = 64

/**
 * Siêu ê-líp |x/a|^n + |z/b|^n = 1, lấy mẫu đều theo góc tham số.
 *
 * n = 2 cho ê-líp thường. n lớn hơn cho tiết diện "vuông" hơn (lồng ngực).
 * n nhỏ hơn 2 cho hình thoi hơn.
 */
export function superellipse(a, b, n) {
  const pts = []
  const e = 2 / n
  for (let i = 0; i < SEGMENTS; i++) {
    const t = (i / SEGMENTS) * Math.PI * 2
    const c = Math.cos(t)
    const s = Math.sin(t)
    pts.push([
      a * Math.sign(c) * Math.abs(c) ** e,
      b * Math.sign(s) * Math.abs(s) ** e,
    ])
  }
  return pts
}

/** Chu vi đa giác khép kín — đo đúng thứ lưới sẽ có, không phải đường cong lý tưởng. */
export function perimeter(pts) {
  let sum = 0
  for (let i = 0; i < pts.length; i++) {
    const [x1, z1] = pts[i]
    const [x2, z2] = pts[(i + 1) % pts.length]
    sum += Math.hypot(x2 - x1, z2 - z1)
  }
  return sum
}

/**
 * Nhân toàn bộ tiết diện với một hệ số duy nhất cho chu vi bằng đúng số đo.
 *
 * Đây là mấu chốt của cả kiến trúc: dáng do (a/b, n) quyết định, kích thước do
 * hệ số này quyết định. Nhờ tách bạch vậy mà chu vi luôn khớp số đo bất kể dáng
 * thế nào, và không cần giải bài toán ngược.
 *
 * PHẢI là bước cuối cùng khi dựng một tiết diện. Đắp bầu ngực trước, chuẩn hoá sau.
 */
export function scaleToGirth(pts, target) {
  const k = target / perimeter(pts)
  return pts.map(([x, z]) => [x * k, z * k])
}
```

- [ ] **Bước 4: Chạy test cho chắc là nó xanh**

Chạy: `node --test test/body.test.mjs`
Mong đợi: PASS 10/10

- [ ] **Bước 5: Commit**

```bash
git add src/body/section.js test/body.test.mjs
git commit -m "feat(body): tiết diện siêu ê-líp + chuẩn hoá chu vi

Dáng do (a/b, n) quyết định, kích thước do hệ số chuẩn hoá quyết định.
Nhờ tách bạch vậy mà chu vi tầng luôn đúng bằng số đo, không cần giải
bài toán ngược.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 4: Bầu ngực

Hai đỉnh ngực, và bất biến chu vi phải sống sót.

**Files:**
- Sửa: `src/body/section.js`
- Sửa: `test/body.test.mjs`

**Interfaces:**
- Dùng của Task 3: `superellipse`, `perimeter`, `scaleToGirth`, `SEGMENTS`.
- Cung cấp cho task sau:
  - `addBust(pts: Array<[x, z]>, opts: { bustSpan: number, projection: number, sigma: number }) → Array<[x, z]>`
  - `bustProjection(chest: number, underbust: number) → number`

- [ ] **Bước 1: Viết test thất bại**

Thêm vào cuối `test/body.test.mjs`:

```js
import { addBust, bustProjection } from '../src/body/section.js'

test('bầu ngực đẩy mặt trước ra tại vị trí hai đỉnh ngực', () => {
  const raw = superellipse(180, 100, 2.5)
  const bust = addBust(raw, { bustSpan: 200, projection: 40, sigma: 70 })
  const frontZ = (pts) => Math.max(...pts.map(([, z]) => z))
  assert.ok(frontZ(bust) > frontZ(raw), 'mặt trước phải nhô ra')
})

test('bầu ngực không đụng vào mặt sau', () => {
  const raw = superellipse(180, 100, 2.5)
  const bust = addBust(raw, { bustSpan: 200, projection: 40, sigma: 70 })
  for (let i = 0; i < raw.length; i++) {
    if (raw[i][1] <= 0) assert.deepEqual(bust[i], raw[i], `điểm ${i} ở mặt sau bị đổi`)
  }
})

test('BẤT BIẾN: đắp bầu ngực TRƯỚC rồi chuẩn hoá SAU thì chu vi vẫn đúng', () => {
  const target = 1034
  const withBust = scaleToGirth(
    addBust(superellipse(180, 100, 2.5), { bustSpan: 200, projection: 40, sigma: 70 }),
    target
  )
  assert.ok(Math.abs(perimeter(withBust) - target) < 0.5)
})

test('đảo thứ tự thì chu vi SAI — đây là lỗi mà test trên tồn tại để bắt', () => {
  const target = 1034
  const wrong = addBust(scaleToGirth(superellipse(180, 100, 2.5), target), {
    bustSpan: 200,
    projection: 40,
    sigma: 70,
  })
  assert.ok(
    Math.abs(perimeter(wrong) - target) > 1,
    'nếu test này đỏ thì bầu ngực quá nhỏ để chứng minh được gì'
  )
})

test('độ nhô suy từ hiệu vòng ngực và vòng chân ngực', () => {
  assert.ok(bustProjection(1034, 900) > bustProjection(1034, 1000))
  assert.equal(bustProjection(900, 900), 0)
  assert.equal(bustProjection(880, 900), 0, 'hiệu âm thì coi như không có bầu')
})
```

- [ ] **Bước 2: Chạy test cho chắc là nó đỏ**

Chạy: `node --test test/body.test.mjs`
Mong đợi: FAIL — `addBust is not a function` / import lỗi

- [ ] **Bước 3: Thêm vào `src/body/section.js`**

```js
/**
 * Độ nhô bầu ngực suy từ hiệu vòng ngực và vòng chân ngực.
 *
 * Đây chính là cách xác định cỡ cúp áo ngực ngoài đời, nên không cần bắt người
 * dùng nhập thêm số đo nào.
 */
export function bustProjection(chest, underbust) {
  const diff = chest - underbust
  if (diff <= 0) return 0
  // ponytail: hệ số 0.30 chọn theo cảm quan, chưa đối chiếu bảng cỡ cúp thật.
  // Chỉnh lại khi có ma-nơ-canh in ra so với người thật.
  return diff * 0.3
}

/**
 * Đắp hai bướu vào nửa TRƯỚC của tiết diện, tại x = ±bustSpan/2.
 *
 * PHẢI gọi TRƯỚC scaleToGirth. Bướu làm tăng chiều dài cung; chuẩn hoá trước
 * rồi mới đắp thì vòng ngực không còn đúng — và sai im lặng.
 */
export function addBust(pts, { bustSpan, projection, sigma }) {
  if (projection <= 0) return pts
  const apex = bustSpan / 2
  const maxZ = Math.max(...pts.map(([, z]) => z)) || 1
  return pts.map(([x, z]) => {
    if (z <= 0) return [x, z] // mặt sau không đụng tới
    const d = Math.min(Math.abs(x - apex), Math.abs(x + apex))
    // Nhân với độ "hướng ra trước" để không có bậc nhảy tại z = 0
    const frontness = z / maxZ
    const bump = projection * Math.exp(-(d * d) / (2 * sigma * sigma)) * frontness
    return [x, z + bump]
  })
}
```

- [ ] **Bước 4: Chạy test cho chắc là nó xanh**

Chạy: `node --test test/body.test.mjs`
Mong đợi: PASS 15/15

- [ ] **Bước 5: Commit**

```bash
git add src/body/section.js test/body.test.mjs
git commit -m "feat(body): hai đỉnh ngực, giữ nguyên bất biến chu vi

Đắp bướu trước, chuẩn hoá chu vi sau. Có test chứng minh đảo thứ tự thì
vòng ngực sai — lỗi này im lặng nên phải có test canh.

Độ nhô suy từ chest - underbust, đúng cách xác định cỡ cúp ngoài đời,
không cần thêm số đo mới.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 5: Bảng tầng

Số đo → danh sách tầng có `y`, chu vi mục tiêu và tỉ lệ dáng.

**Files:**
- Tạo: `src/body/levels.js`
- Sửa: `test/body.test.mjs`

**Interfaces:**
- Dùng của Task 2: `estimate`, `SAMPLES`.
- Cung cấp cho task sau:
  - `buildLevels(m: object, gender: 'female' | 'male') → Level[]`
  - `Level = { name: string, y: number, girth: number | null, width: number | null, measure: string | null, ratio: number, n: number, bust: boolean }`
  - `measure` là **tên số đo nguồn** của chu vi tầng đó, hoặc `null` nếu chu vi là suy ra
    (tầng nội suy, tầng đũng) hoặc tầng không dùng chu vi (tầng vai). Task 10 dùng nó để
    dán nhãn vòng tầng đo — không có nó thì phải đoán tên số đo từ tên tầng, và đoán sai.
  - `LEVEL_COUNT: number` (hằng số — độ dài mảng trả về, không đổi theo số đo)

- [ ] **Bước 1: Viết test thất bại**

Thêm vào cuối `test/body.test.mjs`:

```js
import { buildLevels, LEVEL_COUNT } from '../src/body/levels.js'

const full = (extra = {}, key = 'bella') =>
  estimate(extra, SAMPLES[key]).measurements

test('số tầng là hằng số, không phụ thuộc số đo', () => {
  const a = buildLevels(full(), 'female')
  const b = buildLevels(full({ chest: 700, waist: 600 }), 'female')
  const c = buildLevels(full({ chest: 1600, waist: 1500 }), 'female')
  assert.equal(a.length, LEVEL_COUNT)
  assert.equal(b.length, LEVEL_COUNT)
  assert.equal(c.length, LEVEL_COUNT)
})

test('tầng giảm dần theo y, không tầng nào vượt tầng khác', () => {
  for (const m of [full(), full({ chest: 1600, hpsToWaistBack: 250 }), full({}, 'brian')]) {
    const levels = buildLevels(m, 'female')
    for (let i = 1; i < levels.length; i++) {
      assert.ok(
        levels[i].y < levels[i - 1].y,
        `${levels[i].name} (y=${levels[i].y}) không thấp hơn ${levels[i - 1].name} (y=${levels[i - 1].y})`
      )
    }
  }
})

test('không có NaN trong bảng tầng', () => {
  for (const lv of buildLevels(full(), 'female')) {
    assert.ok(Number.isFinite(lv.y), `${lv.name}.y là NaN`)
    assert.ok(Number.isFinite(lv.ratio) && Number.isFinite(lv.n), `${lv.name} dáng NaN`)
    assert.ok(lv.girth === null || Number.isFinite(lv.girth), `${lv.name}.girth NaN`)
  }
})

test('tầng eo lấy đúng số đo vòng eo và ghi rõ nguồn', () => {
  const m = full({ waist: 825 })
  const levels = buildLevels(m, 'female')
  const waistLevel = levels.find((l) => l.name === 'waist')
  assert.equal(waistLevel.girth, 825)
  assert.equal(waistLevel.measure, 'waist')

  // Tầng nội suy và tầng đũng có chu vi suy ra, không có số đo nguồn
  assert.equal(levels.find((l) => l.name.includes('~')).measure, null)
  assert.equal(levels.find((l) => l.name === 'crotch').measure, null)
  assert.equal(levels.find((l) => l.name === 'shoulder').measure, null)
  // Tầng nách lấy từ highBust, KHÔNG phải từ một số đo tên 'armpit'
  assert.equal(levels.find((l) => l.name === 'armpit').measure, 'highBust')
})

test('chỉ tầng ngực nữ mới bật cờ bust', () => {
  const female = buildLevels(full(), 'female').filter((l) => l.bust)
  const male = buildLevels(full({}, 'brian'), 'male').filter((l) => l.bust)
  assert.equal(female.length, 1)
  assert.equal(female[0].name, 'bust')
  assert.equal(male.length, 0)
})

test('vai dốc xuống theo shoulderSlope, thấp hơn chân cổ', () => {
  const levels = buildLevels(full(), 'female')
  const neck = levels.find((l) => l.name === 'neck')
  const shoulder = levels.find((l) => l.name === 'shoulder')
  assert.ok(shoulder.y < neck.y, 'đầu vai phải thấp hơn chân cổ')
})
```

- [ ] **Bước 2: Chạy test cho chắc là nó đỏ**

Chạy: `node --test test/body.test.mjs`
Mong đợi: FAIL — `Cannot find module '../src/body/levels.js'`

- [ ] **Bước 3: Viết `src/body/levels.js`**

```js
// Số đo -> bảng tầng ngang. Mỗi tầng biết độ cao y, chu vi mục tiêu, và dáng
// tiết diện (tỉ lệ rộng/sâu + độ vuông).
//
// Neo mọi thứ vào EO, vì mọi khoảng cách dọc của freesewing đều đo từ eo hoặc từ HPS.

/** Khoảng hở tối thiểu giữa hai tầng (mm), để số đo cực đoan không làm tầng vượt nhau. */
const MIN_GAP = 5

/**
 * Dáng tiết diện: [tỉ lệ rộng/sâu, độ vuông n].
 * Eo tròn hơn, lồng ngực dẹt và vuông hơn, mông rộng hơn ở nữ.
 */
const SHAPE = {
  female: {
    neck: [1.0, 2.0], shoulder: [1.0, 2.0], armpit: [1.35, 2.6], bust: [1.25, 2.4],
    underbust: [1.3, 2.4], waist: [1.25, 2.2], hips: [1.35, 2.3], seat: [1.4, 2.4],
    crotch: [1.3, 2.2],
  },
  male: {
    neck: [1.0, 2.0], shoulder: [1.0, 2.0], armpit: [1.4, 2.8], bust: [1.35, 2.7],
    underbust: [1.3, 2.6], waist: [1.2, 2.4], hips: [1.25, 2.4], seat: [1.25, 2.4],
    crotch: [1.2, 2.2],
  },
}

/** Tầng có số đo, từ trên xuống. Tầng nội suy chèn vào sau. */
const NAMED = [
  'neck', 'shoulder', 'armpit', 'bust', 'underbust', 'waist', 'hips', 'seat', 'crotch',
]

/** Số tầng nội suy chèn giữa mỗi cặp tầng có số đo. */
const SUBDIV = 2

export const LEVEL_COUNT = NAMED.length + (NAMED.length - 1) * SUBDIV

const deg2rad = (d) => (d * Math.PI) / 180

export function buildLevels(m, gender) {
  const shape = SHAPE[gender] ?? SHAPE.female

  const yWaist = m.waistToFloor
  const yHps = yWaist + m.hpsToWaistBack

  const raw = [
    { name: 'neck', y: yHps, girth: m.neck, measure: 'neck' },
    {
      name: 'shoulder',
      // shoulderSlope là ĐỘ. Đây là chỗ duy nhất nó được dùng; bỏ qua thì vai
      // phẳng như mắc áo.
      y: yHps - (m.shoulderToShoulder / 2) * Math.tan(deg2rad(m.shoulderSlope)),
      girth: null,
      width: m.shoulderToShoulder,
      measure: null,
    },
    { name: 'armpit', y: yWaist + m.waistToArmpit, girth: m.highBust, measure: 'highBust' },
    { name: 'bust', y: yHps - m.hpsToBust, girth: m.chest, measure: 'chest' },
    { name: 'underbust', y: yWaist + m.waistToUnderbust, girth: m.underbust, measure: 'underbust' },
    { name: 'waist', y: yWaist, girth: m.waist, measure: 'waist' },
    { name: 'hips', y: yWaist - m.waistToHips, girth: m.hips, measure: 'hips' },
    { name: 'seat', y: yWaist - m.waistToSeat, girth: m.seat, measure: 'seat' },
    // Chu vi đũng suy ra, không có số đo nguồn -> measure null, không vẽ vòng đo
    { name: 'crotch', y: yWaist - m.crotchDepth, girth: m.seat * 0.95, measure: null },
  ]

  // Thứ tự y trên dữ liệu thật của cả hai giới đã đúng sẵn (kiểm bằng bộ mẫu
  // size 38); vòng kẹp dưới đây chỉ kích hoạt với số đo cực đoan.

  // Ép thứ tự giảm dần. Với số đo cực đoan (rất thấp, rất mập) các tầng có thể
  // vượt nhau; kẹp lại thay vì để lưới tự xoắn.
  for (let i = 1; i < raw.length; i++) {
    if (raw[i].y >= raw[i - 1].y - MIN_GAP) raw[i].y = raw[i - 1].y - MIN_GAP
  }

  const levels = []
  for (let i = 0; i < raw.length; i++) {
    levels.push(decorate(raw[i], shape, gender))
    if (i === raw.length - 1) break
    for (let s = 1; s <= SUBDIV; s++) {
      levels.push(interpolate(raw[i], raw[i + 1], s / (SUBDIV + 1), shape, gender))
    }
  }
  return levels
}

function decorate(lv, shape, gender) {
  const [ratio, n] = shape[lv.name] ?? [1.2, 2.2]
  return {
    name: lv.name,
    y: lv.y,
    girth: lv.girth ?? null,
    width: lv.width ?? null,
    measure: lv.measure ?? null,
    ratio,
    n,
    bust: gender === 'female' && lv.name === 'bust',
  }
}

function interpolate(a, b, t, shape, gender) {
  const A = decorate(a, shape, gender)
  const B = decorate(b, shape, gender)
  const mix = (p, q) => p + (q - p) * t
  return {
    name: `${a.name}~${b.name}@${t.toFixed(2)}`,
    y: mix(A.y, B.y),
    // Tầng vai chỉ có width; lấy chu vi của tầng lân cận để nội suy không bị null.
    girth: mix(A.girth ?? B.girth ?? 0, B.girth ?? A.girth ?? 0),
    width: null,
    measure: null, // chu vi nội suy, không phải số đo của ai
    ratio: mix(A.ratio, B.ratio),
    n: mix(A.n, B.n),
    bust: false,
  }
}
```

- [ ] **Bước 4: Chạy test cho chắc là nó xanh**

Chạy: `node --test test/body.test.mjs`
Mong đợi: PASS 21/21

- [ ] **Bước 5: Commit**

```bash
git add src/body/levels.js test/body.test.mjs
git commit -m "feat(body): bảng tầng neo tại eo, kẹp thứ tự y

Số tầng là hằng số (27) nên số đỉnh không phụ thuộc số đo — điều kiện của
yêu cầu không giật lag. Kẹp khoảng hở tối thiểu để số đo cực đoan không
làm tầng vượt nhau.

Vai dốc theo shoulderSlope; đây là chỗ duy nhất số đo đó được dùng.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 6: Lưới thân

Bảng tầng → mảng đỉnh và chỉ số tam giác.

**Files:**
- Tạo: `src/body/mesh.js`
- Sửa: `test/body.test.mjs`

**Interfaces:**
- Dùng của task trước: `SEGMENTS`, `superellipse`, `addBust`, `bustProjection`,
  `scaleToGirth`, `perimeter`, `buildLevels`, `LEVEL_COUNT`.
- Cung cấp cho task sau:
  - `createBody() → { positions: Float32Array, indices: Uint16Array, vertexCount: number, update(m: object, gender: string) → Level[] }`
  - `readGirth(positions: Float32Array, levelIndex: number) → number` (đo lại chu vi từ chính mảng đỉnh)

- [ ] **Bước 1: Viết test thất bại**

Thêm vào cuối `test/body.test.mjs`:

```js
import { createBody, readGirth } from '../src/body/mesh.js'

test('BẤT BIẾN CHÍNH: chu vi đo lại trên mảng đỉnh khớp số đo đầu vào', () => {
  const m = full({ chest: 1034, waist: 825, underbust: 872, neck: 380, hips: 1006 })
  const body = createBody()
  const levels = body.update(m, 'female')

  for (let i = 0; i < levels.length; i++) {
    if (levels[i].girth === null) continue
    const measured = readGirth(body.positions, i)
    assert.ok(
      Math.abs(measured - levels[i].girth) < 0.5,
      `tầng ${levels[i].name}: đo được ${measured.toFixed(2)}mm, cần ${levels[i].girth}mm`
    )
  }
})

test('bầu ngực KHÔNG phá vỡ bất biến chu vi', () => {
  const m = full({ chest: 1034, underbust: 800 }) // hiệu lớn -> bầu ngực rõ
  const body = createBody()
  const levels = body.update(m, 'female')
  const i = levels.findIndex((l) => l.name === 'bust')
  assert.ok(Math.abs(readGirth(body.positions, i) - levels[i].girth) < 0.5)
})

test('số đỉnh không đổi giữa hai lần dựng với số đo khác nhau', () => {
  const body = createBody()
  body.update(full({ chest: 800 }), 'female')
  const n1 = body.positions.length
  body.update(full({ chest: 1500 }), 'female')
  assert.equal(body.positions.length, n1)
})

test('cập nhật ghi đè TẠI CHỖ, không cấp phát mảng mới', () => {
  const body = createBody()
  body.update(full(), 'female')
  const ref = body.positions
  body.update(full({ chest: 1200 }), 'female')
  assert.equal(body.positions, ref, 'phải là cùng một Float32Array')
})

test('không có NaN trong mảng đỉnh với số đo cực đoan', () => {
  const body = createBody()
  for (const m of [full({ chest: 600, waist: 500 }), full({ chest: 1800, waist: 1700 })]) {
    body.update(m, 'female')
    assert.ok(body.positions.every(Number.isFinite))
  }
})

test('chỉ số tam giác nằm trong phạm vi mảng đỉnh', () => {
  const body = createBody()
  body.update(full(), 'female')
  assert.ok(body.indices.every((i) => i >= 0 && i < body.vertexCount))
})
```

- [ ] **Bước 2: Chạy test cho chắc là nó đỏ**

Chạy: `node --test test/body.test.mjs`
Mong đợi: FAIL — `Cannot find module '../src/body/mesh.js'`

- [ ] **Bước 3: Viết `src/body/mesh.js`**

```js
// Bảng tầng -> lưới tam giác.
//
// Số đỉnh CỐ ĐỊNH (LEVEL_COUNT x SEGMENTS), nên buffer cấp phát một lần và mỗi
// lần cập nhật chỉ ghi đè tại chỗ. Đây là toàn bộ cơ chế "không giật lag" —
// không phải tối ưu về sau, mà là ràng buộc kiến trúc.

import { SEGMENTS, superellipse, addBust, bustProjection, scaleToGirth } from './section.js'
import { buildLevels, LEVEL_COUNT } from './levels.js'

const VERTEX_COUNT = LEVEL_COUNT * SEGMENTS

/** Lấy chu vi tầng thứ `levelIndex` bằng cách đo lại chính mảng đỉnh đã sinh. */
export function readGirth(positions, levelIndex) {
  const base = levelIndex * SEGMENTS * 3
  let sum = 0
  for (let i = 0; i < SEGMENTS; i++) {
    const a = base + i * 3
    const b = base + ((i + 1) % SEGMENTS) * 3
    sum += Math.hypot(positions[b] - positions[a], positions[b + 2] - positions[a + 2])
  }
  return sum
}

function buildIndices() {
  const idx = []
  for (let l = 0; l < LEVEL_COUNT - 1; l++) {
    for (let s = 0; s < SEGMENTS; s++) {
      const s2 = (s + 1) % SEGMENTS
      const a = l * SEGMENTS + s
      const b = l * SEGMENTS + s2
      const c = (l + 1) * SEGMENTS + s
      const d = (l + 1) * SEGMENTS + s2
      idx.push(a, c, b, b, c, d)
    }
  }
  return new Uint16Array(idx)
}

export function createBody() {
  const positions = new Float32Array(VERTEX_COUNT * 3)
  const indices = buildIndices()

  function update(m, gender) {
    const levels = buildLevels(m, gender)
    const projection = gender === 'female' ? bustProjection(m.chest, m.underbust) : 0

    for (let l = 0; l < levels.length; l++) {
      const lv = levels[l]
      // Bán trục ban đầu tuỳ ý — scaleToGirth sẽ chuẩn hoá lại. Chỉ tỉ lệ ratio
      // là có ý nghĩa ở bước này.
      const b0 = 100
      const a0 = b0 * lv.ratio
      let pts = superellipse(a0, b0, lv.n)

      if (lv.bust && projection > 0) {
        pts = addBust(pts, { bustSpan: m.bustSpan, projection, sigma: m.bustSpan * 0.35 })
      }

      if (lv.girth !== null && lv.girth > 0) {
        pts = scaleToGirth(pts, lv.girth) // PHẢI là bước cuối
      } else if (lv.width !== null) {
        // Tầng vai: shoulderToShoulder là BỀ RỘNG, không phải chu vi.
        const k = lv.width / 2 / a0
        pts = pts.map(([x, z]) => [x * k, z * k])
      }

      const base = l * SEGMENTS * 3
      for (let s = 0; s < SEGMENTS; s++) {
        positions[base + s * 3] = pts[s][0]
        positions[base + s * 3 + 1] = lv.y
        positions[base + s * 3 + 2] = pts[s][1]
      }
    }
    return levels
  }

  return { positions, indices, vertexCount: VERTEX_COUNT, update }
}
```

- [ ] **Bước 4: Chạy test cho chắc là nó xanh**

Chạy: `node --test test/body.test.mjs`
Mong đợi: PASS 27/27

- [ ] **Bước 5: Commit**

```bash
git add src/body/mesh.js test/body.test.mjs
git commit -m "feat(body): loft thân, buffer cấp phát một lần

Bất biến chính có test canh: chu vi đo lại TRÊN MẢNG ĐỈNH đã sinh khớp số
đo đầu vào trong 0.5mm. Đo trên dữ liệu xuất ra, không đo trên công thức.

Cập nhật ghi đè tại chỗ vào cùng một Float32Array — có test kiểm tra danh
tính mảng, vì đây là cơ chế không giật lag chứ không phải chi tiết nội bộ.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 7: Tay và chân

**Files:**
- Sửa: `src/body/mesh.js`
- Sửa: `test/body.test.mjs`

**Interfaces:**
- Cung cấp cho task sau:
  - `createLimbs() → { positions: Float32Array, indices: Uint16Array, vertexCount: number, update(m, gender) → LimbRing[] }`
  - `LimbRing = { name: string, girth: number }` — thứ tự trùng thứ tự vòng trong `positions`
  - `readLimbGirth(positions: Float32Array, ringIndex: number) → number`

- [ ] **Bước 1: Viết test thất bại**

Thêm vào cuối `test/body.test.mjs`:

```js
import { createLimbs, readLimbGirth } from '../src/body/mesh.js'

test('chu vi mỗi vòng tay/chân khớp số đo', () => {
  const m = full({ biceps: 313, wrist: 166, upperLeg: 620, knee: 380, ankle: 245 })
  const limbs = createLimbs()
  const rings = limbs.update(m, 'female')
  for (let i = 0; i < rings.length; i++) {
    assert.ok(
      Math.abs(readLimbGirth(limbs.positions, i) - rings[i].girth) < 0.5,
      `vòng ${rings[i].name}: đo ${readLimbGirth(limbs.positions, i).toFixed(2)}, cần ${rings[i].girth}`
    )
  }
})

test('tay và chân có đủ bốn chi', () => {
  const limbs = createLimbs()
  const rings = limbs.update(full(), 'female')
  const names = rings.map((r) => r.name)
  assert.ok(names.some((n) => n.startsWith('armL')))
  assert.ok(names.some((n) => n.startsWith('armR')))
  assert.ok(names.some((n) => n.startsWith('legL')))
  assert.ok(names.some((n) => n.startsWith('legR')))
})

test('chi không sinh NaN và số đỉnh cố định', () => {
  const limbs = createLimbs()
  limbs.update(full({ biceps: 200 }), 'female')
  const n = limbs.positions.length
  limbs.update(full({ biceps: 500 }), 'female')
  assert.equal(limbs.positions.length, n)
  assert.ok(limbs.positions.every(Number.isFinite))
})
```

- [ ] **Bước 2: Chạy test cho chắc là nó đỏ**

Chạy: `node --test test/body.test.mjs`
Mong đợi: FAIL — `createLimbs is not a function`

- [ ] **Bước 3: Thêm vào `src/body/mesh.js`**

```js
/** Số vòng mỗi chi. Hằng số. */
const LIMB_RINGS = 4
/** 2 tay + 2 chân. */
const LIMB_COUNT = 4
const LIMB_VERTEX_COUNT = LIMB_COUNT * LIMB_RINGS * SEGMENTS

export function readLimbGirth(positions, ringIndex) {
  const base = ringIndex * SEGMENTS * 3
  let sum = 0
  for (let i = 0; i < SEGMENTS; i++) {
    const a = base + i * 3
    const b = base + ((i + 1) % SEGMENTS) * 3
    sum += Math.hypot(
      positions[b] - positions[a],
      positions[b + 1] - positions[a + 1],
      positions[b + 2] - positions[a + 2]
    )
  }
  return sum
}

function limbIndices() {
  const idx = []
  for (let limb = 0; limb < LIMB_COUNT; limb++) {
    const off = limb * LIMB_RINGS * SEGMENTS
    for (let r = 0; r < LIMB_RINGS - 1; r++) {
      for (let s = 0; s < SEGMENTS; s++) {
        const s2 = (s + 1) % SEGMENTS
        const a = off + r * SEGMENTS + s
        const b = off + r * SEGMENTS + s2
        const c = off + (r + 1) * SEGMENTS + s
        const d = off + (r + 1) * SEGMENTS + s2
        idx.push(a, c, b, b, c, d)
      }
    }
  }
  return new Uint16Array(idx)
}

/**
 * Tay và chân là ống thuôn, dựng bằng chính cơ chế tiết diện của thân.
 *
 * ponytail: thân và chi là hai lưới RỜI, lồng vào nhau ở vai và ở đũng. Không
 * liền mạch. Khâu lưới (mesh stitching) tốn nhiều công và không phục vụ mục
 * tiêu nào của Phase 1; ma-nơ-canh thật cũng có đường nối ở đó.
 */
export function createLimbs() {
  const positions = new Float32Array(LIMB_VERTEX_COUNT * 3)
  const indices = limbIndices()

  function update(m, gender) {
    const yWaist = m.waistToFloor
    const yHps = yWaist + m.hpsToWaistBack
    const yCrotch = yWaist - m.crotchDepth
    const shoulderX = m.shoulderToShoulder / 2
    const legX = m.hips / 8 // xấp xỉ nửa khoảng cách hai tâm chân

    // Mỗi chi: [x tâm, y đầu, x cuối, y cuối, các vòng chu vi]
    const chains = [
      { p: 'armL', x0: shoulderX, y0: yHps, x1: shoulderX + 60, y1: yHps - m.shoulderToWrist,
        girths: [m.biceps, m.biceps * 0.85, m.wrist * 1.35, m.wrist] },
      { p: 'armR', x0: -shoulderX, y0: yHps, x1: -shoulderX - 60, y1: yHps - m.shoulderToWrist,
        girths: [m.biceps, m.biceps * 0.85, m.wrist * 1.35, m.wrist] },
      { p: 'legL', x0: legX, y0: yCrotch, x1: legX, y1: 0,
        girths: [m.upperLeg, (m.upperLeg + m.knee) / 2, m.knee, m.ankle] },
      { p: 'legR', x0: -legX, y0: yCrotch, x1: -legX, y1: 0,
        girths: [m.upperLeg, (m.upperLeg + m.knee) / 2, m.knee, m.ankle] },
    ]

    const rings = []
    let ring = 0
    for (const chain of chains) {
      for (let r = 0; r < LIMB_RINGS; r++) {
        const t = r / (LIMB_RINGS - 1)
        const cx = chain.x0 + (chain.x1 - chain.x0) * t
        const cy = chain.y0 + (chain.y1 - chain.y0) * t
        const girth = chain.girths[r]
        const pts = scaleToGirth(superellipse(105, 100, 2.2), girth)

        const base = ring * SEGMENTS * 3
        for (let s = 0; s < SEGMENTS; s++) {
          positions[base + s * 3] = cx + pts[s][0]
          positions[base + s * 3 + 1] = cy
          positions[base + s * 3 + 2] = pts[s][1]
        }
        rings.push({ name: `${chain.p}.${r}`, girth })
        ring++
      }
    }
    return rings
  }

  return { positions, indices, vertexCount: LIMB_VERTEX_COUNT, update }
}
```

- [ ] **Bước 4: Chạy test cho chắc là nó xanh**

Chạy: `node --test test/body.test.mjs`
Mong đợi: PASS 30/30

- [ ] **Bước 5: Commit**

```bash
git add src/body/mesh.js test/body.test.mjs
git commit -m "feat(body): ống tay và chân dựng bằng cùng cơ chế tiết diện

Thân và chi là hai lưới rời, lồng vào nhau ở vai và đũng — đánh dấu
ponytail kèm đường nâng cấp (khâu lưới) nếu sau này cần liền mạch.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 8: Cảnh three.js

Từ đây là code chạm DOM, không test được bằng `node --test` → kiểm bằng trình duyệt.

**Files:**
- Sửa: `package.json` (thêm `three`)
- Tạo: `src/view3d.js`
- Sửa: `index.html`, `src/app.css`

**Interfaces:**
- Dùng của task trước: `createBody`, `createLimbs`, `estimate`, `SAMPLES`.
- Cung cấp cho task sau:
  - `initView3d(container: HTMLElement) → { update(measurements: object, gender: string) → void, resize() → void }`

- [ ] **Bước 1: Cài three.js**

```bash
npm i three@0.185
```

- [ ] **Bước 2: Thêm khung tab vào `index.html`**

Thay thẻ `<main id="preview"></main>` bằng:

```html
<main id="stage">
  <nav id="tabs">
    <button type="button" data-tab="pattern" class="active">Rập</button>
    <button type="button" data-tab="body">Thân 3D</button>
  </nav>
  <section id="preview" class="tab-panel"></section>
  <section id="body3d" class="tab-panel" hidden></section>
</main>
```

- [ ] **Bước 3: Thêm style vào `src/app.css`**

```css
#stage { display: flex; flex-direction: column; overflow: hidden }
#tabs { display: flex; gap: 4px; padding: 8px 16px 0; border-bottom: 1px solid #ddd }
#tabs button {
  background: none;
  border: 1px solid transparent;
  border-bottom: none;
  border-radius: 4px 4px 0 0;
  color: #666;
  padding: 6px 14px;
}
#tabs button.active { background: #fff; border-color: #ddd; color: #111; font-weight: 600 }
.tab-panel { flex: 1; overflow: auto; padding: 16px }
#body3d { padding: 0; position: relative }
#body3d canvas { display: block; width: 100%; height: 100% }
```

- [ ] **Bước 4: Viết `src/view3d.js`**

```js
// Cảnh three.js cho ma-nơ-canh.
//
// Render THEO YÊU CẦU, không có vòng lặp requestAnimationFrame chạy vô hạn:
// máy đứng yên thì CPU/GPU về 0. Vẽ lại khi số đo đổi hoặc camera động.

import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { createBody, createLimbs } from './body/mesh.js'

export function initView3d(container) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf2f2f2)

  const camera = new THREE.PerspectiveCamera(35, 1, 10, 10000)
  camera.position.set(900, 1100, 2200)

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  container.appendChild(renderer.domElement)

  scene.add(new THREE.HemisphereLight(0xffffff, 0x666666, 2.2))
  const key = new THREE.DirectionalLight(0xffffff, 1.2)
  key.position.set(600, 1600, 1200)
  scene.add(key)

  const material = new THREE.MeshStandardMaterial({
    color: 0xd8d2cc,
    roughness: 0.85,
    metalness: 0,
    side: THREE.DoubleSide,
  })

  const body = createBody()
  const limbs = createLimbs()

  const meshes = [body, limbs].map((part) => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(part.positions, 3))
    g.setIndex(new THREE.BufferAttribute(part.indices, 1))
    const mesh = new THREE.Mesh(g, material)
    scene.add(mesh)
    return { part, geometry: g }
  })

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 900, 0)
  controls.addEventListener('change', render)
  controls.update()

  function render() {
    renderer.render(scene, camera)
  }

  function update(measurements, gender) {
    for (const { part, geometry } of meshes) {
      part.update(measurements, gender)
      geometry.attributes.position.needsUpdate = true
      geometry.computeVertexNormals()
      geometry.computeBoundingSphere()
    }
    render()
  }

  function resize() {
    const w = container.clientWidth
    const h = container.clientHeight
    if (!w || !h) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    render()
  }

  new ResizeObserver(resize).observe(container)
  resize()

  return { update, resize }
}
```

- [ ] **Bước 5: Nối tab và cảnh vào `src/main.js`**

Thêm import:

```js
import { initView3d } from './view3d.js'
import { estimate, SAMPLES } from './body/estimate.js'
```

Thêm vào cuối file, trước `onDraft()`:

```js
let view3d = null

function genderOfDesign(key) {
  return key === 'brian' ? 'male' : 'female'
}

function refreshBody() {
  if (!view3d) return
  const { design: key, measurements } = getState()
  const { measurements: full } = estimate(measurements, SAMPLES[key])
  view3d.update(full, genderOfDesign(key))
}

for (const btn of document.querySelectorAll('#tabs button')) {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab
    for (const b of document.querySelectorAll('#tabs button')) {
      b.classList.toggle('active', b === btn)
    }
    $('preview').hidden = tab !== 'pattern'
    $('body3d').hidden = tab !== 'body'
    if (tab === 'body') {
      if (!view3d) view3d = initView3d($('body3d'))
      view3d.resize()
      refreshBody()
    }
  })
}

subscribe(refreshBody)
```

- [ ] **Bước 6: Kiểm tra trong trình duyệt**

Chạy: `npm run dev`, mở http://localhost:5173

Cả năm điều sau phải đúng:
1. Bấm tab **Thân 3D** → thấy thân người xám trên nền sáng.
2. Kéo chuột xoay được, lăn chuột thu phóng được.
3. Về tab **Rập** → rập vẫn hiện bình thường.
4. Đổi block sang **Brian** → thân đổi dáng (không có bầu ngực).
5. Console không có lỗi.

- [ ] **Bước 7: Commit**

```bash
git add package.json package-lock.json src/view3d.js src/main.js index.html src/app.css
git commit -m "feat(3d): cảnh three.js, render theo yêu cầu

Không có vòng lặp rAF chạy vô hạn — chỉ vẽ khi số đo đổi hoặc camera động,
máy đứng yên thì CPU về 0.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 9: Panel số đo thân và nhãn ước lượng

Người dùng phải chỉnh được số đo mà block không dùng tới, và phải phân biệt được số nào do
máy đoán.

**Files:**
- Sửa: `src/vi.js`, `src/main.js`, `index.html`, `src/app.css`

**Interfaces:**
- Dùng của task trước: `estimate`, `SAMPLES`, `setMeasurement`, `getState`.
- Cung cấp cho task sau: không.

- [ ] **Bước 1: Thêm số đo thân vào `src/vi.js`**

Thêm vào object `MEASUREMENTS` (giữ nguyên các mục đã có):

```js
  ankle: { t: 'Vòng cổ chân', d: 'Chu vi cổ chân' },
  bustPointToUnderbust: { t: 'Đỉnh ngực xuống chân ngực', d: 'Từ đỉnh ngực xuống ngang chân ngực' },
  bustFront: { t: 'Nửa vòng ngực trước', d: 'Phần vòng ngực thuộc mặt trước' },
  crossSeam: { t: 'Vòng đáy', d: 'Từ eo trước, qua đũng, lên eo sau' },
  crossSeamFront: { t: 'Vòng đáy trước', d: 'Phần vòng đáy thuộc mặt trước' },
  crotchDepth: { t: 'Hạ đũng', d: 'Từ ngang eo xuống đũng, đo khi ngồi' },
  head: { t: 'Vòng đầu', d: 'Chu vi đầu chỗ lớn nhất' },
  heel: { t: 'Vòng gót', d: 'Chu vi vòng qua gót và mu bàn chân' },
  highBustFront: { t: 'Nửa vòng ngực trên trước', d: 'Phần vòng ngực trên thuộc mặt trước' },
  hips: { t: 'Vòng hông', d: 'Chu vi ngang xương hông' },
  inseam: { t: 'Dài giàng quần', d: 'Từ đũng xuống sàn, đo mặt trong chân' },
  knee: { t: 'Vòng gối', d: 'Chu vi đầu gối' },
  seat: { t: 'Vòng mông', d: 'Chu vi chỗ nở nhất của mông' },
  seatBack: { t: 'Nửa vòng mông sau', d: 'Phần vòng mông thuộc mặt sau' },
  shoulderToElbow: { t: 'Vai đến khuỷu', d: 'Từ đầu vai xuống khuỷu tay' },
  upperLeg: { t: 'Vòng đùi', d: 'Chu vi chỗ to nhất của đùi' },
  waistToFloor: { t: 'Eo xuống sàn', d: 'Từ ngang eo xuống sàn, đo dọc sườn' },
  waistToKnee: { t: 'Eo xuống gối', d: 'Từ ngang eo xuống đầu gối' },
  waistToSeat: { t: 'Eo xuống mông', d: 'Từ ngang eo xuống chỗ mông nở nhất' },
  waistToUnderbust: { t: 'Eo lên chân ngực', d: 'Từ ngang eo lên ngay dưới bầu ngực' },
  waistToUpperLeg: { t: 'Eo xuống đùi', d: 'Từ ngang eo xuống chỗ đùi to nhất' },
```

Thêm object mới ở cuối `src/vi.js`:

```js
/** Chuỗi giao diện 3D. */
export const UI = {
  tabPattern: 'Rập',
  tabBody: 'Thân 3D',
  bodyMeasurements: 'Số đo thân',
  estimated: 'ước lượng',
  estimatedHint: 'Số này do máy suy ra từ tỉ lệ cơ thể mẫu, không phải bạn đo. Sửa để dùng số thật.',
}
```

- [ ] **Bước 2: Thêm mục "Số đo thân" vào `index.html`**

Chèn ngay sau khối `<details>` của "Số đo cơ thể":

```html
<details>
  <summary>Số đo thân</summary>
  <p class="note">
    Chỉ dùng cho ma-nơ-canh 3D, block không cần. Số nào ghi
    <em>ước lượng</em> là máy suy từ tỉ lệ mẫu — sửa để dùng số bạn đo.
  </p>
  <div id="bodyMeasurements"></div>
</details>
```

- [ ] **Bước 3: Thêm style nhãn ước lượng vào `src/app.css`**

```css
.row.is-estimated span { color: #a0a0a0; font-style: italic }
.row.is-estimated input { border-color: #e0e0e0; color: #888; background: #fafafa }
.est-tag {
  font-size: 10px;
  font-style: normal;
  color: #fff;
  background: #b0b0b0;
  border-radius: 3px;
  padding: 0 4px;
  margin-left: 4px;
}
```

- [ ] **Bước 4: Dựng form số đo thân trong `src/main.js`**

Thêm import `UI` vào dòng import từ `./vi.js`, rồi thêm hàm:

```js
/** Số đo thân 3D cần mà block không dùng tới. */
function bodyOnlyMeasurements() {
  const key = getState().design
  const used = new Set(DESIGNS[key].Design.patternConfig?.measurements ?? [])
  return Object.keys(SAMPLES[key])
    .filter((n) => !used.has(n))
    .sort((a, b) => (MEASUREMENTS[a]?.t ?? a).localeCompare(MEASUREMENTS[b]?.t ?? b, 'vi'))
}

function buildBodyForm() {
  const key = getState().design
  const { measurements: full, estimated } = estimate(getState().measurements, SAMPLES[key])
  const host = $('bodyMeasurements')
  host.replaceChildren()

  for (const name of bodyOnlyMeasurements()) {
    const input = document.createElement('input')
    input.type = 'number'
    input.step = unitOf(name) === '°' ? '0.5' : '1'
    input.min = '0'
    input.dataset.measurement = name
    input.value = full[name] ?? ''

    const m = MEASUREMENTS[name]
    const row = field(`${m?.t ?? name} (${unitOf(name)})`, m?.d ? `${m.d}\n[${name}]` : name, input)

    if (estimated.includes(name)) {
      row.classList.add('is-estimated')
      row.title = UI.estimatedHint
      const tag = document.createElement('span')
      tag.className = 'est-tag'
      tag.textContent = UI.estimated
      row.querySelector('span').appendChild(tag)
    }
    host.appendChild(row)
  }
}
```

- [ ] **Bước 5: Nối sự kiện**

Trong `src/main.js`, thêm:

```js
$('bodyMeasurements').addEventListener('input', (e) => {
  const name = e.target.dataset?.measurement
  if (!name) return
  setMeasurement(name, Number(e.target.value))
  e.target.closest('.row')?.classList.remove('is-estimated')
  e.target.closest('.row')?.querySelector('.est-tag')?.remove()
})
```

Trong hàm xử lý `select.addEventListener('change', ...)`, thêm `buildBodyForm()` cạnh
`buildMeasurementForm()`. Và gọi `buildBodyForm()` một lần lúc khởi tạo, ngay sau
`buildEaseForm()`.

- [ ] **Bước 6: Kiểm tra trong trình duyệt**

Chạy: `npm run dev`

Cả năm điều sau phải đúng:
1. Mục **Số đo thân** có các số đo mà mục "Số đo cơ thể" không có (vòng mông, hạ đũng, vòng gối…).
2. Số máy suy ra hiện chữ xám nghiêng kèm nhãn **ước lượng**.
3. Sửa một số ước lượng → nhãn biến mất, chữ thành đen.
4. Sửa vòng mông → sang tab **Thân 3D** → phần hông của thân đổi theo.
5. Tải lại trang → số vừa sửa vẫn còn và không còn nhãn ước lượng.

- [ ] **Bước 7: Chạy toàn bộ test**

Chạy: `npm test`
Mong đợi: PASS 39/39 (5 tile + 4 store + 30 body), fail 0

- [ ] **Bước 8: Commit**

```bash
git add src/vi.js src/main.js index.html src/app.css
git commit -m "feat(3d): panel số đo thân, nhãn ước lượng rõ ràng

Số do máy suy ra hiện chữ xám kèm nhãn 'ước lượng'. Để người dùng tưởng
vòng mông kia là số họ tự đo là cách nhanh nhất làm mất niềm tin vào cả
tính năng.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 10: Vòng tầng đo và tài liệu

Vòng tầng vừa để định hướng, vừa là bằng chứng trực quan rằng chu vi khớp số đo.

**Files:**
- Sửa: `src/view3d.js`, `src/vi.js`
- Sửa: `README.md`, `CLAUDE.md`

- [ ] **Bước 1: Vẽ vòng tầng trong `src/view3d.js`**

Thêm import ở đầu file:

```js
import { MEASUREMENTS } from './vi.js'
import { SEGMENTS } from './body/section.js'
```

Trong `initView3d`, sau khi tạo `meshes`, thêm:

```js
  const ringGroup = new THREE.Group()
  scene.add(ringGroup)

  const ringMaterial = new THREE.LineBasicMaterial({ color: 0x3366cc })

  /**
   * Chỉ vẽ vòng cho tầng có SỐ ĐO NGUỒN thật (`lv.measure`). Tầng nội suy và tầng
   * đũng có chu vi suy ra — dán nhãn số đo lên chúng là nói dối người dùng.
   */
  function drawRings(levels) {
    ringGroup.clear()
    for (let l = 0; l < levels.length; l++) {
      const lv = levels[l]
      if (!lv.measure || lv.girth === null) continue
      const pts = []
      const base = l * SEGMENTS * 3
      for (let s = 0; s <= SEGMENTS; s++) {
        const i = base + (s % SEGMENTS) * 3
        pts.push(
          new THREE.Vector3(
            body.positions[i] * 1.01,
            body.positions[i + 1],
            body.positions[i + 2] * 1.01
          )
        )
      }
      const g = new THREE.BufferGeometry().setFromPoints(pts)
      const line = new THREE.Line(g, ringMaterial)
      line.userData.label = `${MEASUREMENTS[lv.measure]?.t ?? lv.measure}: ${Math.round(lv.girth)} mm`
      ringGroup.add(line)
    }
  }
```

Sửa hàm `update` để gọi `drawRings`:

```js
  function update(measurements, gender) {
    let levels = null
    for (const { part, geometry } of meshes) {
      const r = part.update(measurements, gender)
      if (part === body) levels = r
      geometry.attributes.position.needsUpdate = true
      geometry.computeVertexNormals()
      geometry.computeBoundingSphere()
    }
    if (levels) drawRings(levels)
    render()
  }
```

- [ ] **Bước 2: Thêm hover hiện nhãn**

Thêm vào cuối `initView3d`, trước `return`:

```js
  const tip = document.createElement('div')
  tip.className = 'ring-tip'
  tip.hidden = true
  container.appendChild(tip)

  const ray = new THREE.Raycaster()
  ray.params.Line.threshold = 12
  const ndc = new THREE.Vector2()

  renderer.domElement.addEventListener('pointermove', (e) => {
    const r = renderer.domElement.getBoundingClientRect()
    ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1
    ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1
    ray.setFromCamera(ndc, camera)
    const hit = ray.intersectObjects(ringGroup.children, false)[0]
    if (hit) {
      tip.textContent = hit.object.userData.label
      tip.style.left = `${e.clientX - r.left + 12}px`
      tip.style.top = `${e.clientY - r.top + 12}px`
      tip.hidden = false
    } else {
      tip.hidden = true
    }
  })
```

Thêm style vào `src/app.css`:

```css
.ring-tip {
  position: absolute;
  pointer-events: none;
  background: #222;
  color: #fff;
  padding: 3px 7px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 2;
}
```

- [ ] **Bước 3: Kiểm tra trong trình duyệt**

Chạy: `npm run dev`

1. Tab **Thân 3D** có các vòng xanh tại ngực, chân ngực, eo, hông, mông.
2. Rê chuột lên một vòng → hiện nhãn kiểu `Vòng eo: 825 mm`.
3. Số trên nhãn **đúng bằng** số trong form. Đây là bằng chứng trực quan của bất biến chính.

- [ ] **Bước 4: Cập nhật `README.md`**

Trong bảng **Đang dùng**, thêm dòng:

```markdown
| [three.js](https://threejs.org/) | MIT | **Dùng qua npm, không fork.** Render ma-nơ-canh 3D. |
```

Xoá mục **Sắp dùng (chưa cài)**.

Trong mục **Làm được gì**, thêm:

```markdown
- Ma-nơ-canh 3D toàn thân biến đổi theo số đo, xoay/thu phóng được, có vòng tầng đo
```

Trong mục **Chưa có / cố ý chưa làm**, sửa dòng Phase 1 thành:

```markdown
- Mặc trang phục lên ma-nơ-canh, tư thế/chuyển động, đầu và bàn tay bàn chân, xuất mesh
```

- [ ] **Bước 5: Cập nhật `CLAUDE.md`**

Trong mục **Lộ trình**, đánh dấu Phase 1 và thêm mục mới sau phần "Tiếng Việt":

```markdown
## Ma-nơ-canh 3D (Phase 1)

Sinh hình học thủ tục từ lát cắt ngang, **không dùng body model học máy**. Lý do và toàn bộ
thiết kế: [spec Phase 1](docs/superpowers/specs/2026-09-07-3d-mannequin-design.md).

Ba luật không được phá:

1. **Chuẩn hoá chu vi là bước CUỐI** khi dựng tiết diện. Đắp bầu ngực trước, chuẩn hoá sau.
   Đảo thứ tự là lỗi im lặng — `test/body.test.mjs` có test canh riêng chuyện này.
2. **Số tầng và số điểm mỗi tầng là hằng số.** Buffer cấp phát một lần, cập nhật ghi đè tại
   chỗ. Đây là cơ chế "không giật lag", không phải chi tiết nội bộ.
3. **`src/body/*` là toán thuần** — không import DOM, không import three.js. Nhờ vậy test
   chạy được bằng `node --test`.

Trục toạ độ: `y` lên, gốc ở sàn, mm. `z > 0` phía trước. `x > 0` bên trái người xem.
```

- [ ] **Bước 6: Chạy toàn bộ test và build**

Chạy: `npm test && npm run build`
Mong đợi: PASS 39/39, build thành công

- [ ] **Bước 7: Commit**

```bash
git add src/view3d.js src/app.css src/vi.js README.md CLAUDE.md
git commit -m "feat(3d): vòng tầng đo + cập nhật tài liệu

Vòng tầng vừa để định hướng vừa là bằng chứng trực quan rằng chu vi thân
khớp số đo: rê chuột lên vòng eo phải ra đúng số trong form.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Kiểm tra cuối

- [ ] `npm test` xanh: 39 test, 0 fail
- [ ] `npm run build` thành công
- [ ] Rập vẫn in được 1:1 (kiểm tra lại ô hiệu chuẩn 100mm chưa hỏng sau refactor store)
- [ ] Đổi số đo → cả rập lẫn thân 3D đều đổi theo
- [ ] Kéo thanh trượt trong lúc đang ở tab Thân 3D không thấy khựng
- [ ] Console trình duyệt không có lỗi
- [ ] `git status` sạch
