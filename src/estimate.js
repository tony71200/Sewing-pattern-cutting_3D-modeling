import { cisFemaleAdult38, cisMaleAdult38 } from '@freesewing/models'

// BẢN SAO LOGIC nằm ở service/estimate.py — sửa ở đây thì sửa cả bên đó.
// Tồn tại hai bản có chủ đích: form "Số đo thân" phải hiện nhãn "ước lượng" TRƯỚC khi gọi
// service, vì tab Rập chạy được khi không có Python. Dữ liệu dùng chung bộ mẫu của
// @freesewing/models nên không thể lệch; chỉ logic mới có thể, và cả hai bên đều có test.

export const SAMPLES = { bella: cisFemaleAdult38, brian: cisMaleAdult38 }

/** Số đo là chu vi (vòng). Phần còn lại coi là khoảng cách/chiều dài. */
const GIRTH = new Set([
  'ankle', 'biceps', 'chest', 'head', 'heel', 'highBust', 'hips', 'knee',
  'neck', 'seat', 'underbust', 'upperLeg', 'waist', 'wrist',
])

/** Không phải mm — không được nhân tỉ lệ. */
const NO_SCALE = new Set(['shoulderSlope'])

/**
 * Điền các số đo còn thiếu bằng cách suy từ bộ mẫu.
 *
 * Dùng HAI hệ số riêng biệt. Một hệ số duy nhất sẽ sai: người thấp mập và
 * người cao gầy có thể cùng vòng ngực.
 */
export function estimate(measurements, sample) {
  const kGirth = (measurements.chest ?? sample.chest) / sample.chest
  const kLength =
    (measurements.hpsToWaistBack ?? sample.hpsToWaistBack) / sample.hpsToWaistBack

  const out = { ...measurements }
  const estimated = []

  for (const [name, sampleValue] of Object.entries(sample)) {
    if (Number.isFinite(out[name]) && out[name] > 0) continue
    const k = NO_SCALE.has(name) ? 1 : GIRTH.has(name) ? kGirth : kLength
    out[name] = NO_SCALE.has(name) ? sampleValue : Math.round(sampleValue * k)
    estimated.push(name)
  }

  return { measurements: out, estimated }
}
