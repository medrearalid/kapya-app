import { motion } from 'framer-motion'
import { Wallet } from 'lucide-react'
import PropTypes from 'prop-types'
import { useEffect, useMemo } from 'react'
import CookingLoader from './cooking-loader'
import { streamInsight } from '../services/insights-api'
import { useBehaviorStore } from '../store/behavior-store'
import { usePantryStore } from '../store/pantry-store'

const INSIGHT_TRIGGER = 'wallet_page'

const formatCurrency = (value) =>
  new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 2,
  }).format(Math.max(0, Number(value) || 0))

function FinanceStat({ label, value, colorClass }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`text-xl font-bold tracking-tight ${colorClass}`}>{value}</span>
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
        {label}
      </span>
    </div>
  )
}

FinanceStat.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  colorClass: PropTypes.string.isRequired,
}

function FinanceInsightCard({ pantryProducts, financeData }) {
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
      pantryProducts,
      financeData,
      userContext: buildUserContext(),
      developerMode,
    }),
    [pantryProducts, financeData, buildUserContext, developerMode],
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
      <div className="flex justify-center rounded-2xl border border-kapya-200/60 bg-kapya-50/60 py-5 dark:border-kapya-800/40 dark:bg-kapya-950/20">
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
      className="glass-panel rounded-2xl border border-kapya-200/65 bg-gradient-to-br from-kapya-50/70 via-white/80 to-amber-50/70 p-4 dark:border-kapya-900/50 dark:from-kapya-950/20 dark:via-slate-900/70 dark:to-amber-900/25"
    >
      <div className="mb-3 flex items-center gap-2">
        <Wallet className="h-4 w-4 text-kapya-700 dark:text-kapya-300" aria-hidden="true" />
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-kapya-800 dark:text-kapya-200">
          AI Fintek Analizi
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 rounded-xl bg-white/50 p-3 dark:bg-slate-800/40">
        <FinanceStat
          label="Kurtarilan Bakiye"
          value={formatCurrency(summary.savedBalance)}
          colorClass="text-emerald-700 dark:text-emerald-400"
        />
        <FinanceStat
          label="Israf Zarari"
          value={formatCurrency(summary.wasteLoss)}
          colorClass="text-red-600 dark:text-red-400"
        />
        <FinanceStat
          label="Ogün Bas. Maliyet"
          value={formatCurrency(summary.avgMealCost)}
          colorClass="text-kapya-800 dark:text-kapya-200"
        />
      </div>

      {summary.savingTip && (
        <p className="mt-3 text-xs font-medium leading-relaxed text-kapya-800/80 dark:text-kapya-200/80">
          {summary.savingTip}
        </p>
      )}
    </motion.article>
  )
}

FinanceInsightCard.propTypes = {
  pantryProducts: PropTypes.array.isRequired,
  financeData: PropTypes.object.isRequired,
}

export default FinanceInsightCard
