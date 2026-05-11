import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { usePantryStore } from '../store/pantry-store'
import BottomNavigation from './bottom-navigation'

function RootLayout() {
  const currentTheme = usePantryStore((state) => state.currentTheme)
  const initializeThemeFromSystem = usePantryStore((state) => state.initializeThemeFromSystem)

  useEffect(() => {
    initializeThemeFromSystem()
  }, [initializeThemeFromSystem])

  useEffect(() => {
    const rootElement = document.documentElement
    rootElement.classList.toggle('dark', currentTheme === 'dark')
    rootElement.style.colorScheme = currentTheme
  }, [currentTheme])

  return (
    <div className="mx-auto min-h-screen w-full max-w-3xl text-slate-900 dark:text-slate-100 sm:px-5">
      <div className="min-h-screen bg-white/70 dark:bg-slate-900/80 sm:my-5 sm:rounded-3xl sm:border sm:border-sand-100 dark:sm:border-slate-700 sm:shadow-sm dark:sm:shadow-[0_16px_35px_rgba(0,0,0,0.35)]">
        <main className="px-4 pb-24 pt-5 sm:px-8 sm:pb-28 sm:pt-8">
          <Outlet />
        </main>
      </div>
      <BottomNavigation />
    </div>
  )
}

export default RootLayout