import { motion } from 'framer-motion'
import { Activity } from 'lucide-react'
import PropTypes from 'prop-types'
import { useEffect, useMemo } from 'react'
import CookingLoader from './cooking-loader'
import { streamInsight } from '../services/insights-api'
import { useBehaviorStore } from '../store/behavior-store'
import { usePantryStore } from '../store/pantry-store'

const INSIGHT_TRIGGER = 'planner_page'

function StatPill({ label, value, unit }) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-white/60 px-3 py-2 dark:bg-slate-800/60">
      <span className="text-lg font-bold tracking-tight text-emerald-900 dark:text-emerald-100">
        {value}
        {unit && <span className="ml-0.5 text-xs font-medium">{unit}</span>}
      </span>
      <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700/70 dark:text-emerald-300/70">
        {label}
      </span>
    </div>
  )
}

StatPill.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  unit: PropTypes.string,
}

function HealthSummaryCard({ plannedMeals }) {
  const developerMode = usePantryStore((s) => s.developerMode)
  const buildUserContext = useBehaviorStore((s) => s.buildUserContext)
  const insightState = useBehaviorStore((s) => s.insightByTrigger?.[INSIGHT_TRIGGER])
  const beginInsightStream = useBehaviorStore((s) => s.beginInsightStream)
  const setInsightLog = useBehaviorStore((s) => s.setInsightLog)
  const setInsightData = useBehaviorStore((s) => s.setInsightData)
  const setInsightError = useBehaviorStore((s) => s.setInsightError)

  const requestPayload = useMemo(
    () => ({
      trigger: INSIGHT_TRIGGER,
      plannedMeals,
      userContext: buildUserContext(),
      developerMode,
    }),
    [plannedMeals, buildUserContext, developerMode],
  )
  const requestKey = useMemo(() => JSON.stringify(requestPayload), [requestPayload])

  useEffect(() => {
    const snapshot = useBehaviorStore.getState().insightByTrigger?.[INSIGHT_TRIGGER]
    if (
      snapshot?.requestKey === requestKey &&
      (snapshot.loading || snapshot.data || snapshot.error)
    ) {
      return
    }

    beginInsightStream(INSIGHT_TRIGGER, requestKey)

    streamInsight(requestPayload, (message) => setInsightLog(INSIGHT_TRIGGER, message))
      .then((data) => {
        setInsightData(INSIGHT_TRIGGER, data, requestKey)
      })
      .catch((error) => {
        setInsightError(INSIGHT_TRIGGER, error?.message || 'Insight streami alinamadi.', requestKey)
      })
  }, [requestPayload, requestKey, beginInsightStream, setInsightLog, setInsightData, setInsightError])

  const summary = insightState?.data
  if (insightState?.loading) {
    return (
      <div className="flex justify-center rounded-2xl border border-emerald-200/60 bg-emerald-50/60 py-5 dark:border-emerald-800/40 dark:bg-emerald-950/20">
        <CookingLoader
          log={insightState?.log || ''}
          logs={insightState?.logHistory || []}
          developerMode={developerMode}
        />
      </div>
    )
  }

  if (!summary) return null

  return (
    <motion.article
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="glass-panel rounded-2xl border border-emerald-200/65 bg-gradient-to-br from-emerald-50/70 via-white/80 to-teal-50/70 p-4 dark:border-emerald-900/50 dark:from-emerald-950/20 dark:via-slate-900/70 dark:to-teal-900/25"
    >
      <div className="mb-3 flex items-center gap-2">
        <Activity className="h-4 w-4 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-800 dark:text-emerald-200">
          Haftalik Saglik Ozeti
        </span>
        <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
          Skor {Math.round(summary.healthScore)}/100
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <StatPill label="Kalori" value={Math.round(summary.avgDailyCalorie)} unit="kcal" />
        <StatPill label="Protein" value={`${Math.round(summary.avgDailyProtein)}g`} unit="" />
        <StatPill label="Karb" value={`${Math.round(summary.avgDailyCarb)}g`} unit="" />
        <StatPill label="Yag" value={`${Math.round(summary.avgDailyFat)}g`} unit="" />
      </div>

      {summary.insight && (
        <p className="mt-3 text-xs font-medium leading-relaxed text-emerald-800/80 dark:text-emerald-200/80">
          {summary.insight}
        </p>
      )}
    </motion.article>
  )
}

HealthSummaryCard.propTypes = {
  plannedMeals: PropTypes.array.isRequired,
}

export default HealthSummaryCard
