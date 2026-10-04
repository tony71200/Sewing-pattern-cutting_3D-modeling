// Một nguồn sự thật cho toàn app. Form rập và panel 3D cùng đọc-ghi lên đây,
// nên không có bài toán đồng bộ hai chiều — chỉ có một state, hai giao diện.

import { RECORD } from './vi.js'

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
