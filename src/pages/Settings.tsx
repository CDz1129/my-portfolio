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
import { useT, type Lang } from '@/i18n'
import { Button, Card, Field, Segmented, Select, TextInput } from '@/components/ui'
import type { ThemePreference } from '@/lib/theme'

export function SettingsPage() {
  const { settings } = usePortfolioData()
  const { mode, openDemo, demoHasData, resetDemo, switchToReal } = useDataMode()
  const { t, lang } = useT()
  const sync = useSync()
  const autoSyncOn = settings.autoSync !== false
  const [confirmingClear, setConfirmingClear] = useState(false)
  const [phrase, setPhrase] = useState('')
  const [cleared, setCleared] = useState(false)
  const [backupMessage, setBackupMessage] = useState('')
  const [backupError, setBackupError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const locale = lang === 'en' ? 'en-US' : 'zh-CN'
  const clearWord = t('settings.clearPlaceholder')

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
    if (phrase.trim() !== clearWord) return
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
      setBackupMessage(t('settings.backupDone'))
    } catch {
      setBackupError(t('settings.backupFailed'))
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
      if (!confirm(t('settings.restoreConfirm'))) return
      const payload = await importBackup(parsed, realDb)
      setBackupMessage(
        t('settings.restoreDone', {
          accounts: payload.accounts.length,
          transactions: payload.transactions.length,
        }),
      )
    } catch (error) {
      const key = error instanceof Error ? error.message : ''
      setBackupError(key.startsWith('backup.') ? t(key) : t('settings.restoreFailed'))
    }
  }

  return (
    <div>
      <header className="safe-top px-4 pb-3 pt-6">
        <h1 className="text-xl font-bold">{t('settings.title')}</h1>
      </header>

      <div className="space-y-4 px-4">
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">{t('settings.general')}</h2>
          <div className="space-y-3">
            <Field label={t('settings.baseCurrency')} hint={t('settings.baseCurrencyHint')}>
              <Select
                value={settings.baseCurrency}
                onChange={(e) => saveSettings({ baseCurrency: e.target.value })}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} · {t(`currency.${c.code}`)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('settings.language')}>
              <Segmented
                value={settings.language ?? 'zh'}
                size="sm"
                options={[
                  { value: 'zh', label: '中文' },
                  { value: 'en', label: 'English' },
                ]}
                onChange={(value) => saveSettings({ language: value as Lang })}
              />
            </Field>
            <Field label={t('settings.appearance')}>
              <Segmented
                value={settings.theme}
                size="sm"
                options={[
                  { value: 'system', label: t('settings.theme.system') },
                  { value: 'light', label: t('settings.theme.light') },
                  { value: 'dark', label: t('settings.theme.dark') },
                ]}
                onChange={(theme) => saveSettings({ theme: theme as ThemePreference })}
              />
            </Field>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="mb-1 text-sm font-semibold">{t('settings.marketUpdates')}</h2>
          <p className="mb-3 text-[11px] text-slate-400">{t('settings.marketUpdatesHint')}</p>
          <Field label={t('settings.autoFrequency')}>
            <Select
              value={autoSyncOn ? String(settings.syncIntervalDays ?? 90) : '0'}
              onChange={(e) => changeFrequency(e.target.value)}
            >
              <option value="1">{t('settings.freq.daily')}</option>
              <option value="7">{t('settings.freq.weekly')}</option>
              <option value="30">{t('settings.freq.monthly')}</option>
              <option value="90">{t('settings.freq.quarterly')}</option>
              <option value="0">{t('settings.freq.never')}</option>
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
              {sync.loading ? t('settings.updating') : t('settings.updateNow')}
            </Button>
            {(sync.message || sync.error) && (
              <p className={`text-[11px] ${sync.error ? 'text-rose-500' : 'text-emerald-500'}`}>
                {sync.error ?? sync.message}
              </p>
            )}
            <p className="text-[11px] text-slate-400">
              {settings.lastSyncAt
                ? t('settings.lastSync', {
                    time: new Date(settings.lastSyncAt).toLocaleString(locale),
                  })
                : t('settings.neverSynced')}
            </p>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="mb-1 text-sm font-semibold">{t('settings.rates')}</h2>
          <p className="mb-3 text-[11px] text-slate-400">
            {t('settings.ratesHint', { base: settings.baseCurrency })}
            {settings.ratesUpdatedAt
              ? ` · ${new Date(settings.ratesUpdatedAt).toLocaleString(locale)}`
              : ''}
          </p>
          {rateCurrencies.length === 0 ? (
            <p className="text-[11px] text-slate-400">{t('settings.noForeign')}</p>
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
          <h2 className="mb-1 text-sm font-semibold">{t('settings.myData')}</h2>
          <p className="mb-3 text-[11px] text-slate-400">
            {t('settings.dataCounts', {
              view: t(mode === 'demo' ? 'settings.view.demo' : 'settings.view.real'),
              accounts: realAccounts,
              holdings: realHoldings,
              transactions: realTransactions,
              groups: realGroups,
            })}
          </p>
          <div className="space-y-2">
            <Button variant="secondary" className="w-full" onClick={handleExport}>
              <Download size={15} /> {t('settings.exportCsv')}
            </Button>
            {mode === 'real' && realAccounts === 0 && (
              <Button variant="secondary" className="w-full" onClick={() => void openDemo()}>
                <Eye size={15} /> {t('settings.viewDemo')}
              </Button>
            )}
            {demoHasData && (
              <Button variant="ghost" className="w-full" onClick={() => void resetDemo()}>
                {t('settings.resetDemo')}
              </Button>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-rose-200 p-3 dark:border-rose-900/50">
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
              {t('settings.danger')}
            </p>
            <p className="mb-2 mt-0.5 text-[11px] text-slate-400">{t('settings.dangerHint')}</p>
            {confirmingClear ? (
              <div className="space-y-2">
                <p className="text-[11px] text-slate-500">{t('settings.clearConfirmLabel')}</p>
                <TextInput
                  value={phrase}
                  onChange={(e) => setPhrase(e.target.value)}
                  placeholder={clearWord}
                />
                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    className="flex-1"
                    disabled={phrase.trim() !== clearWord}
                    onClick={handleClear}
                  >
                    {t('settings.clearButton')}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setConfirmingClear(false)
                      setPhrase('')
                    }}
                  >
                    {t('common.cancel')}
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="danger" className="w-full" onClick={() => setConfirmingClear(true)}>
                <Trash2 size={15} /> {t('settings.clearAll')}
              </Button>
            )}
            {cleared && (
              <p className="mt-2 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                {t('settings.clearedMsg')}
              </p>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="mb-1 text-sm font-semibold">{t('settings.backup')}</h2>
          <p className="mb-3 text-[11px] text-slate-400">{t('settings.backupHint')}</p>
          <div className="space-y-2">
            <Button variant="secondary" className="w-full" onClick={handleBackup}>
              <Download size={15} /> {t('settings.exportBackup')}
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={15} /> {t('settings.restoreBackup')}
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
          <h2 className="mb-2 text-sm font-semibold">{t('settings.about')}</h2>
          <p className="text-xs leading-relaxed text-slate-400">{t('settings.aboutBody')}</p>
          <p className="mt-2 text-[11px] text-slate-400">My Portfolio v0.1.0</p>
        </Card>
      </div>
    </div>
  )
}
