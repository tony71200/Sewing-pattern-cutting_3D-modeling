import { Bella } from '@freesewing/bella'
import { Brian } from '@freesewing/brian'
import { themePlugin } from '@freesewing/plugin-theme'
import { i18nPlugin } from '@freesewing/plugin-i18n'
import { cisFemaleAdult38, cisMaleAdult38 } from '@freesewing/models'
import { tileToA4 } from './tile.js'
import { MEASUREMENTS, OPTIONS, SVG_STRINGS } from './vi.js'

const DESIGNS = {
  bella: { label: 'Bella — block thân nữ', Design: Bella, sample: cisFemaleAdult38 },
  brian: { label: 'Brian — block thân nam', Design: Brian, sample: cisMaleAdult38 },
}

const $ = (id) => document.getElementById(id)
const STORE_KEY = 'pattern-studio/v1'

let lastDraft = null // { svg, record }

// ---------- cấu hình lấy từ chính pattern config ----------

const design = () => DESIGNS[$('design').value].Design

/** Số đo bắt buộc, sắp theo tên tiếng Việt cho dễ dò. */
function requiredMeasurements() {
  const list = [...(design().patternConfig?.measurements ?? [])]
  return list.sort((a, b) =>
    (MEASUREMENTS[a]?.t ?? a).localeCompare(MEASUREMENTS[b]?.t ?? b, 'vi')
  )
}

/**
 * Option nhóm "fit" = độ cử động. Chỉ lấy loại phần trăm; bỏ qua option có `menu`
 * là hàm (freesewing bật/tắt chúng theo option khác — ngoài phạm vi phase 0).
 */
function easeOptions() {
  const opts = design().patternConfig?.options ?? {}
  return Object.entries(opts)
    .filter(([, v]) => v && typeof v === 'object' && v.menu === 'fit' && typeof v.pct === 'number')
    .map(([name, cfg]) => ({ name, cfg }))
}

const unitOf = (name) => MEASUREMENTS[name]?.unit ?? 'mm'

// ---------- form ----------

function field(labelText, title, input) {
  const label = document.createElement('label')
  label.className = 'row'
  const span = document.createElement('span')
  span.textContent = labelText
  if (title) span.title = title
  label.append(span, input)
  return label
}

function buildMeasurementForm() {
  const key = $('design').value
  const saved = loadSaved().measurements?.[key] ?? {}
  const sample = DESIGNS[key].sample
  const host = $('measurements')
  host.replaceChildren()
  for (const name of requiredMeasurements()) {
    const input = document.createElement('input')
    input.type = 'number'
    input.step = unitOf(name) === '°' ? '0.5' : '1'
    input.min = '0'
    input.dataset.measurement = name
    input.value = saved[name] ?? sample[name] ?? ''
    const m = MEASUREMENTS[name]
    host.appendChild(
      field(`${m?.t ?? name} (${unitOf(name)})`, m?.d ? `${m.d}\n[${name}]` : name, input)
    )
  }
}

function buildEaseForm() {
  const key = $('design').value
  const saved = loadSaved().options?.[key] ?? {}
  const host = $('ease')
  host.replaceChildren()

  for (const { name, cfg } of easeOptions()) {
    const wrap = document.createElement('div')
    wrap.className = 'ease'

    const head = document.createElement('div')
    head.className = 'ease-head'
    const title = document.createElement('span')
    title.textContent = OPTIONS[name]?.t ?? name
    title.title = `${OPTIONS[name]?.d ?? ''}\n[${name}]`
    const readout = document.createElement('output')
    readout.dataset.readout = name
    head.append(title, readout)

    const slider = document.createElement('input')
    slider.type = 'range'
    slider.min = String(cfg.min)
    slider.max = String(cfg.max)
    slider.step = '0.5'
    slider.value = String(saved[name] ?? cfg.pct)
    slider.dataset.option = name
    slider.dataset.dflt = String(cfg.pct)

    wrap.append(head, slider)
    host.appendChild(wrap)
  }
  refreshEaseReadouts()
}

/** Hiện % kèm số mm tuyệt đối — thợ may quan tâm mm, không quan tâm %. */
function refreshEaseReadouts() {
  let measurements
  try {
    measurements = readMeasurements()
  } catch {
    measurements = null
  }
  const opts = design().patternConfig?.options ?? {}
  for (const slider of $('ease').querySelectorAll('input[data-option]')) {
    const name = slider.dataset.option
    const pct = Number(slider.value)
    const out = $('ease').querySelector(`output[data-readout="${name}"]`)
    let text = `${pct}%`
    const toAbs = opts[name]?.toAbs
    if (measurements && typeof toAbs === 'function') {
      try {
        const mm = toAbs(pct / 100, { measurements })
        if (Number.isFinite(mm)) text += `  ≈ ${mm > 0 ? '+' : ''}${Math.round(mm)} mm`
      } catch {
        /* option không dựa trên số đo — chỉ hiện % */
      }
    }
    if (pct !== Number(slider.dataset.dflt)) text += ' •'
    out.textContent = text
  }
}

function readMeasurements() {
  const out = {}
  const bad = []
  for (const input of $('measurements').querySelectorAll('input[data-measurement]')) {
    const v = Number(input.value)
    if (!Number.isFinite(v) || v <= 0) bad.push(MEASUREMENTS[input.dataset.measurement]?.t ?? input.dataset.measurement)
    else out[input.dataset.measurement] = v
  }
  if (bad.length) throw new Error(`Thiếu hoặc sai số đo: ${bad.join(', ')}`)
  return out
}

/** Trả về { pct } cho bản ghi, và { fraction } cho freesewing. */
function readEase() {
  const pct = {}
  for (const slider of $('ease').querySelectorAll('input[data-option]')) {
    pct[slider.dataset.option] = Number(slider.value)
  }
  return pct
}

// ---------- lưu trữ ----------

function loadSaved() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function persist(key, measurements, optionsPct) {
  const all = loadSaved()
  all.measurements = { ...all.measurements, [key]: measurements }
  all.options = { ...all.options, [key]: optionsPct }
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(all))
  } catch {
    /* localStorage đầy hoặc bị chặn — không chặn việc vẽ rập */
  }
}

// ---------- vẽ rập ----------

function draft() {
  const key = $('design').value
  const measurements = readMeasurements()
  const optionsPct = readEase()
  const sa = Number($('sa').value)
  if (!Number.isFinite(sa) || sa < 0) throw new Error('Đường may (seam allowance) không hợp lệ')

  // freesewing nhận option phần trăm dưới dạng phân số: 11% -> 0.11
  const options = Object.fromEntries(Object.entries(optionsPct).map(([k, v]) => [k, v / 100]))

  const { Design } = DESIGNS[key]
  const pattern = new Design({
    measurements,
    options,
    sa,
    complete: true,
    units: 'metric',
    locale: 'vi',
  })
  pattern.use(themePlugin)
  pattern.use(i18nPlugin, { vi: SVG_STRINGS })
  const svg = pattern.draft().render()

  persist(key, measurements, optionsPct)
  lastDraft = {
    svg,
    record: {
      design: key,
      designVersion: Design.designConfig?.data?.version ?? null,
      units: 'mm',
      sa,
      measurements,
      easePct: optionsPct,
      draftedAt: new Date().toISOString(),
    },
  }
  return svg
}

function showPreview(svg) {
  $('preview').innerHTML = svg
  const el = $('preview').querySelector('svg')
  if (el) {
    // Vừa khung xem; bản in dùng SVG gốc nên không ảnh hưởng tỉ lệ 1:1.
    el.removeAttribute('width')
    el.removeAttribute('height')
    el.style.width = '100%'
    el.style.height = 'auto'
  }
}

function status(msg, isError = false) {
  const el = $('status')
  el.textContent = msg
  el.className = isError ? 'status error' : 'status ok'
}

// ---------- hành động ----------

function onDraft() {
  try {
    showPreview(draft())
    status('Đã vẽ rập. Kiểm tra cử động và canh sợi trước khi in.')
  } catch (err) {
    status(err.message, true)
  }
}

function onPrint() {
  try {
    if (!lastDraft) draft()
    const holder = document.createElement('div')
    holder.innerHTML = lastDraft.svg
    const svgEl = holder.querySelector('svg')
    if (!svgEl) throw new Error('Không tìm thấy SVG để in')
    $('print-area').replaceChildren(...tileToA4(svgEl))
    window.print()
  } catch (err) {
    status(err.message, true)
  }
}

function onSave() {
  try {
    if (!lastDraft) draft()
    const blob = new Blob([JSON.stringify(lastDraft.record, null, 2)], {
      type: 'application/json',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${lastDraft.record.design}-${lastDraft.record.draftedAt.slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    status('Đã lưu bản ghi. Giữ file này để tái tạo lại rập khi thử fit.')
  } catch (err) {
    status(err.message, true)
  }
}

function onResetEase() {
  for (const slider of $('ease').querySelectorAll('input[data-option]')) {
    slider.value = slider.dataset.dflt
  }
  refreshEaseReadouts()
  onDraft()
}

// ---------- khởi tạo ----------

const select = $('design')
for (const [key, { label }] of Object.entries(DESIGNS)) {
  const opt = document.createElement('option')
  opt.value = key
  opt.textContent = label
  select.appendChild(opt)
}

select.addEventListener('change', () => {
  buildMeasurementForm()
  buildEaseForm()
  onDraft()
})

$('measurements').addEventListener('input', refreshEaseReadouts)
$('ease').addEventListener('input', refreshEaseReadouts)
$('ease').addEventListener('change', onDraft)

$('loadSample').addEventListener('click', () => {
  const sample = DESIGNS[select.value].sample
  for (const input of $('measurements').querySelectorAll('input[data-measurement]')) {
    input.value = sample[input.dataset.measurement] ?? ''
  }
  refreshEaseReadouts()
  onDraft()
})
$('resetEase').addEventListener('click', onResetEase)
$('draft').addEventListener('click', onDraft)
$('print').addEventListener('click', onPrint)
$('save').addEventListener('click', onSave)

buildMeasurementForm()
buildEaseForm()
onDraft()
