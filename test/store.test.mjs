import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getState, setState, setMeasurement, subscribe, resetForTest, recordToState } from '../src/store.js'

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
