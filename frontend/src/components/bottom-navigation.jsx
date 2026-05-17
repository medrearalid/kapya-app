import { CalendarDays, ChefHat, House, Settings2, Wallet } from 'lucide-react'
import { motion } from 'framer-motion'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'

const navItems = [
  {
    to: '/',
    labelKey: 'navigation.pantry',
    Icon: House,
    exact: true,
  },
  {
    to: '/recipes',
    labelKey: 'navigation.recipes',
    Icon: ChefHat,
    exact: false,
  },
  {
    to: '/planner',
    labelKey: 'navigation.planner',
    Icon: CalendarDays,
    exact: false,
  },
  {
    to: '/settings',
    labelKey: 'navigation.settings',
    Icon: Settings2,
    exact: false,
  },
  {
    to: '/wallet',
    labelKey: 'navigation.wallet',
    Icon: Wallet,
    exact: false,
  },
]

function BottomNavigation() {
  const { t } = useTranslation()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:px-6 sm:pb-4 md:hidden">
      <div className="glass-panel mx-auto w-full rounded-2xl border border-white/55 p-2 shadow-soft dark:border-slate-700/50">
        <div className="flex items-center gap-2">
          <ul className="grid flex-1 grid-cols-5 gap-2">
            {navItems.map(({ to, labelKey, Icon, exact }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={exact}
                  className={({ isActive }) =>
                    [
                      'flex flex-col items-center justify-center rounded-xl px-2 py-2 text-xs font-semibold transition',
                      isActive
                        ? 'bg-kapya-500 text-white shadow-soft'
                        : 'text-sand-700 hover:bg-white/55 hover:text-sand-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-slate-100',
                    ].join(' ')
                  }
                >
                  <motion.span whileTap={{ scale: 0.95 }} className="flex flex-col items-center">
                    <Icon className="mb-1 h-4 w-4" aria-hidden="true" />
                    <span>{t(labelKey)}</span>
                  </motion.span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  )
}

function SidebarNavigation() {
  const { t } = useTranslation()

  return (
    <nav className="hidden h-full md:block">
      <div className="glass-panel flex h-full w-full flex-col rounded-3xl border border-white/55 p-3 shadow-soft dark:border-slate-700/50">
        <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          Kapya
        </p>

        <ul className="space-y-2">
            {navItems.map(({ to, labelKey, Icon, exact }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={exact}
                  className={({ isActive }) =>
                    [
                      'inline-flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                      isActive
                        ? 'bg-kapya-500 text-white shadow-soft'
                        : 'text-sand-700 hover:bg-white/55 hover:text-sand-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-slate-100',
                    ].join(' ')
                  }
                >
                  <motion.span whileTap={{ scale: 0.97 }} className="inline-flex items-center gap-2">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span>{t(labelKey)}</span>
                  </motion.span>
                </NavLink>
              </li>
            ))}
        </ul>
      </div>
    </nav>
  )
}

function Navigation({ variant }) {
  return variant === 'sidebar' ? <SidebarNavigation /> : <BottomNavigation />
}

Navigation.propTypes = {
  variant: PropTypes.oneOf(['bottom', 'sidebar']),
}

Navigation.defaultProps = {
  variant: 'bottom',
}

export default Navigation