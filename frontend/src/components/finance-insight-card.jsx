import { motion } from 'framer-motion'
import { Wallet } from 'lucide-react'
import PropTypes from 'prop-types'
import { useEffect, useMemo, useRef } from 'react'
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
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#737373] dark:text-slate-400">
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
  const hasAutoTriggeredRef = useRef(false)

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
    if (hasAutoTriggeredRef.current) {
      return
    }

    const snapshot = useBehaviorStore.getState().insightByTrigger?.[INSIGHT_TRIGGER]
    if (snapshot?.loading || snapshot?.data) {
      hasAutoTriggeredRef.current = true
      return
    }

    if (
      snapshot?.requestKey === requestKey &&
      (snapshot.loading || snapshot.data || snapshot.error)
    ) {
      hasAutoTriggeredRef.current = true
      return
    }

    hasAutoTriggeredRef.current = true

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
      <div className="flex items-center justify-center rounded-[20px] border border-black/10 bg-white py-5 dark:border-slate-700/50 dark:bg-slate-900/60">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#f7f4f0] px-3 py-1.5 text-xs font-semibold text-[#4b4b4b] dark:bg-slate-800/70 dark:text-slate-300">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" aria-hidden="true" />
          {' '}
          Yapay zeka finans analizi sürüyor...
        </div>
      </div>
    )
  }

  if (!summary) return null

  return (
    <motion.article
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="feature-card rounded-[20px] border border-black/10 bg-white p-4 dark:border-slate-700/50 dark:bg-slate-900/75"
    >
      <div className="mb-3 flex items-center gap-2">
        <Wallet className="h-4 w-4 text-[#4b4b4b] dark:text-slate-200" aria-hidden="true" />
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#171717] dark:text-slate-200">
          AI Fintek Analizi
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 rounded-xl bg-[#f7f4f0] p-3 dark:bg-slate-800/40">
        <FinanceStat
          label="Kurtarilan Bakiye"
          value={formatCurrency(summary.savedBalance)}
          colorClass="text-[#171717] dark:text-slate-100"
        />
        <FinanceStat
          label="Israf Zarari"
          value={formatCurrency(summary.wasteLoss)}
          colorClass="text-[#4b4b4b] dark:text-slate-200"
        />
        <FinanceStat
          label="Ogün Bas. Maliyet"
          value={formatCurrency(summary.avgMealCost)}
          colorClass="text-[#171717] dark:text-slate-100"
        />
      </div>

      {summary.savingTip && (
        <p className="mt-3 text-xs font-medium leading-relaxed text-[#4b4b4b] dark:text-slate-300">
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
