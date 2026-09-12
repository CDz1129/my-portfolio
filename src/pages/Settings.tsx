import { useMemo, useRef, useState } from 'react'
import { Download, Eye, RefreshCw, Trash2, Upload } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { usePortfolioData } from '@/store/usePortfolio'
import { useDataMode } from '@/store/DataMode'
import { useSync } from '@/store/useSync'
import {
  saveSettings,
  exportCsv,
  clearAllData,
  exportBackup,
  importBackup,
} from '@/db/repository'
import { db as realDb } from '@/db/database'
import { CURRENCIES } from '@/domain/currency'
import { Button, Card, Field, Segmented, Select, TextInput } from '@/components/ui'
import type { ThemePreference } from '@/lib/theme'

export function SettingsPage() {
  const { settings } = usePortfolioData()
  const { mode, openDemo, demoHasData, resetDemo, switchToReal } = useDataMode()
  const sync = useSync()
  const autoSyncOn = settings.autoSync !== false
  const [confirmingClear, setConfirmingClear] = useState(false)
  const [phrase, setPhrase] = useState('')
  const [cleared, setCleared] = useState(false)
  const [backupMessage, setBackupMessage] = useState('')
  const [backupError, setBackupError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const realAccounts = useLiveQuery(() => realDb.accounts.count(), [], 0)
  const realHoldings = useLiveQuery(() => realDb.holdings.count(), [], 0)
  const realTransactions = useLiveQuery(() => realDb.transactions.count(), [], 0)
  const realGroups = useLiveQuery(() => realDb.groups.count(), [], 0)
  const realAccountRows = useLiveQuery(() => realDb.accounts.toArray(), [], [])
  const realHoldingRows = useLiveQuery(() => realDb.holdings.toArray(), [], [])

  const rateCurrencies = useMemo(() => {
    const used = new Set<string>([settings.baseCurrency])
    for (const a of realAccountRows) used.add(a.currency)
    for (const h of realHoldingRows) used.add(h.currency)
    return CURRENCIES.filter((c) => c.code !== settings.baseCurrency && used.has(c.code))
  }, [realAccountRows, realHoldingRows, settings.baseCurrency])

  async function updateRate(code: string, value: number) {
    await saveSettings({ rates: { ...settings.rates, [code]: value }, ratesUpdatedAt: Date.now() })
  }

  function changeFrequency(value: string) {
    const days = Number(value)
    if (!days) void saveSettings({ autoSync: false })
    else void saveSettings({ autoSync: true, syncIntervalDays: days })
  }

  async function handleExport() {
    const csv = await exportCsv()
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `portfolio-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleClear() {
    if (phrase.trim() !== '清空') return
    await clearAllData()
    // Stay on the (now empty) real account instead of falling back to demo.
    await switchToReal()
    setPhrase('')
    setConfirmingClear(false)
    setCleared(true)
  }

  async function handleBackup() {
    setBackupError('')
    setBackupMessage('')
    try {
      const payload = await exportBackup(realDb)
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `my-portfolio-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setBackupMessage('已导出备份文件')
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : '导出失败')
    }
  }

  async function handleRestoreFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBackupError('')
    setBackupMessage('')
    try {
      const parsed = JSON.parse(await file.text())
      if (!confirm('恢复备份会覆盖当前全部数据，确定继续？')) return
      const payload = await importBackup(parsed, realDb)
      setBackupMessage(
        `已恢复 ${payload.accounts.length} 个账户、${payload.transactions.length} 笔流水`,
      )
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : '恢复失败')
    }
  }

  return (
    <div>
      <header className="safe-top px-4 pb-3 pt-6">
        <h1 className="text-xl font-bold">设置</h1>
      </header>

      <div className="space-y-4 px-4">
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">通用</h2>
          <div className="space-y-3">
            <Field label="主货币" hint="所有资产将换算为该货币显示">
              <Select
                value={settings.baseCurrency}
                onChange={(e) => saveSettings({ baseCurrency: e.target.value })}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} · {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="外观">
              <Segmented
                value={settings.theme}
                size="sm"
                options={[
                  { value: 'system', label: '跟随系统' },
                  { value: 'light', label: '浅色' },
                  { value: 'dark', label: '深色' },
                ]}
                onChange={(theme) => saveSettings({ theme: theme as ThemePreference })}
              />
            </Field>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="mb-1 text-sm font-semibold">行情更新</h2>
          <p className="mb-3 text-[11px] text-slate-400">
            投资看长期，自动更新默认每季度一次，避免频繁波动干扰。随时可手动更新。
          </p>
          <Field label="自动更新频率">
            <Select
              value={autoSyncOn ? String(settings.syncIntervalDays ?? 90) : '0'}
              onChange={(e) => changeFrequency(e.target.value)}
            >
              <option value="1">每天</option>
              <option value="7">每周</option>
              <option value="30">每月</option>
              <option value="90">每季度</option>
              <option value="0">从不自动更新</option>
            </Select>
          </Field>
          <div className="mt-3 space-y-2">
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => sync.run()}
              disabled={sync.loading}
            >
              <RefreshCw size={15} className={sync.loading ? 'animate-spin' : ''} />
              {sync.loading ? '更新中…' : '立即更新股价与汇率'}
            </Button>
            {(sync.message || sync.error) && (
              <p className={`text-[11px] ${sync.error ? 'text-rose-500' : 'text-emerald-500'}`}>
                {sync.error ?? sync.message}
              </p>
            )}
            <p className="text-[11px] text-slate-400">
              {settings.lastSyncAt
                ? `最近同步：${new Date(settings.lastSyncAt).toLocaleString('zh-CN')}`
                : '尚未同步过'}
            </p>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="mb-1 text-sm font-semibold">汇率</h2>
          <p className="mb-3 text-[11px] text-slate-400">
            用于把外币资产换算成主货币 {settings.baseCurrency}，仅在总资产、配置、趋势的计算中使用。
            {settings.ratesUpdatedAt
              ? ` · 更新于 ${new Date(settings.ratesUpdatedAt).toLocaleString('zh-CN')}`
              : ''}
          </p>
          {rateCurrencies.length === 0 ? (
            <p className="text-[11px] text-slate-400">
              你当前没有外币账户或持仓，无需设置汇率。
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {rateCurrencies.map((c) => (
                <Field key={c.code} label={`1 ${c.code} = ? ${settings.baseCurrency}`}>
                  <TextInput
                    type="number"
                    inputMode="decimal"
                    defaultValue={settings.rates[c.code] ?? ''}
                    onBlur={(e) => updateRate(c.code, Number(e.target.value) || 0)}
                  />
                </Field>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="mb-1 text-sm font-semibold">我的数据</h2>
          <p className="mb-3 text-[11px] text-slate-400">
            当前视图：{mode === 'demo' ? '演示数据' : '我的账户'} · {realAccounts} 个账户 ·{' '}
            {realHoldings} 项持仓 · {realTransactions} 笔流水 · {realGroups} 个分组
          </p>
          <div className="space-y-2">
            <Button variant="secondary" className="w-full" onClick={handleExport}>
              <Download size={15} /> 导出我的数据 (CSV)
            </Button>
            {mode === 'real' && realAccounts === 0 && (
              <Button variant="secondary" className="w-full" onClick={() => void openDemo()}>
                <Eye size={15} /> 查看演示数据
              </Button>
            )}
            {demoHasData && (
              <Button variant="ghost" className="w-full" onClick={() => void resetDemo()}>
                重置演示数据
              </Button>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-rose-200 p-3 dark:border-rose-900/50">
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">危险操作</p>
            <p className="mb-2 mt-0.5 text-[11px] text-slate-400">
              永久删除你的全部账户与流水，不可撤销。演示数据不受影响。
            </p>
            {confirmingClear ? (
              <div className="space-y-2">
                <p className="text-[11px] text-slate-500">
                  请输入「清空」二字以确认：
                </p>
                <TextInput
                  value={phrase}
                  onChange={(e) => setPhrase(e.target.value)}
                  placeholder="清空"
                />
                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    className="flex-1"
                    disabled={phrase.trim() !== '清空'}
                    onClick={handleClear}
                  >
                    确认清空
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setConfirmingClear(false)
                      setPhrase('')
                    }}
                  >
                    取消
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="danger" className="w-full" onClick={() => setConfirmingClear(true)}>
                <Trash2 size={15} /> 清空我的所有数据
              </Button>
            )}
            {cleared && (
              <p className="mt-2 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                已清空你的全部数据。演示数据未受影响。
              </p>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="mb-1 text-sm font-semibold">备份与恢复</h2>
          <p className="mb-3 text-[11px] text-slate-400">
            把全部账户、持仓、流水与设置导出为一个 JSON 文件，可用于迁移到其他设备或留档。
            恢复会覆盖当前数据。
          </p>
          <div className="space-y-2">
            <Button variant="secondary" className="w-full" onClick={handleBackup}>
              <Download size={15} /> 导出备份 (JSON)
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={15} /> 从备份恢复
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleRestoreFile}
            />
            {backupMessage && (
              <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                {backupMessage}
              </p>
            )}
            {backupError && <p className="text-[11px] text-rose-500">{backupError}</p>}
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="mb-2 text-sm font-semibold">关于</h2>
          <p className="text-xs leading-relaxed text-slate-400">
            本地优先的个人资产管理工具。数据仅保存在此浏览器的 IndexedDB 中，不会上传服务器。
            参考 Percento 的记账理念：只记录重要变动，用资产负债表掌握全局。
          </p>
          <p className="mt-2 text-[11px] text-slate-400">My Portfolio v0.1.0</p>
        </Card>
      </div>
    </div>
  )
}
