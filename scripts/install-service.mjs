#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectDir = resolve(fileURLToPath(new URL('..', import.meta.url)))
const label = 'com.myportfolio.local'
const port = process.env.PORT || '4173'
const nodePath = process.execPath
const serverEntry = join(projectDir, 'server', 'index.mjs')
const logsDir = join(projectDir, 'logs')
const launchAgentsDir = join(homedir(), 'Library', 'LaunchAgents')
const plistPath = join(launchAgentsDir, `${label}.plist`)
const uid = process.getuid()

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

if (!existsSync(join(projectDir, 'dist', 'index.html'))) {
  console.log('未检测到构建产物，正在执行 npm run build …')
  execFileSync('npm', ['run', 'build'], { cwd: projectDir, stdio: 'inherit' })
}

mkdirSync(logsDir, { recursive: true })
mkdirSync(launchAgentsDir, { recursive: true })

const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${esc(label)}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${esc(nodePath)}</string>
    <string>${esc(serverEntry)}</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${esc(projectDir)}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PORT</key>
    <string>${esc(port)}</string>
    <key>HOST</key>
    <string>0.0.0.0</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${esc(join(logsDir, 'server.out.log'))}</string>
  <key>StandardErrorPath</key>
  <string>${esc(join(logsDir, 'server.err.log'))}</string>
</dict>
</plist>
`

writeFileSync(plistPath, plist, 'utf8')
console.log(`已写入 LaunchAgent：${plistPath}`)

const launchctl = (args) => spawnSync('launchctl', args, { encoding: 'utf8' })
launchctl(['bootout', `gui/${uid}`, plistPath])
const boot = launchctl(['bootstrap', `gui/${uid}`, plistPath])
if (boot.status !== 0) {
  const load = launchctl(['load', plistPath])
  if (load.status !== 0) {
    console.error('启动失败：', boot.stderr || boot.stdout, load.stderr || load.stdout)
    process.exit(1)
  }
}

const status = launchctl(['print', `gui/${uid}/${label}`])
console.log(status.status === 0 ? '服务已加载并开始运行。' : '服务已提交，但未能读取状态。')
console.log('')
console.log(`  打开：      http://localhost:${port}`)
console.log(`  查看日志：  ${join(logsDir, 'server.out.log')}`)
console.log(`  停止/卸载： npm run service:uninstall`)
console.log('')
