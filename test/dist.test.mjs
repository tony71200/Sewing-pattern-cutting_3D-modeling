// Harness L03/L04/L10 (docs/tai-lieu-loi.md): app phải là MỘT file html mở được từ file://.
// Build thật vào thư mục tạm — không đụng dist/ của người dùng.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'vite'
import { mkdtempSync, readdirSync, readFileSync, statSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const outDir = mkdtempSync(join(tmpdir(), 'ps-dist-'))
await build({ root, logLevel: 'error', build: { outDir, emptyOutDir: true } })
const htmlPath = join(outDir, 'index.html')
const html = readFileSync(htmlPath, 'utf8')
process.on('exit', () => rmSync(outDir, { recursive: true, force: true }))

// Bỏ NỘI DUNG script/style inline (giữ thẻ) để chỉ còn thuộc tính của thẻ HTML.
const tagsOnly = html
  .replace(/(<script\b[^>]*>)[\s\S]*?(<\/script>)/gi, '$1$2')
  .replace(/(<style\b[^>]*>)[\s\S]*?(<\/style>)/gi, '$1$2')

test('build ra đúng một file index.html, không có thư mục assets', () => {
  const files = readdirSync(outDir, { recursive: true })
  assert.deepEqual(files, ['index.html'])
})

test('không thẻ nào trỏ ra ngoài: file:// chặn module/asset ngoài, offline không có CDN', () => {
  const refs = [...tagsOnly.matchAll(/\b(?:src|href)\s*=\s*["']([^"']*)["']/gi)].map((m) => m[1])
  const bad = refs.filter((r) => !r.startsWith('data:') && !r.startsWith('#'))
  assert.deepEqual(bad, [], `tham chiếu ngoài: ${bad.join(', ')}`)
})

test('CSS không tải font/ảnh từ ngoài (url() chỉ được là data:)', () => {
  const styles = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n')
  const urls = [...styles.matchAll(/url\(\s*["']?([^"')]+)/gi)].map((m) => m[1])
  const bad = urls.filter((u) => !u.startsWith('data:') && !u.startsWith('#'))
  assert.deepEqual(bad, [], `url() ngoài: ${bad.join(', ')}`)
})

test('dung lượng dưới 8 MB (S3 sẽ thêm ~3 MB dữ liệu thân)', () => {
  const mb = statSync(htmlPath).size / 2 ** 20
  assert.ok(mb < 8, `index.html ${mb.toFixed(1)} MB`)
})
