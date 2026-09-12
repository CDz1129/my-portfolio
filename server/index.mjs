import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { networkInterfaces } from 'node:os'
import { extname, join, resolve } from 'node:path'
import { handleApi } from './handler.mjs'

const root = resolve(process.cwd(), 'dist')
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}

async function serveStatic(req, res) {
  let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
  if (pathname === '/') pathname = '/index.html'
  let filePath = join(root, pathname)
  try {
    const info = await stat(filePath)
    if (info.isDirectory()) filePath = join(filePath, 'index.html')
  } catch {
    filePath = join(root, 'index.html')
  }
  const data = await readFile(filePath)
  res.setHeader('Content-Type', types[extname(filePath)] ?? 'application/octet-stream')
  res.end(data)
}

const server = createServer(async (req, res) => {
  if (req.url?.startsWith('/api/')) {
    await handleApi(req, res)
    return
  }
  try {
    await serveStatic(req, res)
  } catch {
    res.statusCode = 404
    res.end('Not found')
  }
})

function lanAddresses() {
  const result = []
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === 'IPv4' && !address.internal) result.push(address.address)
    }
  }
  return result
}

const port = Number(process.env.PORT) || 4173
const host = process.env.HOST || '0.0.0.0'
server.listen(port, host, () => {
  console.log('')
  console.log('  Portfolio 已启动（保持此窗口开启即可一直运行）')
  console.log(`  本机访问：  http://localhost:${port}`)
  for (const ip of lanAddresses()) {
    console.log(`  局域网访问：http://${ip}:${port}   （手机连同一 WiFi 可用）`)
  }
  console.log('  行情 API：  /api/health  /api/quote  /api/quotes  /api/rates')
  console.log('  停止：      Ctrl + C')
  console.log('')
})
