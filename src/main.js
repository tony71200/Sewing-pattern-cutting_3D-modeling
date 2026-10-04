import { Bella } from '@freesewing/bella'
import { Brian } from '@freesewing/brian'
import { themePlugin } from '@freesewing/plugin-theme'
import { i18nPlugin } from '@freesewing/plugin-i18n'
import { cisFemaleAdult38, cisMaleAdult38 } from '@freesewing/models'
import { tileToA4 } from './tile.js'
import { MEASUREMENTS, OPTIONS, SVG_STRINGS, UI, RECORD } from './vi.js'
import { getState, setState, setMeasurement, subscribe, save, load, recordToState } from './store.js'
import { initView3d } from './view3d.js'
import { parseFit, solveTargets, predictMeasurements, serviceBase } from './body3d.js'
import { estimate, SAMPLES } from './estimate.js'

const DESIGNS = {
  bella: { label: 'Bella — block thân nữ', Design: Bella, sample: cisFemaleAdult38 },
  brian: { label: 'Brian — block thân nam', Design: Brian, sample: cisMaleAdult38 },
}

const $ = (id) => document.getElementById(id)

let lastDraft = null // { svg, record }

// ---------- cấu hình lấy từ chính pattern config ----------

const design = () => DESIGNS[getState().design].Design

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

/** Số đo mẫu, CHỈ những cái block đang chọn cần tới. */
function sampleFor(key) {
  const sample = DESIGNS[key].sample
  const need = DESIGNS[key].Design.patternConfig?.measurements ?? []
  return Object.fromEntries(need.map((n) => [n, sample[n]]))
}

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
  const { measurements } = getState()
  const host = $('measurements')
  host.replaceChildren()
  for (const name of requiredMeasurements()) {
    const input = document.createElement('input')
    input.type = 'number'
    input.step = unitOf(name) === '°' ? '0.5' : '1'
    input.min = '0'
    input.dataset.measurement = name
    input.value = measurements[name] ?? ''
    const m = MEASUREMENTS[name]
    host.appendChild(
      field(`${m?.t ?? name} (${unitOf(name)})`, m?.d ? `${m.d}\n[${name}]` : name, input)
    )
  }
}

function buildEaseForm() {
  const { easePct } = getState()
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
    slider.value = String(easePct[name] ?? cfg.pct)
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

/** Số đo ma-nơ-canh 3D cần mà block không dùng tới. */
function bodyOnlyMeasurements() {
  const key = getState().design
  const used = new Set(DESIGNS[key].Design.patternConfig?.measurements ?? [])
  return Object.keys(SAMPLES[key])
    .filter((n) => !used.has(n))
    .sort((a, b) => (MEASUREMENTS[a]?.t ?? a).localeCompare(MEASUREMENTS[b]?.t ?? b, 'vi'))
}

function buildBodyForm() {
  const key = getState().design
  const { measurements: fullSet, estimated } = estimate(getState().measurements, SAMPLES[key])
  const host = $('bodyMeasurements')
  host.replaceChildren()

  for (const name of bodyOnlyMeasurements()) {
    const input = document.createElement('input')
    input.type = 'number'
    input.step = unitOf(name) === '°' ? '0.5' : '1'
    input.min = '0'
    input.dataset.measurement = name
    input.value = fullSet[name] ?? ''

    const m = MEASUREMENTS[name]
    const row = field(`${m?.t ?? name} (${unitOf(name)})`, m?.d ? `${m.d}\n[${name}]` : name, input)

    if (estimated.includes(name)) {
      row.classList.add('is-estimated')
      row.title = UI.estimatedHint
      const tag = document.createElement('span')
      tag.className = 'est-tag'
      tag.textContent = UI.estimated
      row.querySelector('span').appendChild(tag)
    }
    host.appendChild(row)
  }
}

/** Đọc từ store, không đọc ngược từ DOM. */
function readMeasurements() {
  const { measurements } = getState()
  const bad = []
  for (const name of design().patternConfig?.measurements ?? []) {
    const v = measurements[name]
    if (!Number.isFinite(v) || v <= 0) bad.push(MEASUREMENTS[name]?.t ?? name)
  }
  if (bad.length) throw new Error(`Thiếu hoặc sai số đo: ${bad.join(', ')}`)
  return measurements
}

// ---------- vẽ rập ----------

function draft() {
  const { design: key, easePct, sa } = getState()
  const measurements = readMeasurements()
  if (!Number.isFinite(sa) || sa < 0) throw new Error('Đường may (seam allowance) không hợp lệ')

  // freesewing nhận option phần trăm dưới dạng phân số: 11% -> 0.11
  const options = Object.fromEntries(Object.entries(easePct).map(([k, v]) => [k, v / 100]))

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

  lastDraft = {
    svg,
    record: {
      design: key,
      designVersion: Design.designConfig?.data?.version ?? null,
      units: 'mm',
      sa,
      measurements,
      easePct,
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

async function onOpenFile(e) {
  const file = e.target.files?.[0]
  e.target.value = '' // chọn lại đúng file đó vẫn phải bắn 'change'
  if (!file) return
  try {
    let record
    try {
      record = JSON.parse(await file.text())
    } catch {
      throw new Error(RECORD.notRecord)
    }
    setState(recordToState(record, Object.keys(DESIGNS)))
    select.value = getState().design
    $('sa').value = String(getState().sa)
    buildMeasurementForm()
    buildBodyForm()
    buildEaseForm()
    showPreview(draft())
    const now = lastDraft.record.designVersion
    let msg = RECORD.loaded(file.name)
    if (record.designVersion && record.designVersion !== now) {
      msg += RECORD.versionDiffers(record.designVersion, now)
    }
    status(msg)
  } catch (err) {
    status(err.message, true)
  }
}

function onResetEase() {
  const easePct = {}
  for (const slider of $('ease').querySelectorAll('input[data-option]')) {
    slider.value = slider.dataset.dflt
    easePct[slider.dataset.option] = Number(slider.dataset.dflt)
  }
  setState({ easePct })
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
  setState({ design: select.value })
  buildMeasurementForm()
  buildBodyForm()
  buildEaseForm()
  onDraft()
})

$('bodyMeasurements').addEventListener('input', (e) => {
  const name = e.target.dataset?.measurement
  if (!name) return
  setMeasurement(name, Number(e.target.value))
  const row = e.target.closest('.row')
  row?.classList.remove('is-estimated')
  row?.querySelector('.est-tag')?.remove()
})

$('measurements').addEventListener('input', (e) => {
  const name = e.target.dataset?.measurement
  if (!name) return
  setMeasurement(name, Number(e.target.value))
  refreshEaseReadouts()
})

$('ease').addEventListener('input', (e) => {
  const name = e.target.dataset?.option
  if (!name) return
  setState({ easePct: { ...getState().easePct, [name]: Number(e.target.value) } })
  refreshEaseReadouts()
})
$('ease').addEventListener('change', onDraft)

$('sa').addEventListener('input', (e) => setState({ sa: Number(e.target.value) }))

$('loadSample').addEventListener('click', () => {
  setState({ measurements: { ...getState().measurements, ...sampleFor(getState().design) } })
  buildMeasurementForm()
  refreshEaseReadouts()
  onDraft()
})
$('resetEase').addEventListener('click', onResetEase)
$('draft').addEventListener('click', onDraft)
$('print').addEventListener('click', onPrint)
$('save').addEventListener('click', onSave)
$('open').textContent = RECORD.open
$('open').addEventListener('click', () => $('openFile').click())
$('openFile').addEventListener('change', onOpenFile)

// ---------- thân 3D ----------

let view3d = null
let fit = null
let fitAbort = null

function setBodyStatus(msg, isError = false) {
  const el = $('bodyStatus')
  if (!el) return
  el.textContent = msg
  el.className = isError ? 'status error' : 'status ok'
}

/**
 * Gọi service. CHỈ khi phenotype có thể đã đổi (đổi block, bấm dựng lại) — không gọi khi
 * kéo thanh trượt số đo, vì đó là lúc phải mượt.
 */
async function refetchBody() {
  if (!view3d) return
  fitAbort?.abort()
  fitAbort = new AbortController()
  setBodyStatus(UI.bodyFitting)
  try {
    const res = await fetch(`${serviceBase(location.protocol)}/api/fit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ design: getState().design, measurements: getState().measurements }),
      signal: fitAbort.signal,
    })
    if (!res.ok) throw new Error(`service tra ${res.status}`)
    fit = parseFit(await res.arrayBuffer())
    view3d.setFit(fit)
    renderResidualTable()
    setBodyStatus(UI.bodyReady)
  } catch (err) {
    if (err.name === 'AbortError') return
    fit = null
    setBodyStatus(`${UI.bodyOffline}: ${err.message}`, true)
  }
}

const RESIDUAL_LIMIT_MM = 5

/**
 * Bảng lệch. BẮT BUỘC, không phải tuỳ chọn: một thân trông đúng mà số đo sai âm thầm là
 * rập sai. Service được phép không khớp số đo, nhưng phải nói ra chỗ nào không khớp.
 */
function renderResidualTable(targets = null) {
  const host = $('residuals')
  if (!host) return
  host.replaceChildren()
  if (!fit) return

  const t = targets ?? fit.header.names.map((n) => fit.header.targetValues[n])
  const got = predictMeasurements(fit.header, t)
  const want = getState().measurements

  const head = document.createElement('tr')
  for (const label of ['', UI.colWant, UI.colGot, UI.colDiff]) {
    const th = document.createElement('th')
    th.textContent = label
    head.appendChild(th)
  }
  host.appendChild(head)

  for (const name of fit.header.names) {
    const w = want[name] ?? fit.header.want[name]
    const g = got[name]
    const d = g - w
    const tr = document.createElement('tr')
    if (Math.abs(d) > RESIDUAL_LIMIT_MM) tr.className = 'off'
    for (const text of [
      MEASUREMENTS[name]?.t ?? name,
      Math.round(w),
      Math.round(g),
      `${d > 0 ? '+' : ''}${Math.round(d)}`,
    ]) {
      const td = document.createElement('td')
      td.textContent = text
      tr.appendChild(td)
    }
    host.appendChild(tr)
  }
}

/** Số đo đổi mà phenotype chưa cần đổi: giải lại target ngay trong browser. */
function refreshBodyLocal() {
  if (!fit || !view3d) return
  const t = solveTargets(fit.header, getState().measurements)
  view3d.setTargets(t)
  renderResidualTable(t)
}

for (const btn of document.querySelectorAll('#tabs button')) {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab
    for (const b of document.querySelectorAll('#tabs button')) {
      b.classList.toggle('active', b === btn)
    }
    $('preview').hidden = tab !== 'pattern'
    $('body3d').hidden = tab !== 'body'
    if (tab === 'body') {
      if (!view3d) view3d = initView3d($('body3d'))
      view3d.resize()
      if (!fit) refetchBody()
      else refreshBodyLocal()
    }
  })
}

subscribe(refreshBodyLocal)

$('rebuildBody').addEventListener('click', refetchBody)
$('rebuildBody').textContent = UI.rebuild
$('residualNote').textContent = UI.residualNote

load()
if (!Object.keys(getState().measurements).length) {
  // Chỉ mồi những số đo BLOCK cần. Chép cả 38 số của mẫu thì estimate() không
  // còn gì để suy, nhãn "ước lượng" không bao giờ hiện, và số máy đoán bị trình
  // bày y như số người dùng tự đo.
  setState({ measurements: sampleFor(getState().design) })
}
select.value = getState().design
$('sa').value = String(getState().sa)
buildMeasurementForm()
buildBodyForm()
buildEaseForm()
subscribe(save)
onDraft()
