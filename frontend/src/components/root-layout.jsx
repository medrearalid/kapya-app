import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'
import { usePantryStore } from '../store/pantry-store'
import BottomNavigation from './bottom-navigation'
import OnboardingOverlay from './onboarding-overlay'

function RootLayout() {
  const location = useLocation()
  const outlet = useOutlet()
  const currentTheme = usePantryStore((state) => state.currentTheme)
  const initializeThemeFromSystem = usePantryStore((state) => state.initializeThemeFromSystem)
  const toastMessage = usePantryStore((state) => state.toastMessage)
  const clearToast = usePantryStore((state) => state.clearToast)
  const hasCompletedOnboarding = usePantryStore((state) => state.hasCompletedOnboarding)

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
    <div className="min-h-screen w-full text-slate-900 dark:text-slate-100">
      {toastMessage?.message ? (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex justify-center px-4">
          <output
            aria-live="polite"
            className="glass-panel rounded-xl border border-sage-200/70 px-4 py-2 text-sm font-semibold text-sage-900 shadow-soft dark:border-sage-700/45 dark:text-sage-100"
          >
            {toastMessage.message}
          </output>
        </div>
      ) : null}

      <div className="mx-auto min-h-screen w-full max-w-[1800px] md:flex md:gap-4 md:px-4 lg:px-6">
        <aside className="hidden md:block md:w-64 md:py-4">
          <div className="sticky top-4 h-[calc(100vh-2rem)]">
            <BottomNavigation variant="sidebar" />
          </div>
        </aside>

        <div className="glass-panel min-h-screen flex-1 bg-white/45 md:my-4 md:rounded-3xl md:border md:border-white/45 md:shadow-soft dark:bg-slate-900/45 dark:md:border-slate-700/45">
          <main className="px-4 pb-24 pt-5 sm:px-6 sm:pt-7 md:px-8 md:pb-8 lg:px-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
              >
                {outlet}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      <BottomNavigation variant="bottom" />

      <AnimatePresence>
        {hasCompletedOnboarding ? null : <OnboardingOverlay />}
      </AnimatePresence>
    </div>
  )
}

export default RootLayout