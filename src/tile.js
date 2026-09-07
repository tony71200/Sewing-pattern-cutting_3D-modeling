// Cắt SVG rập thành các trang A4 in được 1:1.
//
// Nền tảng: freesewing render SVG với 1 đơn vị viewBox = 1 mm và width/height ghi bằng mm.
// Nên mỗi tile chỉ cần đặt viewBox = hình chữ nhật mm của trang, width/height = mm thật.
// Không scale, không tính dpi — trình duyệt in đúng kích thước vật lý.

export const A4 = { w: 210, h: 297 }
const MARGIN = 10 // mm, khớp @page margin trong app.css
const OVERLAP = 10 // mm chồng mép để dán

const PAGE = { w: A4.w - 2 * MARGIN, h: A4.h - 2 * MARGIN } // 190 x 277
const STEP = { w: PAGE.w - OVERLAP, h: PAGE.h - OVERLAP }

const SVGNS = 'http://www.w3.org/2000/svg'

/**
 * Số trang cần để phủ hết hình chữ nhật w x h (mm), có chồng mép OVERLAP.
 * Tách riêng khỏi DOM để test được: sai một trang là mất một tờ rập.
 */
export function tileGrid(w, h) {
  const need = (len, step, page) => (len <= page ? 1 : Math.ceil((len - OVERLAP) / step))
  return {
    cols: Math.max(1, need(w, STEP.w, PAGE.w)),
    rows: Math.max(1, need(h, STEP.h, PAGE.h)),
    page: { ...PAGE },
    step: { ...STEP },
    overlap: OVERLAP,
  }
}

/** Đọc kích thước mm từ SVG đã render. */
export function svgSizeMm(svgEl) {
  const vb = svgEl.getAttribute('viewBox')
  if (vb) {
    const [x, y, w, h] = vb.trim().split(/[\s,]+/).map(Number)
    if ([x, y, w, h].every(Number.isFinite)) return { x, y, w, h }
  }
  // freesewing luôn ghi viewBox; nếu thiếu thì rập hỏng, không đoán bừa.
  throw new Error('SVG không có viewBox — không xác định được tỉ lệ mm, từ chối in.')
}

function el(name, attrs, text) {
  const n = document.createElementNS(SVGNS, name)
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v)
  if (text != null) n.textContent = text
  return n
}

/** Ô vuông 100mm để người dùng kiểm tra máy in không co giãn bản in. */
function calibrationSquare(x, y) {
  const g = el('g', { fill: 'none' })
  g.appendChild(
    el('rect', {
      x: x + 5,
      y: y + 5,
      width: 100,
      height: 100,
      stroke: '#c00',
      'stroke-width': 0.4,
    })
  )
  g.appendChild(
    el('text', {
      x: x + 8,
      y: y + 16,
      'font-size': 5,
      fill: '#c00',
      'font-family': 'sans-serif',
    }, 'Ô hiệu chuẩn: cạnh phải đúng 100 mm')
  )
  return g
}

/** Khung tile + nhãn hàng/cột để dán đúng thứ tự. */
function pageFurniture(x, y, col, row, cols, rows, page, total) {
  const g = el('g', { fill: 'none' })
  g.appendChild(
    el('rect', {
      x,
      y,
      width: PAGE.w,
      height: PAGE.h,
      stroke: '#999',
      'stroke-width': 0.3,
      'stroke-dasharray': '4 2',
    })
  )
  // Vạch chồng mép: cắt tới đường này rồi dán chồng lên trang kế.
  if (col < cols - 1) {
    g.appendChild(
      el('path', {
        d: `M ${x + PAGE.w - OVERLAP} ${y} L ${x + PAGE.w - OVERLAP} ${y + PAGE.h}`,
        stroke: '#0a0',
        'stroke-width': 0.3,
        'stroke-dasharray': '2 2',
      })
    )
  }
  if (row < rows - 1) {
    g.appendChild(
      el('path', {
        d: `M ${x} ${y + PAGE.h - OVERLAP} L ${x + PAGE.w} ${y + PAGE.h - OVERLAP}`,
        stroke: '#0a0',
        'stroke-width': 0.3,
        'stroke-dasharray': '2 2',
      })
    )
  }
  g.appendChild(
    el('text', {
      x: x + 3,
      y: y + PAGE.h - 3,
      'font-size': 4,
      fill: '#666',
      'font-family': 'sans-serif',
    }, `hàng ${row + 1} / cột ${col + 1}  —  trang ${page}/${total}`)
  )
  return g
}

/**
 * @param {SVGSVGElement} svgEl  SVG rập đã render (sẽ được clone, không sửa)
 * @returns {HTMLElement[]} các div.page, mỗi div là 1 trang A4
 */
export function tileToA4(svgEl) {
  const box = svgSizeMm(svgEl)
  const { cols, rows } = tileGrid(box.w, box.h)
  const total = cols * rows
  const pages = []

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = box.x + col * STEP.w
      const y = box.y + row * STEP.h
      const page = row * cols + col + 1

      const tile = el('svg', {
        xmlns: SVGNS,
        width: `${PAGE.w}mm`,
        height: `${PAGE.h}mm`,
        viewBox: `${x} ${y} ${PAGE.w} ${PAGE.h}`,
        class: svgEl.getAttribute('class') || '',
      })
      // Clone toàn bộ nội dung rập (style + defs + các stack) vào từng tile.
      for (const child of svgEl.children) tile.appendChild(child.cloneNode(true))
      tile.appendChild(pageFurniture(x, y, col, row, cols, rows, page, total))
      if (page === 1) tile.appendChild(calibrationSquare(x, y))

      const div = document.createElement('div')
      div.className = 'page'
      div.appendChild(tile)
      pages.push(div)
    }
  }
  return pages
}

// ponytail: tile theo lưới chữ nhật đầy đủ — vài trang có thể trắng nếu rập hình chữ L.
// Bỏ trang trắng khi thấy tốn giấy thật; cần test giao cắt bbox từng part.
