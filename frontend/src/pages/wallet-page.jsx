import PropTypes from 'prop-types'
import { animate, motion } from 'framer-motion'
import { PiggyBank, TrendingUp } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import FinanceInsightCard from '../components/finance-insight-card'
import { usePantryStore } from '../store/pantry-store'

const getCurrentMonthKey = () => new Date().toISOString().slice(0, 7)

function AnimatedCurrency({ value }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const controls = animate(0, Math.max(0, Number(value) || 0), {
      duration: 1.2,
      ease: 'easeOut',
      onUpdate: (latest) => setDisplayValue(latest),
    })

    return () => controls.stop()
  }, [value])

  return (
    <span>
      {new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        maximumFractionDigits: 2,
      }).format(displayValue)}
    </span>
  )
}

AnimatedCurrency.propTypes = {
  value: PropTypes.number.isRequired,
}

function WalletPage() {
  const { t } = useTranslation()
  const finance = usePantryStore((state) => state.finance)
  const products = usePantryStore((state) => state.products)

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

  const monthKey = getCurrentMonthKey()
  const currentMonthSpending = useMemo(
    () => Math.max(0, Number(finance?.monthlyKitchenSpend?.[monthKey]) || 0),
    [finance?.monthlyKitchenSpend, monthKey],
  )
  const currentMonthPreventedWaste = useMemo(
    () => Math.max(0, Number(finance?.monthlyPreventedWaste?.[monthKey]) || 0),
    [finance?.monthlyPreventedWaste, monthKey],
  )

  return (
    <section className="space-y-4 pb-20">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sand-700 dark:text-slate-400">
          {t('wallet.badge')}
        </p>
        <h1 className="heading-display mt-2 text-3xl font-semibold text-sand-900 dark:text-slate-100">
          {t('wallet.title')}
        </h1>
      </header>

      <motion.article
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="glass-panel soft-card rounded-3xl border border-emerald-200/65 bg-gradient-to-br from-emerald-50/70 via-white/80 to-sage-50/70 p-5 dark:border-emerald-900/50 dark:from-emerald-950/20 dark:via-slate-900/70 dark:to-sage-900/25"
      >
        <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:bg-slate-800/70 dark:text-emerald-200">
          <PiggyBank className="h-3.5 w-3.5" aria-hidden="true" />
          {t('wallet.monthlySpendTitle')}
        </div>

        <p className="mt-3 text-4xl font-semibold tracking-tight text-emerald-900 dark:text-emerald-100">
          <AnimatedCurrency value={currentMonthSpending} />
        </p>
        <p className="mt-2 text-xs font-medium text-emerald-800/80 dark:text-emerald-200/80">
          {t('wallet.thisMonthLabel')}
        </p>
      </motion.article>

      <motion.article
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 0.05 }}
        className="glass-panel soft-card rounded-3xl border border-kapya-200/65 bg-gradient-to-br from-kapya-50/70 via-white/80 to-sky-50/70 p-5 dark:border-kapya-900/45 dark:from-kapya-950/20 dark:via-slate-900/70 dark:to-sky-900/25"
      >
        <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold text-kapya-800 dark:bg-slate-800/70 dark:text-kapya-200">
          <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
          {t('wallet.preventedWasteTitle')}
        </div>

        <p className="mt-3 text-4xl font-semibold tracking-tight text-kapya-900 dark:text-kapya-100">
          <AnimatedCurrency value={currentMonthPreventedWaste} />
        </p>
        <p className="mt-2 text-xs font-medium text-kapya-800/80 dark:text-kapya-200/80">
          {t('wallet.preventedWasteDescription')}
        </p>
      </motion.article>

      <FinanceInsightCard pantryProducts={pantryProducts} financeData={finance ?? {}} />
    </section>
  )
}

export default WalletPage
