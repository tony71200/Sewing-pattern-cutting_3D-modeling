// Số đo -> bảng tầng ngang. Mỗi tầng biết độ cao y, chu vi mục tiêu, và dáng
// tiết diện (tỉ lệ rộng/sâu + độ vuông).
//
// Neo mọi thứ vào EO, vì mọi khoảng cách dọc của freesewing đều đo từ eo hoặc từ HPS.

/** Khoảng hở tối thiểu giữa hai tầng (mm), để số đo cực đoan không làm tầng vượt nhau. */
const MIN_GAP = 5

/**
 * Dáng tiết diện: [tỉ lệ rộng/sâu, độ vuông n].
 * Eo tròn hơn, lồng ngực dẹt và vuông hơn, mông rộng hơn ở nữ.
 */
const SHAPE = {
  female: {
    // Vai RỘNG và NÔNG. Để ratio 1.0 thì tầng vai thành đĩa tròn đường kính bằng
    // cả bề rộng vai — nhìn ra cái mắc áo, không ra người.
    neck: [1.0, 2.0], shoulder: [2.6, 2.6], armpit: [1.35, 2.6], bust: [1.25, 2.4],
    underbust: [1.3, 2.4], waist: [1.25, 2.2], hips: [1.35, 2.3], seat: [1.4, 2.4],
    crotch: [1.3, 2.2],
  },
  male: {
    neck: [1.0, 2.0], shoulder: [2.6, 2.6], armpit: [1.4, 2.8], bust: [1.35, 2.7],
    underbust: [1.3, 2.6], waist: [1.2, 2.4], hips: [1.25, 2.4], seat: [1.25, 2.4],
    crotch: [1.2, 2.2],
  },
}

/** Tầng có số đo, từ trên xuống. Tầng nội suy chèn vào sau. */
const NAMED = [
  'neck', 'shoulder', 'armpit', 'bust', 'underbust', 'waist', 'hips', 'seat', 'crotch',
]

/** Số tầng nội suy chèn giữa mỗi cặp tầng có số đo. */
const SUBDIV = 2

export const LEVEL_COUNT = NAMED.length + (NAMED.length - 1) * SUBDIV

const deg2rad = (d) => (d * Math.PI) / 180

export function buildLevels(m, gender) {
  const shape = SHAPE[gender] ?? SHAPE.female

  const yWaist = m.waistToFloor
  const yHps = yWaist + m.hpsToWaistBack

  const raw = [
    { name: 'neck', y: yHps, girth: m.neck, measure: 'neck' },
    {
      name: 'shoulder',
      // shoulderSlope là ĐỘ. Đây là chỗ duy nhất nó được dùng; bỏ qua thì vai
      // phẳng như mắc áo.
      y: yHps - (m.shoulderToShoulder / 2) * Math.tan(deg2rad(m.shoulderSlope)),
      girth: null,
      width: m.shoulderToShoulder,
      measure: null,
    },
    { name: 'armpit', y: yWaist + m.waistToArmpit, girth: m.highBust, measure: 'highBust' },
    { name: 'bust', y: yHps - m.hpsToBust, girth: m.chest, measure: 'chest' },
    { name: 'underbust', y: yWaist + m.waistToUnderbust, girth: m.underbust, measure: 'underbust' },
    { name: 'waist', y: yWaist, girth: m.waist, measure: 'waist' },
    { name: 'hips', y: yWaist - m.waistToHips, girth: m.hips, measure: 'hips' },
    { name: 'seat', y: yWaist - m.waistToSeat, girth: m.seat, measure: 'seat' },
    // Chu vi đũng suy ra, không có số đo nguồn -> measure null, không vẽ vòng đo
    { name: 'crotch', y: yWaist - m.crotchDepth, girth: m.seat * 0.95, measure: null },
  ]

  // Thứ tự y trên dữ liệu thật của cả hai giới đã đúng sẵn (kiểm bằng bộ mẫu
  // size 38); vòng kẹp dưới đây chỉ kích hoạt với số đo cực đoan.
  for (let i = 1; i < raw.length; i++) {
    if (raw[i].y >= raw[i - 1].y - MIN_GAP) raw[i].y = raw[i - 1].y - MIN_GAP
  }

  const levels = []
  for (let i = 0; i < raw.length; i++) {
    levels.push(decorate(raw[i], shape, gender))
    if (i === raw.length - 1) break
    for (let s = 1; s <= SUBDIV; s++) {
      levels.push(interpolate(raw[i], raw[i + 1], s / (SUBDIV + 1), shape, gender))
    }
  }
  return levels
}

function decorate(lv, shape, gender) {
  const [ratio, n] = shape[lv.name] ?? [1.2, 2.2]
  return {
    name: lv.name,
    y: lv.y,
    girth: lv.girth ?? null,
    width: lv.width ?? null,
    measure: lv.measure ?? null,
    ratio,
    n,
    bust: gender === 'female' && lv.name === 'bust',
  }
}

function interpolate(a, b, t, shape, gender) {
  const A = decorate(a, shape, gender)
  const B = decorate(b, shape, gender)
  const mix = (p, q) => p + (q - p) * t
  return {
    name: `${a.name}~${b.name}@${t.toFixed(2)}`,
    y: mix(A.y, B.y),
    // Tầng vai chỉ có width; lấy chu vi của tầng lân cận để nội suy không bị null.
    girth: mix(A.girth ?? B.girth ?? 0, B.girth ?? A.girth ?? 0),
    width: null,
    measure: null, // chu vi nội suy, không phải số đo của ai
    ratio: mix(A.ratio, B.ratio),
    n: mix(A.n, B.n),
    bust: false,
  }
}
