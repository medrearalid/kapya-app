import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { usePantryStore } from '../store/pantry-store'
import BottomNavigation from './bottom-navigation'

function RootLayout() {
  const currentTheme = usePantryStore((state) => state.currentTheme)
  const initializeThemeFromSystem = usePantryStore((state) => state.initializeThemeFromSystem)
  const toastMessage = usePantryStore((state) => state.toastMessage)
  const clearToast = usePantryStore((state) => state.clearToast)

  useEffect(() => {
    initializeThemeFromSystem()
  }, [initializeThemeFromSystem])

  useEffect(() => {
    if (!toastMessage?.id) {
      return undefined
    }

    const timeoutId = setTimeout(() => {
      clearToast()
    }, 2800)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [toastMessage, clearToast])

  useEffect(() => {
    const rootElement = document.documentElement
    rootElement.classList.toggle('dark', currentTheme === 'dark')
    rootElement.style.colorScheme = currentTheme
  }, [currentTheme])

  return (
    <div className="mx-auto min-h-screen w-full max-w-3xl text-slate-900 dark:text-slate-100 sm:px-5">
      {toastMessage?.message ? (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex justify-center px-4">
          <output
            aria-live="polite"
            className="rounded-xl border border-emerald-300 bg-emerald-50/95 px-4 py-2 text-sm font-semibold text-emerald-900 shadow-lg backdrop-blur dark:border-emerald-700 dark:bg-emerald-900/85 dark:text-emerald-100"
          >
            {toastMessage.message}
          </output>
        </div>
      ) : null}

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