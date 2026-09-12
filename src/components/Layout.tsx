import { useState, type ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { BottomNav } from './BottomNav'
import { ModeBar } from './ModeBar'
import { QuickAdd } from './QuickAdd'
import { useT } from '@/i18n'

export function Layout({ children }: { children: ReactNode }) {
  const [addOpen, setAddOpen] = useState(false)
  const { t } = useT()

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col bg-slate-100 dark:bg-slate-950">
      <main className="flex-1 pb-28">
        <ModeBar />
        {children}
      </main>

      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 flex justify-center">
        <div className="flex w-full max-w-md justify-end pr-5">
          <button
            type="button"
            aria-label={t('common.add')}
            onClick={() => setAddOpen(true)}
            className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg shadow-brand-600/30 transition-transform active:scale-95"
          >
            <Plus size={26} />
          </button>
        </div>
      </div>

      <BottomNav />
      <QuickAdd open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}
