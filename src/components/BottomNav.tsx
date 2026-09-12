import { NavLink } from 'react-router-dom'
import { Home, Wallet, ListOrdered, LineChart, Settings2 } from 'lucide-react'
import { useT } from '@/i18n'
import { cn } from '@/lib/cn'

const items = [
  { to: '/', labelKey: 'nav.home', icon: Home, end: true },
  { to: '/accounts', labelKey: 'nav.accounts', icon: Wallet },
  { to: '/transactions', labelKey: 'nav.transactions', icon: ListOrdered },
  { to: '/trends', labelKey: 'nav.trends', icon: LineChart },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings2 },
]

export function BottomNav() {
  const { t } = useT()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-center">
      <div className="safe-bottom w-full max-w-md border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="flex">
          {items.map(({ to, labelKey, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
                  isActive
                    ? 'text-brand-600 dark:text-brand-400'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200',
                )
              }
            >
              <Icon size={20} />
              {t(labelKey)}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}
