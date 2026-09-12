import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const { pathname: root } = new URL('../', import.meta.url)
const outDir = resolve(root, 'public')
mkdirSync(outDir, { recursive: true })

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crc])
}

function makePng(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  const cx = size / 2
  const corner = size * 0.22
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const offset = y * (size * 4 + 1) + 1 + x * 4
      const t = (x + y) / (2 * size)
      let r = Math.round(99 + (67 - 99) * t)
      let g = Math.round(102 + (56 - 102) * t)
      let b = Math.round(241 + (202 - 241) * t)
      // rounded corners -> transparent
      const dx = Math.max(corner - x, x - (size - corner), 0)
      const dy = Math.max(corner - y, y - (size - corner), 0)
      if (dx * dx + dy * dy > corner * corner) {
        raw[offset] = 0
        raw[offset + 1] = 0
        raw[offset + 2] = 0
        raw[offset + 3] = 0
        continue
      }
      // white ring emblem
      const d = Math.hypot(x - cx, y - cx)
      const ring = Math.abs(d - size * 0.24) < size * 0.035
      const bar = x > cx - size * 0.11 && x < cx + size * 0.11 && y > cx - size * 0.18 && y < cx + size * 0.18
      const dot = d < size * 0.06
      if (ring || bar || dot) {
        r = 255
        g = 255
        b = 255
      }
      raw[offset] = r
      raw[offset + 1] = g
      raw[offset + 2] = b
      raw[offset + 3] = 255
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

writeFileSync(resolve(outDir, 'icon-192.png'), makePng(192))
writeFileSync(resolve(outDir, 'icon-512.png'), makePng(512))
writeFileSync(resolve(outDir, 'apple-touch-icon.png'), makePng(180))
console.log('icons generated in', outDir)
