// Harness L02 + L05 (docs/tai-lieu-loi.md): những cách khởi động người dùng thật sự bấm.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

test('L02: npm run service dùng python trong .venv, không phải python hệ thống', () => {
  assert.match(pkg.scripts.service, /\.venv[\\/]+Scripts[\\/]+python/i)
})

const bats = readdirSync(root).filter((f) => /\.bat$/i.test(f))

test('có RunApp.bat ở gốc repo', () => {
  assert.ok(bats.includes('RunApp.bat'), `chỉ thấy: ${bats.join(', ')}`)
})

for (const name of bats) {
  test(`L05: ${name} thuần ASCII, CRLF, không gọi chcp`, () => {
    const bytes = readFileSync(join(root, name))
    const nonAscii = [...bytes].findIndex((b) => b > 127)
    assert.equal(nonAscii, -1, `byte ngoài ASCII tại vị trí ${nonAscii}`)
    const lines = bytes.toString('latin1').split('\n')
    const lfOnly = lines.slice(0, -1).findIndex((l) => !l.endsWith('\r'))
    assert.equal(lfOnly, -1, `dòng ${lfOnly + 1} kết thúc LF, cmd cần CRLF`)
    const chcp = lines.findIndex((l) => !/^\s*(rem\b|::)/i.test(l) && /\bchcp\b/i.test(l))
    assert.equal(chcp, -1, `dòng ${chcp + 1} gọi chcp`)
  })
}
