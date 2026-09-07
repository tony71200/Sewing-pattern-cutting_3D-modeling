// node --test test/tile.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { tileGrid, A4 } from '../src/tile.js'

test('A4 constant', () => {
  assert.deepEqual(A4, { w: 210, h: 297 })
})

test('rập nhỏ hơn 1 trang → đúng 1 trang', () => {
  assert.deepEqual(pick(tileGrid(100, 100)), { cols: 1, rows: 1 })
  assert.deepEqual(pick(tileGrid(190, 277)), { cols: 1, rows: 1 })
})

test('vượt 1 trang dù chỉ 1mm → 2 trang', () => {
  assert.equal(tileGrid(191, 10).cols, 2)
  assert.equal(tileGrid(10, 278).rows, 2)
})

test('các trang phủ kín rập, tính cả chồng mép', () => {
  const { page, step } = tileGrid(1, 1)
  // Với mọi kích thước, trang cuối phải chạm hoặc vượt mép rập.
  for (const len of [50, 190, 191, 400, 1013, 2000, 3500]) {
    const { cols } = tileGrid(len, 10)
    const covered = (cols - 1) * step.w + page.w
    assert.ok(covered >= len, `w=${len}: phủ ${covered}mm < ${len}mm (${cols} cột)`)
    // và không thừa hẳn một trang
    const withoutLast = cols === 1 ? 0 : (cols - 2) * step.w + page.w
    assert.ok(withoutLast < len, `w=${len}: thừa trang (${cols} cột)`)
  }
})

test('chồng mép đúng bằng hiệu page - step', () => {
  const g = tileGrid(1, 1)
  assert.equal(g.page.w - g.step.w, g.overlap)
  assert.equal(g.page.h - g.step.h, g.overlap)
})

const pick = ({ cols, rows }) => ({ cols, rows })
