import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseFit, solve9, solveTargets, buildPositions, predictMeasurements } from '../src/body3d.js'

const buf = readFileSync(new URL('./fixtures/fit.bin', import.meta.url))
const fit = parseFit(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))

test('parse ra đúng số đỉnh và số delta', () => {
  assert.equal(fit.positions.length, fit.header.vertexCount * 3)
  assert.equal(fit.indices.length, fit.header.indexCount)
  assert.equal(fit.deltas.length, 9, 'mỗi số đo một cặp delta')
  for (const d of fit.deltas) {
    assert.ok(d.pos.idx.length > 0 && d.neg.idx.length > 0)
    assert.equal(d.pos.vec.length, d.pos.idx.length * 3)
  }
})

test('mesh nhận được là mm, y hướng lên, chân chạm y=0', () => {
  const { header, positions } = fit
  assert.equal(header.units, 'mm')
  assert.equal(header.up, 'y')
  let minY = Infinity, maxY = -Infinity
  for (let i = 1; i < positions.length; i += 3) {
    if (positions[i] < minY) minY = positions[i]
    if (positions[i] > maxY) maxY = positions[i]
  }
  assert.ok(Math.abs(minY) < 1, `chân phải chạm y=0, được ${minY}`)
  assert.ok(maxY > 1200 && maxY < 2100, `chiều cao ${maxY}mm vô lý`)
})

test('solve9 giải đúng hệ tuyến tính', () => {
  const x = solve9([[2, 1], [1, 3]], [5, 10])
  assert.ok(Math.abs(x[0] - 1) < 1e-9 && Math.abs(x[1] - 3) < 1e-9)
})

test('solve9 chịu được ma trận cần đổi hàng', () => {
  const x = solve9([[0, 1], [1, 0]], [2, 3])
  assert.ok(Math.abs(x[0] - 3) < 1e-9 && Math.abs(x[1] - 2) < 1e-9)
})

test('solveTargets kẹp trong biên và khớp phần lớn số đo', () => {
  const want = { ...fit.header.want }
  const t = solveTargets(fit.header, want)
  assert.equal(t.length, 9)
  for (const x of t) assert.ok(Math.abs(x) <= fit.header.limit + 1e-9, `${x} vượt biên`)
  const pred = predictMeasurements(fit.header, t)
  const ok = fit.header.names.filter((n) => Math.abs(pred[n] - want[n]) <= 2).length
  assert.ok(ok >= 8, `chỉ ${ok}/9 khớp trong 2mm`)
})

test('solveTargets khớp lời giải của service', () => {
  const t = solveTargets(fit.header, fit.header.want)
  fit.header.names.forEach((n, j) => {
    assert.ok(Math.abs(t[j] - fit.header.targetValues[n]) < 0.05,
      `${n}: browser ${t[j].toFixed(3)} vs service ${fit.header.targetValues[n].toFixed(3)}`)
  })
})

test('không hy sinh số đo dễ đạt để cứu số đo ngoài tầm', () => {
  const t = solveTargets(fit.header, fit.header.want)
  const pred = predictMeasurements(fit.header, t)
  for (const n of ['waist', 'chest', 'seat']) {
    const d = pred[n] - fit.header.want[n]
    assert.ok(Math.abs(d) <= 2, `${n} lệch ${d.toFixed(0)}mm — bộ giải đang hy sinh nó`)
  }
})

test('buildPositions ghi đè TẠI CHỖ, không cấp phát mảng mới', () => {
  const out = new Float32Array(fit.positions.length)
  const a = buildPositions(fit, new Array(9).fill(0), out)
  assert.equal(a, out, 'phải trả về đúng mảng truyền vào')
  const b = buildPositions(fit, new Array(9).fill(0.5), out)
  assert.equal(b, out)
})

test('positions là mesh GỐC: target = 0 phải cho lại y nguyên nó', () => {
  // Service gửi V0, không phải mesh đã fit — delta tính từ V0 nên browser phải tự áp.
  // Gửi mesh đã fit thì browser cộng lần nữa và lệch 50mm.
  const out = buildPositions(fit, new Array(9).fill(0), new Float32Array(fit.positions.length))
  let worst = 0
  for (let i = 0; i < out.length; i++) worst = Math.max(worst, Math.abs(out[i] - fit.positions[i]))
  assert.equal(worst, 0)
})

test('browser dự đoán khớp số đo service ĐO THẬT trên mesh đã fit', () => {
  // Đây là chỗ nối giữa mô hình tuyến tính của browser và sự thật của service.
  const t = fit.header.names.map((n) => fit.header.targetValues[n])
  const pred = predictMeasurements(fit.header, t)
  for (const n of fit.header.names) {
    const d = Math.abs(pred[n] - fit.header.measurements[n])
    assert.ok(d < 3, `${n}: browser đoán ${pred[n].toFixed(1)}, service đo ${fit.header.measurements[n].toFixed(1)}`)
  }
})

test('header có cả base lẫn measurements, và chúng KHÁC nhau', () => {
  // base = số đo tại t=0 (gốc mô hình tuyến tính). measurements = đo thật trên mesh đã fit.
  assert.ok(fit.header.base && fit.header.measurements)
  const diff = fit.header.names.some(
    (n) => Math.abs(fit.header.base[n] - fit.header.measurements[n]) > 1)
  assert.ok(diff, 'nếu giống hệt nhau thì service đang gửi nhầm một trong hai')
})
