import { ChefHat, LayoutGrid, Refrigerator } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const navItems = [
  {
    to: '/',
    label: 'Dashboard',
    Icon: LayoutGrid,
    exact: true,
  },
  {
    to: '/pantry',
    label: 'Kiler',
    Icon: Refrigerator,
    exact: false,
  },
  {
    to: '/recipes',
    label: 'Tarif',
    Icon: ChefHat,
    exact: false,
  },
]

function BottomNavigation() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:px-6 sm:pb-4">
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-sand-100 bg-white/95 p-2 shadow-[0_12px_30px_rgba(33,31,22,0.14)] backdrop-blur">
        <ul className="grid grid-cols-3 gap-2">
          {navItems.map(({ to, label, Icon, exact }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={exact}
                className={({ isActive }) =>
                  [
                    'flex flex-col items-center justify-center rounded-xl px-2 py-2 text-xs font-semibold transition',
                    isActive
                      ? 'bg-sand-100 text-sand-900'
                      : 'text-sand-700 hover:bg-sand-50 hover:text-sand-900',
                  ].join(' ')
                }
              >
                <Icon className="mb-1 h-4 w-4" aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}

export default BottomNavigation