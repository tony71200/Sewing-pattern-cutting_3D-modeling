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
