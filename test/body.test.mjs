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
