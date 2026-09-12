#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const label = 'com.myportfolio.local'
const plistPath = join(homedir(), 'Library', 'LaunchAgents', `${label}.plist`)
const uid = process.getuid()

const launchctl = (args) => spawnSync('launchctl', args, { encoding: 'utf8' })
launchctl(['bootout', `gui/${uid}`, plistPath])
launchctl(['unload', plistPath])

if (existsSync(plistPath)) {
  rmSync(plistPath)
  console.log(`已删除 ${plistPath}`)
}
console.log('后台服务已停止并卸载。之后可用 npm start 手动运行。')
