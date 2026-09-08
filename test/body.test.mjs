import { test } from 'node:test'
import assert from 'node:assert/strict'
import { estimate, SAMPLES } from '../src/estimate.js'

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
  assert.ok(Math.abs(p - ramanujan) / ramanujan < 0.001, `lech ${p} vs ${ramanujan}`)
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
      `a=${a} b=${b} n=${n}: duoc ${perimeter(pts)}, can ${target}`
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

import { addBust, bustProjection } from '../src/body/section.js'

test('bầu ngực đẩy mặt trước ra tại vị trí hai đỉnh ngực', () => {
  const raw = superellipse(180, 100, 2.5)
  const bust = addBust(raw, { bustSpan: 200, projection: 40, sigma: 70 })
  const frontZ = (pts) => Math.max(...pts.map(([, z]) => z))
  assert.ok(frontZ(bust) > frontZ(raw), 'mat truoc phai nho ra')
})

test('bầu ngực không đụng vào mặt sau', () => {
  const raw = superellipse(180, 100, 2.5)
  const bust = addBust(raw, { bustSpan: 200, projection: 40, sigma: 70 })
  for (let i = 0; i < raw.length; i++) {
    if (raw[i][1] <= 0) assert.deepEqual(bust[i], raw[i], `diem ${i} o mat sau bi doi`)
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
    'neu test nay do thi bau nguc qua nho de chung minh duoc gi'
  )
})

test('độ nhô suy từ hiệu vòng ngực và vòng chân ngực', () => {
  assert.ok(bustProjection(1034, 900) > bustProjection(1034, 1000))
  assert.equal(bustProjection(900, 900), 0)
  assert.equal(bustProjection(880, 900), 0, 'hieu am thi coi nhu khong co bau')
})

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
        `${levels[i].name} (y=${levels[i].y}) khong thap hon ${levels[i - 1].name} (y=${levels[i - 1].y})`
      )
    }
  }
})

test('không có NaN trong bảng tầng', () => {
  for (const lv of buildLevels(full(), 'female')) {
    assert.ok(Number.isFinite(lv.y), `${lv.name}.y la NaN`)
    assert.ok(Number.isFinite(lv.ratio) && Number.isFinite(lv.n), `${lv.name} dang NaN`)
    assert.ok(lv.girth === null || Number.isFinite(lv.girth), `${lv.name}.girth NaN`)
  }
})

test('tầng eo lấy đúng số đo vòng eo và ghi rõ nguồn', () => {
  const m = full({ waist: 825 })
  const levels = buildLevels(m, 'female')
  const waistLevel = levels.find((l) => l.name === 'waist')
  assert.equal(waistLevel.girth, 825)
  assert.equal(waistLevel.measure, 'waist')

  assert.equal(levels.find((l) => l.name.includes('~')).measure, null)
  assert.equal(levels.find((l) => l.name === 'crotch').measure, null)
  assert.equal(levels.find((l) => l.name === 'shoulder').measure, null)
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
  assert.ok(shoulder.y < neck.y, 'dau vai phai thap hon chan co')
})

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
      `tang ${levels[i].name}: do duoc ${measured.toFixed(2)}mm, can ${levels[i].girth}mm`
    )
  }
})

test('bầu ngực KHÔNG phá vỡ bất biến chu vi', () => {
  const m = full({ chest: 1034, underbust: 800 })
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
  assert.equal(body.positions, ref, 'phai la cung mot Float32Array')
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

import { createLimbs, readLimbGirth } from '../src/body/mesh.js'

test('chu vi mỗi vòng tay/chân khớp số đo', () => {
  const m = full({ biceps: 313, wrist: 166, upperLeg: 620, knee: 380, ankle: 245 })
  const limbs = createLimbs()
  const rings = limbs.update(m, 'female')
  for (let i = 0; i < rings.length; i++) {
    assert.ok(
      Math.abs(readLimbGirth(limbs.positions, i) - rings[i].girth) < 0.5,
      `vong ${rings[i].name}: do ${readLimbGirth(limbs.positions, i).toFixed(2)}, can ${rings[i].girth}`
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
