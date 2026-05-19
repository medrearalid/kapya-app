import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, ChevronUp, Workflow } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useBehaviorStore } from '../store/behavior-store'
import TapButton from './tap-button'
import Plan from './ui/agent-plan'

function GlobalAgentPlanOverlay() {
  const { t } = useTranslation()
  const activeAgentProcessCount = useBehaviorStore((state) => state.activeAgentProcessCount || 0)
  const plannerInsight = useBehaviorStore((state) => state.insightByTrigger?.planner_page)
  const walletInsight = useBehaviorStore((state) => state.insightByTrigger?.wallet_page)
  const [isOpen, setIsOpen] = useState(false)
  const previousProcessCountRef = useRef(0)

  useEffect(() => {
    const previousCount = previousProcessCountRef.current
    const hasNewSessionStarted = previousCount === 0 && activeAgentProcessCount > 0

    if (hasNewSessionStarted || activeAgentProcessCount <= 0) {
      setIsOpen(false)
    }

    previousProcessCountRef.current = activeAgentProcessCount
  }, [activeAgentProcessCount])

  const lastLogSummary = useMemo(() => {
    const plannerCurrent = String(plannerInsight?.log ?? '').trim()
    const walletCurrent = String(walletInsight?.log ?? '').trim()
    const plannerLast = Array.isArray(plannerInsight?.logHistory)
      ? String(plannerInsight.logHistory.at(-1) ?? '').trim()
      : ''
    const walletLast = Array.isArray(walletInsight?.logHistory)
      ? String(walletInsight.logHistory.at(-1) ?? '').trim()
      : ''

    return [plannerCurrent, walletCurrent, plannerLast, walletLast].find((item) => item.length > 0) || ''
  }, [plannerInsight, walletInsight])

  return (
    <AnimatePresence>
      {activeAgentProcessCount > 0 ? (
        <motion.aside
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="pointer-events-none fixed right-3 bottom-20 z-[70] md:right-6 md:bottom-6"
        >
          <div
            className={[
              'pointer-events-auto border border-black/10 bg-white/96 shadow-float dark:border-slate-700/75 dark:bg-slate-900/92',
              isOpen ? 'w-[min(94vw,390px)] rounded-2xl p-2.5' : 'w-auto rounded-full p-1.5',
            ].join(' ')}
          >
            <TapButton
              type="button"
              onClick={() => setIsOpen((current) => !current)}
              className={[
                'flex items-center gap-2 text-left',
                isOpen
                  ? 'w-full rounded-xl bg-[#f7f4f0] px-3 py-2 dark:bg-slate-800/75'
                  : 'rounded-full bg-[#f7f4f0] px-3 py-2 dark:bg-slate-800/75',
              ].join(' ')}
            >
              <Workflow className="h-4 w-4 shrink-0 text-[#171717] dark:text-slate-200" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-[#171717] dark:text-slate-100">
                  {t('planner.agentPlanTitle')}
                </span>
                <span className="block text-[11px] text-[#4b4b4b] dark:text-slate-300">
                  {t('planner.agentPlanActiveCount', {
                    count: activeAgentProcessCount,
                  })}
                </span>
                <span className="mt-0.5 block truncate text-[10px] text-[#646464] dark:text-slate-300/90">
                  {t('planner.agentPlanLastLogSummary', {
                    summary:
                      lastLogSummary || t('planner.agentPlanLastLogFallback'),
                  })}
                </span>
              </span>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-[#737373] dark:text-slate-300" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-4 w-4 text-[#737373] dark:text-slate-300" aria-hidden="true" />
              )}
            </TapButton>

            <AnimatePresence initial={false}>
              {isOpen ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="mt-2 overflow-hidden"
                >
                  <Plan compact className="h-[65vh] max-h-[540px]" />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  )
}

export default GlobalAgentPlanOverlay
