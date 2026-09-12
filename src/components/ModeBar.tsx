import { FlaskConical, Wallet } from 'lucide-react'
import { useDataMode } from '@/store/DataMode'

export function ModeBar() {
  const { mode, switchToReal, openDemo } = useDataMode()

  if (mode === 'demo') {
    return (
      <div className="flex items-center gap-2 bg-amber-100 px-4 py-1.5 text-[11px] text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
        <FlaskConical size={13} className="shrink-0" />
        <span className="flex-1 font-medium">演示数据 · 与你的账户完全隔离</span>
        <button
          type="button"
          onClick={() => void switchToReal()}
          className="shrink-0 rounded-lg bg-amber-500 px-2.5 py-1 font-semibold text-white hover:bg-amber-400"
        >
          切换到我的账户
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 bg-slate-100 px-4 py-1.5 text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
      <Wallet size={13} className="shrink-0" />
      <span className="flex-1">当前：我的账户</span>
      <button
        type="button"
        onClick={() => void openDemo()}
        className="shrink-0 rounded-lg border border-slate-300 px-2.5 py-1 font-medium hover:bg-slate-200 dark:border-slate-600 dark:hover:bg-slate-700"
      >
        查看演示数据
      </button>
    </div>
  )
}
