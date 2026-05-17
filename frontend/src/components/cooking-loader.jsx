import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import { AnimatePresence, motion } from 'framer-motion'
import PropTypes from 'prop-types'
import { useEffect, useMemo, useRef } from 'react'

function GlowDot() {
  return (
    <span className="relative mr-1.5 inline-flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
    </span>
  )
}

function CookingLoader({ log, logs = [], developerMode = false, className = '' }) {
  const terminalRef = useRef(null)

  const safeLogs = useMemo(
    () =>
      (Array.isArray(logs) ? logs : [])
        .map((item) => String(item ?? '').trim())
        .filter(Boolean)
        .slice(-45),
    [logs],
  )

  const activeMessage = safeLogs.at(-1) || String(log ?? '').trim() || 'Ajan dusunuyor...'
  const logLines = useMemo(
    () => (safeLogs.length > 0 ? safeLogs : [activeMessage]),
    [safeLogs, activeMessage],
  )

  useEffect(() => {
    if (!developerMode || !terminalRef.current) {
      return
    }

    terminalRef.current.scrollTop = terminalRef.current.scrollHeight
  }, [developerMode, logLines])

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <DotLottieReact
        src="/Cooking.lottie"
        loop
        autoplay
        style={{ width: 80, height: 80 }}
      />

      {developerMode ? (
        <div className="w-full max-w-sm rounded-xl border border-emerald-500/40 bg-black/80 px-3 py-2">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300/85">
            Agent Console
          </div>

          <div
            ref={terminalRef}
            className="max-h-24 space-y-1 overflow-y-auto pr-1 text-[11px] leading-5 text-emerald-300"
          >
            <AnimatePresence initial={false}>
              {logLines.map((line, index) => (
                <motion.p
                  key={`${index}-${line}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="font-mono"
                >
                  {'>'} {line}
                </motion.p>
              ))}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <div className="flex min-h-[1.2rem] items-center">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={activeMessage}
              initial={{ opacity: 0, y: 4, filter: 'blur(1px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -4, filter: 'blur(1px)' }}
              transition={{ duration: 0.24, ease: 'easeInOut' }}
              className="flex items-center text-center text-xs font-normal text-slate-400 dark:text-slate-500"
            >
              <GlowDot />
              {activeMessage}
            </motion.p>
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

CookingLoader.propTypes = {
  log: PropTypes.string,
  logs: PropTypes.arrayOf(PropTypes.string),
  developerMode: PropTypes.bool,
  className: PropTypes.string,
}

export default CookingLoader
