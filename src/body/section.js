// Một tiết diện ngang của thân.
//
// Toán thuần, không đụng DOM và không đụng three.js — nhờ vậy test chạy được
// bằng `node --test`, và sai 2mm bị bắt ở đây chứ không phải sau khi cắt vải.
//
// Toạ độ: x = ngang (dương là bên trái người xem), z = trước-sau (dương là phía trước).
// Chiều cao y do levels.js quyết định, không thuộc về file này.

/** Số điểm mỗi tầng. HẰNG SỐ — số đỉnh không được phụ thuộc số đo. */
export const SEGMENTS = 64

/**
 * Siêu ê-líp |x/a|^n + |z/b|^n = 1, lấy mẫu đều theo góc tham số.
 *
 * n = 2 cho ê-líp thường. n lớn hơn cho tiết diện "vuông" hơn (lồng ngực).
 * n nhỏ hơn 2 cho hình thoi hơn.
 */
export function superellipse(a, b, n) {
  const pts = []
  const e = 2 / n
  for (let i = 0; i < SEGMENTS; i++) {
    const t = (i / SEGMENTS) * Math.PI * 2
    const c = Math.cos(t)
    const s = Math.sin(t)
    pts.push([
      a * Math.sign(c) * Math.abs(c) ** e,
      b * Math.sign(s) * Math.abs(s) ** e,
    ])
  }
  return pts
}

/** Chu vi đa giác khép kín — đo đúng thứ lưới sẽ có, không phải đường cong lý tưởng. */
export function perimeter(pts) {
  let sum = 0
  for (let i = 0; i < pts.length; i++) {
    const [x1, z1] = pts[i]
    const [x2, z2] = pts[(i + 1) % pts.length]
    sum += Math.hypot(x2 - x1, z2 - z1)
  }
  return sum
}

/**
 * Nhân toàn bộ tiết diện với một hệ số duy nhất cho chu vi bằng đúng số đo.
 *
 * Đây là mấu chốt của cả kiến trúc: dáng do (a/b, n) quyết định, kích thước do
 * hệ số này quyết định. Nhờ tách bạch vậy mà chu vi luôn khớp số đo bất kể dáng
 * thế nào, và không cần giải bài toán ngược.
 *
 * PHẢI là bước cuối cùng khi dựng một tiết diện. Đắp bầu ngực trước, chuẩn hoá sau.
 */
export function scaleToGirth(pts, target) {
  const k = target / perimeter(pts)
  return pts.map(([x, z]) => [x * k, z * k])
}

/**
 * Độ nhô bầu ngực suy từ hiệu vòng ngực và vòng chân ngực.
 *
 * Đây chính là cách xác định cỡ cúp áo ngực ngoài đời, nên không cần bắt người
 * dùng nhập thêm số đo nào.
 */
export function bustProjection(chest, underbust) {
  const diff = chest - underbust
  if (diff <= 0) return 0
  // ponytail: hệ số 0.30 chọn theo cảm quan, chưa đối chiếu bảng cỡ cúp thật.
  // Chỉnh lại khi có ma-nơ-canh in ra so với người thật.
  return diff * 0.3
}

/**
 * Đắp hai bướu vào nửa TRƯỚC của tiết diện, tại x = ±bustSpan/2.
 *
 * PHẢI gọi TRƯỚC scaleToGirth. Bướu làm tăng chiều dài cung; chuẩn hoá trước
 * rồi mới đắp thì vòng ngực không còn đúng — và sai im lặng.
 */
export function addBust(pts, { bustSpan, projection, sigma }) {
  if (projection <= 0) return pts
  const apex = bustSpan / 2
  const maxZ = Math.max(...pts.map(([, z]) => z)) || 1
  return pts.map(([x, z]) => {
    if (z <= 0) return [x, z] // mặt sau không đụng tới
    const d = Math.min(Math.abs(x - apex), Math.abs(x + apex))
    // Nhân với độ "hướng ra trước" để không có bậc nhảy tại z = 0
    const frontness = z / maxZ
    const bump = projection * Math.exp(-(d * d) / (2 * sigma * sigma)) * frontness
    return [x, z + bump]
  })
}
