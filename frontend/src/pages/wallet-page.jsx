import { motion } from 'framer-motion'
import { PiggyBank, TrendingUp, Wallet } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import AnimatedCurrency from '../components/animated-currency'
import FinanceMetricCard from '../components/finance-metric-card'
import FinanceInsightCard from '../components/finance-insight-card'
import { useFinanceStore } from '../store/finance-store'
import { usePantryStore } from '../store/pantry-store'

const formatMultiplier = (value) =>
  `x${Number(Math.max(0, Number(value) || 0)).toFixed(2)}`

const calculateCoverageRatio = (savedValue, consumedValue) => {
  const safeConsumedValue = Math.max(0, Number(consumedValue) || 0)
  if (safeConsumedValue <= 0) {
    return 0
  }

  const safeSavedValue = Math.max(0, Number(savedValue) || 0)
  return Math.max(0, (safeSavedValue / safeConsumedValue) * 100)
}

function WalletPage() {
  const { t } = useTranslation()
  const finance = usePantryStore((state) => state.finance)
  const products = usePantryStore((state) => state.products)
  const totalInventoryCost = useFinanceStore((state) => state.totalInventoryCost)
  const totalConsumedCost = useFinanceStore((state) => state.totalConsumedCost)
  const preventedWasteValue = useFinanceStore((state) => state.preventedWasteValue)
  const currentMonthSpend = useFinanceStore((state) => state.currentMonthSpend)
  const currentMonthPreventedWaste = useFinanceStore((state) => state.currentMonthPreventedWaste)
  const wastePreventionMultiplier = useFinanceStore((state) => state.wastePreventionMultiplier)

  const pantryProducts = useMemo(
    () =>
      (Array.isArray(products) ? products : [])
        .filter((p) => String(p?.status ?? '') !== 'tukendi')
        .map((p) => ({
          name: String(p?.name ?? '').trim(),
          quantity: Number(p?.quantity) || 0,
          unit: String(p?.unit ?? 'adet').trim(),
          birimMaliyet: Number(p?.birimMaliyet) || 0,
        }))
        .filter((p) => p.name),
    [products],
  )

  const financeData = useMemo(
    () => ({
      ...finance,
      totalInventoryCost,
      totalConsumedCost,
      preventedWasteValue,
      currentMonthSpend,
      currentMonthPreventedWaste,
      wastePreventionMultiplier,
    }),
    [
      currentMonthPreventedWaste,
      currentMonthSpend,
      finance,
      preventedWasteValue,
      totalConsumedCost,
      totalInventoryCost,
      wastePreventionMultiplier,
    ],
  )

  const wasteCoverageRatio = useMemo(
    () => calculateCoverageRatio(preventedWasteValue, totalConsumedCost),
    [preventedWasteValue, totalConsumedCost],
  )

  const netKitchenPressure = useMemo(
    () => Math.max(0, currentMonthSpend - currentMonthPreventedWaste),
    [currentMonthPreventedWaste, currentMonthSpend],
  )

  return (
    <section className="space-y-5 pb-20 md:pb-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sand-700 dark:text-slate-400">
          {t('wallet.badge')}
        </p>
        <h1 className="heading-display mt-2 text-3xl font-semibold text-sand-900 dark:text-slate-100">
          {t('wallet.title')}
        </h1>
        <p className="mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-300">
          {t('wallet.subtitle')}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:auto-rows-[minmax(132px,_auto)]">
        <FinanceMetricCard
          title={t('wallet.inventoryCostTitle')}
          subtitle={t('wallet.inventoryCostDescription')}
          value={totalInventoryCost}
          icon={Wallet}
          tone="neutral"
          className="md:col-span-4"
        />

        <FinanceMetricCard
          title={t('wallet.totalConsumedTitle')}
          subtitle={t('wallet.totalConsumedDescription')}
          value={totalConsumedCost}
          icon={PiggyBank}
          tone="spend"
          delay={0.05}
          className="md:col-span-4"
        />

        <FinanceMetricCard
          title={t('wallet.preventedWasteTitle')}
          subtitle={t('wallet.preventedWasteDescription')}
          value={preventedWasteValue}
          icon={TrendingUp}
          tone="saved"
          delay={0.1}
          className="md:col-span-4"
        />

        <motion.article
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.14 }}
          className="glass-panel rounded-3xl border border-slate-200/70 bg-gradient-to-br from-white/85 via-slate-50/85 to-slate-100/70 p-5 dark:border-slate-700/55 dark:from-slate-900/75 dark:via-slate-900/70 dark:to-slate-800/65 md:col-span-7"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            {t('wallet.monthlyPanelTitle')}
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-white/65 p-3.5 dark:bg-slate-800/65">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                {t('wallet.monthlySpendTitle')}
              </p>
              <AnimatedCurrency
                value={currentMonthSpend}
                className="mt-2 block text-2xl font-semibold text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="rounded-2xl bg-emerald-50/70 p-3.5 dark:bg-emerald-900/30">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
                {t('wallet.monthlySavedTitle')}
              </p>
              <AnimatedCurrency
                value={currentMonthPreventedWaste}
                className="mt-2 block text-2xl font-semibold text-emerald-800 dark:text-emerald-100"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white/65 px-3.5 py-3 dark:border-slate-700/60 dark:bg-slate-800/65">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
              {t('wallet.netPressureTitle')}
            </span>
            <AnimatedCurrency
              value={netKitchenPressure}
              className="text-xl font-semibold text-slate-900 dark:text-slate-100"
            />
          </div>
        </motion.article>

        <motion.article
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.18 }}
          className="glass-panel rounded-3xl border border-emerald-200/65 bg-gradient-to-br from-emerald-50/80 via-white/85 to-sage-100/70 p-5 dark:border-emerald-800/50 dark:from-emerald-950/40 dark:via-slate-900/70 dark:to-sage-900/35 md:col-span-5"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
            {t('wallet.modelTitle')}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-emerald-900/90 dark:text-emerald-100/90">
            {t('wallet.modelDescription')}
          </p>

          <div className="mt-4 space-y-2 rounded-2xl bg-white/65 p-3.5 dark:bg-slate-800/65">
            <div className="flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-200">
              <span>{t('wallet.multiplierLabel')}</span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                {formatMultiplier(wastePreventionMultiplier)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-200">
              <span>{t('wallet.coverageRatioLabel')}</span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                %{wasteCoverageRatio.toFixed(0)}
              </span>
            </div>
          </div>
        </motion.article>

        <div className="md:col-span-12">
          <FinanceInsightCard pantryProducts={pantryProducts} financeData={financeData} />
        </div>
      </div>
    </section>
  )
}

export default WalletPage
