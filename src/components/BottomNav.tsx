import { NavLink } from 'react-router-dom'
import { Home, Wallet, ListOrdered, LineChart, Settings2 } from 'lucide-react'
import { cn } from '@/lib/cn'

const items = [
  { to: '/', label: '首页', icon: Home, end: true },
  { to: '/accounts', label: '账户', icon: Wallet },
  { to: '/transactions', label: '流水', icon: ListOrdered },
  { to: '/trends', label: '趋势', icon: LineChart },
  { to: '/settings', label: '设置', icon: Settings2 },
]

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-center">
      <div className="safe-bottom w-full max-w-md border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="flex">
          {items.map(({ to, label, icon: Icon, end }) => (
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
              {label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}
