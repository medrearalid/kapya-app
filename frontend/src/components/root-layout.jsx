import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'
import { usePantryStore } from '../store/pantry-store'
import BottomNavigation from './bottom-navigation'
import GlobalAgentPlanOverlay from './global-agent-plan-overlay'
import OnboardingOverlay from './onboarding-overlay'
import { Component as InfiniteGrid } from './ui/the-infinite-grid'

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
    rootElement.classList.remove('dark')
    rootElement.style.colorScheme = 'light'
  }, [])

  return (
    <div className="min-h-screen w-full text-[#050505] dark:text-slate-100 relative">
      <InfiniteGrid />
      {toastMessage?.message ? (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex justify-center px-4">
          <output
            aria-live="polite"
            className="rounded-xl border border-black/10 bg-white/95 px-4 py-2 text-sm font-semibold text-[#171717] shadow-soft dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            {toastMessage.message}
          </output>
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-[1200px] px-3 pb-8 pt-3 sm:px-6 sm:pt-4 lg:px-8">
        <BottomNavigation variant="top" />

        <main className="mt-6 min-h-[calc(100vh-10rem)] pb-10">
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

      <AnimatePresence>
        {hasCompletedOnboarding ? null : <OnboardingOverlay />}
      </AnimatePresence>

      <GlobalAgentPlanOverlay />
    </div>
  )
}

export default RootLayout