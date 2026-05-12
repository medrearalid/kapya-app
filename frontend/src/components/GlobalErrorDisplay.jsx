import { AlertTriangle, RotateCcw } from 'lucide-react'
import { motion } from 'framer-motion'
import { useRouteError } from 'react-router-dom'

function GlobalErrorDisplay() {
  const routeError = useRouteError()
  const isDevMode = Boolean(import.meta.env.DEV)
  const technicalMessage =
    routeError instanceof Error
      ? routeError.message
      : String(routeError?.statusText || routeError?.message || '').trim()

  const handleRetry = () => {
    window.location.reload()
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-4 py-10 sm:px-8">
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="glass-panel soft-card w-full rounded-3xl border border-kapya-200/65 bg-gradient-to-br from-kapya-50 via-white to-kapya-100/70 p-6 text-center dark:border-kapya-900/40 dark:from-kapya-950/35 dark:via-slate-900/60 dark:to-kapya-900/25"
      >
        <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-kapya-100 text-kapya-700 shadow-soft dark:bg-kapya-900/55 dark:text-kapya-200">
          <AlertTriangle className="h-8 w-8" aria-hidden="true" />
        </div>

        <h1 className="mt-5 text-2xl font-semibold text-sand-900 dark:text-slate-100">
          Mutfakta kucuk bir kaza oldu!
        </h1>
        <p className="mt-2 text-sm text-sand-700 dark:text-slate-300">
          Bir seyler ters gitti, ama endiselenme. Tekrar deneyerek kaldigin yerden devam
          edebilirsin.
        </p>

        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          whileHover={{ scale: 1.01 }}
          onClick={handleRetry}
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-kapya-600 px-5 py-3 text-sm font-semibold text-white shadow-float transition hover:bg-kapya-700"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Tekrar Dene
        </motion.button>

        {isDevMode && technicalMessage ? (
          <p className="mt-4 break-words text-[11px] text-slate-500 dark:text-slate-400">
            {technicalMessage}
          </p>
        ) : null}
      </motion.section>
    </div>
  )
}

export default GlobalErrorDisplay
