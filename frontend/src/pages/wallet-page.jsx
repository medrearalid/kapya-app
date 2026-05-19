import { motion } from 'framer-motion'
import { PiggyBank, TrendingUp, Wallet, WalletCards } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import AnimatedCurrency from '../components/animated-currency'
import EmptyStatePanel from '../components/empty-state-panel'
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

  const hasWalletData = useMemo(
    () =>
      pantryProducts.length > 0 ||
      totalInventoryCost > 0 ||
      totalConsumedCost > 0 ||
      currentMonthSpend > 0 ||
      currentMonthPreventedWaste > 0,
    [
      currentMonthPreventedWaste,
      currentMonthSpend,
      pantryProducts.length,
      totalConsumedCost,
      totalInventoryCost,
    ],
  )

  return (
    <section className="space-y-6 pb-20 md:pb-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#4b4b4b] dark:text-slate-400">
          {t('wallet.badge')}
        </p>
        <h1 className="heading-display mt-2 text-3xl font-semibold text-[#050505] dark:text-slate-100">
          {t('wallet.title')}
        </h1>
        <p className="mt-2 max-w-xl text-sm text-[#4b4b4b] dark:text-slate-300">
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
          className="feature-card rounded-3xl border border-black/10 bg-white p-5 dark:border-slate-700/55 dark:bg-slate-900/75 md:col-span-7"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#4b4b4b] dark:text-slate-400">
              {t('wallet.monthlyPanelTitle')}
            </p>
            <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-full">
              ▼ 12.4% geçen aya göre
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-[#f7f4f0] p-3.5 dark:bg-slate-800/65">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#737373] dark:text-slate-400">
                {t('wallet.monthlySpendTitle')}
              </p>
              <AnimatedCurrency
                value={currentMonthSpend}
                className="mt-2 block text-2xl font-semibold text-[#050505] dark:text-slate-100"
              />
            </div>

            <div className="rounded-2xl bg-[#ece7e2] p-3.5 dark:bg-slate-800/65">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4b4b4b] dark:text-slate-300">
                {t('wallet.monthlySavedTitle')}
              </p>
              <AnimatedCurrency
                value={currentMonthPreventedWaste}
                className="mt-2 block text-2xl font-semibold text-[#171717] dark:text-slate-100"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-black/10 bg-white p-4 dark:border-slate-700/60 dark:bg-slate-800/65">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#737373] dark:text-slate-400">
                {t('wallet.netPressureTitle')}
              </span>
              <AnimatedCurrency
                value={netKitchenPressure}
                className="text-xl font-bold text-[#050505] dark:text-slate-100"
              />
            </div>
            
            <div className="relative h-2 rounded-full bg-slate-100 dark:bg-slate-700/50 mt-1">
              <motion.div
                className="absolute h-2 rounded-full bg-[#050505] dark:bg-slate-300"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((netKitchenPressure / 3000) * 100, 100)}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
              <motion.div
                className="absolute h-3 -translate-y-1/2 top-1/2 rounded-full"
                style={{
                  left: `50%`,
                  width: '2px',
                  backgroundColor: 'var(--emerald-500, #10b981)',
                }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.5, delay: 0.8 }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-[#737373] dark:text-slate-400 font-medium">
              <span>0 ₺</span>
              <span>Benchmark (1.500 ₺)</span>
              <span>3.000+ ₺</span>
            </div>
          </div>
        </motion.article>

        <motion.article
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.18 }}
          className="feature-card rounded-3xl border border-black/10 bg-white p-5 dark:border-slate-700/60 dark:bg-slate-900/80 md:col-span-5 flex flex-col justify-between"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#4b4b4b] dark:text-slate-300">
              {t('wallet.modelTitle')}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[#4b4b4b] dark:text-slate-200">
              {t('wallet.modelDescription')}
            </p>
          </div>

          <div className="mt-4 space-y-4 rounded-2xl bg-[#f7f4f0] p-4 dark:bg-slate-800/65">
            <div className="flex items-center justify-between text-sm font-medium text-[#4b4b4b] dark:text-slate-200">
              <span>{t('wallet.multiplierLabel')}</span>
              <span className="font-semibold text-[#171717] dark:text-slate-100">
                {formatMultiplier(wastePreventionMultiplier)}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm font-medium text-[#4b4b4b] dark:text-slate-200">
                <span>{t('wallet.coverageRatioLabel')}</span>
                <span className="font-bold text-lg text-[#171717] dark:text-slate-100">
                  %{wasteCoverageRatio.toFixed(0)}
                </span>
              </div>
              
              <div className="relative flex w-full h-2 rounded-full overflow-hidden mt-1">
                <div className="bg-red-400/80" style={{ width: '25%' }} />
                <div className="bg-orange-400/80" style={{ width: '25%' }} />
                <div className="bg-emerald-500/80" style={{ width: '50%' }} />
                
                <motion.div
                  className="absolute w-1.5 h-3 bg-black dark:bg-white rounded-full -translate-y-1/2 top-1/2 shadow-sm"
                  initial={{ left: 0 }}
                  animate={{ left: `calc(${Math.min(wasteCoverageRatio, 100)}% - 3px)` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground uppercase font-medium pt-1 opacity-70">
                <span>Kritik</span>
                <span>İdeal</span>
                <span>Mükemmel</span>
              </div>
            </div>
          </div>
        </motion.article>

        <div className="md:col-span-12">
          {hasWalletData ? (
            <FinanceInsightCard pantryProducts={pantryProducts} financeData={financeData} />
          ) : (
            <EmptyStatePanel
              icon={WalletCards}
              title={t('wallet.emptyStateTitle')}
              description={t('wallet.emptyStateDescription')}
            />
          )}
        </div>
        

      </div>
    </section>
  )
}

export default WalletPage
