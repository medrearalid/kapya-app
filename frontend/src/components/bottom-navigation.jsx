import { ChefHat, LayoutGrid, Moon, Refrigerator, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { usePantryStore } from '../store/pantry-store'

const navItems = [
  {
    to: '/',
    labelKey: 'navigation.home',
    Icon: LayoutGrid,
    exact: true,
  },
  {
    to: '/pantry',
    labelKey: 'navigation.pantry',
    Icon: Refrigerator,
    exact: false,
  },
  {
    to: '/recipes',
    labelKey: 'navigation.recipes',
    Icon: ChefHat,
    exact: false,
  },
]

function BottomNavigation() {
  const { t } = useTranslation()
  const currentTheme = usePantryStore((state) => state.currentTheme)
  const toggleTheme = usePantryStore((state) => state.toggleTheme)
  const ThemeIcon = currentTheme === 'dark' ? Sun : Moon

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:px-6 sm:pb-4">
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-sand-100 bg-white/95 p-2 shadow-[0_12px_30px_rgba(33,31,22,0.14)] backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 dark:shadow-[0_18px_38px_rgba(0,0,0,0.45)]">
        <div className="flex items-center gap-2">
          <ul className="grid flex-1 grid-cols-3 gap-2">
            {navItems.map(({ to, labelKey, Icon, exact }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={exact}
                className={({ isActive }) =>
                  [
                    'flex flex-col items-center justify-center rounded-xl px-2 py-2 text-xs font-semibold transition',
                    isActive
                      ? 'bg-sand-100 text-sand-900 dark:bg-slate-700 dark:text-slate-100'
                      : 'text-sand-700 hover:bg-sand-50 hover:text-sand-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100',
                  ].join(' ')
                }
              >
                <Icon className="mb-1 h-4 w-4" aria-hidden="true" />
                <span>{t(labelKey)}</span>
              </NavLink>
            </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-sand-100 text-sand-900 transition hover:bg-sand-200 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
            aria-label={
              currentTheme === 'dark'
                ? t('navigation.switchToLight')
                : t('navigation.switchToDark')
            }
          >
            <ThemeIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </nav>
  )
}

export default BottomNavigation