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
