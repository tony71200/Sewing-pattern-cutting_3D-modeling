// Phía browser của thân 3D: đọc khối nhị phân của service, giải số đo -> target,
// dựng mesh. Không gọi mạng khi kéo thanh trượt.
//
// Dựa trên hai tính chất đã đo được của Anny:
//   * với hai delta mỗi target, chồng chất chính xác tới 0.0001mm
//   * số đo là hàm tuyến tính của target trong 1.72mm
// Nhờ tính chất thứ hai mà file này KHÔNG phải cài lại thuật toán đo mesh.

/** Đọc khối nhị phân từ POST /api/fit. */
export function parseFit(arrayBuffer) {
  const dv = new DataView(arrayBuffer)
  const headerLen = dv.getUint32(0, true)
  const header = JSON.parse(new TextDecoder().decode(new Uint8Array(arrayBuffer, 4, headerLen)))
  let o = 4 + headerLen

  const positions = new Float32Array(arrayBuffer.slice(o, o + header.vertexCount * 12))
  o += header.vertexCount * 12
  const indices = new Int32Array(arrayBuffer.slice(o, o + header.indexCount * 4))
  o += header.indexCount * 4

  const readChunk = () => {
    const n = dv.getUint32(o, true)
    o += 4
    const idx = new Int32Array(arrayBuffer.slice(o, o + n * 4))
    o += n * 4
    const vec = new Float32Array(arrayBuffer.slice(o, o + n * 12))
    o += n * 12
    return { idx, vec }
  }
  const deltas = []
  for (let j = 0; j < header.targets.length; j++) {
    deltas.push({ pos: readChunk(), neg: readChunk() }) // service ghi dương trước, rồi âm
  }
  return { header, positions, indices, deltas }
}

/** Khử Gauss có chọn trục. n nhỏ (9) nên không cần gì phức tạp hơn. */
export function solve9(A, b) {
  const n = b.length
  const M = A.map((row, i) => Float64Array.from([...row, b[i]]))
  for (let c = 0; c < n; c++) {
    let p = c
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r
    if (Math.abs(M[p][c]) < 1e-12) continue // cột suy biến: để nghiệm bằng 0
    ;[M[c], M[p]] = [M[p], M[c]]
    for (let r = 0; r < n; r++) {
      if (r === c) continue
      const f = M[r][c] / M[c][c]
      if (!f) continue
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]
    }
  }
  const x = new Float64Array(n)
  for (let i = 0; i < n; i++) x[i] = Math.abs(M[i][i]) < 1e-12 ? 0 : M[i][n] / M[i][i]
  return x
}

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x))

/**
 * Số đo dự đoán từ Jacobian. Nhánh dấu phải đúng — hai nhánh có độ nhạy khác nhau.
 *
 * Dùng `header.base` (số đo tại t=0), KHÔNG dùng `header.measurements` (số đo của mesh
 * service đã fit). Lẫn hai cái này thì bộ giải của browser lệch khỏi service.
 */
export function predictMeasurements(header, t) {
  const { names, jacobianPos: Jp, jacobianNeg: Jn, base: m0 } = header
  const out = {}
  names.forEach((n, i) => {
    let v = m0[n]
    for (let j = 0; j < t.length; j++) v += t[j] >= 0 ? Jp[i][j] * t[j] : Jn[i][j] * -t[j]
    out[n] = v
  })
  return out
}

/**
 * Số đo mong muốn -> giá trị target. Newton có tập hoạt động, giống hệt solve_targets()
 * bên service — có test đối chiếu hai lời giải.
 *
 * Ba chi tiết, bỏ cái nào cũng tụt kết quả:
 * 1. Giải CẢ HỆ, không chỉnh từng số một: ghép chéo rất mạnh (eo -> chân ngực +92mm/đơn vị).
 * 2. GHIM target chạm biên rồi giải lại cho phần còn lại.
 * 3. BỎ số đo j khỏi mục tiêu khi target j đã ghim: nó nằm ngoài tầm với, giữ lại chỉ khiến
 *    bộ giải bóp méo số đo khác để đuổi theo — vòng eo lệch 9mm chỉ để cứu chân ngực.
 */
export function solveTargets(header, want, iters = 4) {
  const { names, jacobianPos: Jp, jacobianNeg: Jn, limit } = header
  const n = names.length
  const t = new Array(n).fill(0)

  for (let it = 0; it < iters; it++) {
    // đạo hàm theo nhánh dấu hiện tại
    const J = names.map((_, i) => t.map((x, j) => (x >= 0 ? Jp[i][j] : -Jn[i][j])))
    let free = new Array(n).fill(true)
    const step = new Array(n).fill(0)

    for (let guard = 0; guard < n; guard++) {
      const cur = t.map((x, j) => x + step[j])
      const pred = predictMeasurements(header, cur)
      const idx = []
      for (let j = 0; j < n; j++) if (free[j]) idx.push(j)
      const sub = idx.map((i) => idx.map((j) => J[i][j]))
      const rhs = idx.map((i) => (want[names[i]] ?? header.want[names[i]]) - pred[names[i]])
      const d = solve9(sub, rhs)

      const over = []
      idx.forEach((j, k) => {
        const c = t[j] + step[j] + d[k]
        if (c > limit + 1e-9 || c < -limit - 1e-9) over.push([j, clamp(c, -limit, limit)])
      })
      if (!over.length) {
        idx.forEach((j, k) => { step[j] += d[k] })
        break
      }
      for (const [j, v] of over) {
        step[j] = v - t[j]
        free[j] = false
      }
      if (!free.some(Boolean)) break
    }
    for (let j = 0; j < n; j++) t[j] = clamp(t[j] + step[j], -limit, limit)
  }
  return t
}

/** Dựng mesh từ vector target, ghi đè vào `out` — không cấp phát mảng mới. */
export function buildPositions(fit, t, out) {
  out.set(fit.positions)
  for (let j = 0; j < fit.deltas.length; j++) {
    const x = t[j]
    if (!x) continue
    const { idx, vec } = x >= 0 ? fit.deltas[j].pos : fit.deltas[j].neg
    const w = x >= 0 ? x : -x
    for (let k = 0; k < idx.length; k++) {
      const o = idx[k] * 3
      out[o] += vec[k * 3] * w
      out[o + 1] += vec[k * 3 + 1] * w
      out[o + 2] += vec[k * 3 + 2] * w
    }
  }
  return out
}
