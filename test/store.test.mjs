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
