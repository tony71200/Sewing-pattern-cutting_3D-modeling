// Harness L03 (docs/tai-lieu-loi.md): mở dist/index.html bằng file:// trong Chrome/Edge
// headless, xác nhận rập vẽ ra và console không có lỗi. node --test không làm được việc
// này: nó không có trình duyệt, nên không thấy được lệnh chặn module/fetch của file://.
// Thoát: 0 xanh · 1 đỏ · 2 bỏ qua (không có trình duyệt) — 2 KHÔNG phải xanh.
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const html = fileURLToPath(new URL('../dist/index.html', import.meta.url))
if (!existsSync(html)) {
  console.error('DO: chua co dist/index.html. Chay: npm run build')
  process.exit(1)
}

const browser = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find(existsSync)
if (!browser) {
  console.log('BO QUA: khong thay Chrome/Edge. Smoke CHUA chay - khong phai xanh.')
  process.exit(2)
}

const profile = mkdtempSync(join(tmpdir(), 'ps-smoke-'))
const r = spawnSync(
  browser,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    `--user-data-dir=${profile}`,
    '--enable-logging=stderr',
    '--v=0',
    '--virtual-time-budget=8000',
    '--dump-dom',
    pathToFileURL(html).href,
  ],
  { encoding: 'utf8', maxBuffer: 256 * 2 ** 20, timeout: 120_000 },
)
rmSync(profile, { recursive: true, force: true })

const problems = []
const preview = r.stdout.match(/<section id="preview"[^>]*>([\s\S]*?)<\/section>/)
if (!preview) problems.push('khong thay #preview trong DOM (app khong chay?)')
else if (!preview[1].includes('<svg')) problems.push('#preview khong co <svg>: rap khong ve ra')
const errors = (r.stderr || '').split('\n').filter((l) => /Uncaught|CONSOLE\(\d+\)\].*Error/i.test(l))
problems.push(...errors.map((l) => `console: ${l.trim()}`))

if (problems.length) {
  console.error(`DO (${browser}):\n  ` + problems.join('\n  '))
  process.exit(1)
}
console.log(`XANH: dist/index.html mo tu file:// ve ra rap, console sach (${browser})`)
