import { CalendarDays, ChefHat, House, Settings2, Wallet } from 'lucide-react'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation } from 'react-router-dom'
import { MenuBar } from './ui/glow-menu'
import { useMemo } from 'react'

const navItems = [
  {
    to: '/',
    labelKey: 'navigation.pantry',
    icon: House,
    gradient: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(37,99,235,0.06) 50%, rgba(29,78,216,0) 100%)',
    iconColor: 'text-blue-500',
    exact: true,
  },
  {
    to: '/recipes',
    labelKey: 'navigation.recipes',
    icon: ChefHat,
    gradient: 'radial-gradient(circle, rgba(249,115,22,0.15) 0%, rgba(234,88,12,0.06) 50%, rgba(194,65,12,0) 100%)',
    iconColor: 'text-orange-500',
    exact: false,
  },
  {
    to: '/planner',
    labelKey: 'navigation.planner',
    icon: CalendarDays,
    gradient: 'radial-gradient(circle, rgba(34,197,94,0.15) 0%, rgba(22,163,74,0.06) 50%, rgba(21,128,61,0) 100%)',
    iconColor: 'text-green-500',
    exact: false,
  },
  {
    to: '/wallet',
    labelKey: 'navigation.wallet',
    icon: Wallet,
    gradient: 'radial-gradient(circle, rgba(168,85,247,0.15) 0%, rgba(147,51,234,0.06) 50%, rgba(126,34,206,0) 100%)',
    iconColor: 'text-purple-500',
    exact: false,
  },
  {
    to: '/settings',
    labelKey: 'navigation.settings',
    icon: Settings2,
    gradient: 'radial-gradient(circle, rgba(239,68,68,0.15) 0%, rgba(220,38,38,0.06) 50%, rgba(185,28,28,0) 100%)',
    iconColor: 'text-red-500',
    exact: false,
  },
]

function Navigation({ variant }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  const menuItems = useMemo(() => {
    return navItems.map((item) => ({
      icon: item.icon,
      label: t(item.labelKey),
      href: item.to,
      gradient: item.gradient,
      iconColor: item.iconColor,
      rawPath: item.to,
      exact: item.exact,
    }))
  }, [t])

  const activeItem = useMemo(() => {
    const currentPath = location.pathname
    // First try exact match
    const exactMatch = menuItems.find((item) => currentPath === item.rawPath)
    if (exactMatch) return exactMatch.label
    
    // Then try prefix match (for nested routes like /recipes/123)
    const prefixMatch = menuItems.find((item) => !item.exact && currentPath.startsWith(item.rawPath))
    return prefixMatch ? prefixMatch.label : ''
  }, [location.pathname, menuItems])

  const handleItemClick = (label) => {
    const item = menuItems.find((i) => i.label === label)
    if (item) {
      navigate(item.rawPath)
    }
  }

  if (variant === 'bottom') {
    return (
      <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:px-6 sm:pb-4 md:hidden">
        <MenuBar
          items={menuItems}
          activeItem={activeItem}
          onItemClick={handleItemClick}
          className="mx-auto w-full no-scrollbar overflow-x-auto bg-white/92 dark:bg-slate-900/90"
        />
      </div>
    )
  }

  return (
    <div className="sticky top-3 z-40 w-full">
      <MenuBar
        items={menuItems}
        activeItem={activeItem}
        onItemClick={handleItemClick}
        className="w-full bg-white/90 dark:bg-slate-900/88"
      />
    </div>
  )
}

Navigation.propTypes = {
  variant: PropTypes.oneOf(['top', 'bottom']),
}

Navigation.defaultProps = {
  variant: 'top',
}

export default Navigation