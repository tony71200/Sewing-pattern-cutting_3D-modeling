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
