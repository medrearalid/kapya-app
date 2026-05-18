import PropTypes from 'prop-types'
import { motion } from 'framer-motion'
import AnimatedCurrency from './animated-currency'

const toneStyles = {
  neutral: {
    card: 'border-slate-200/70 bg-gradient-to-br from-slate-50/80 via-white/85 to-slate-100/65 dark:border-slate-700/60 dark:from-slate-900/70 dark:via-slate-900/70 dark:to-slate-800/70',
    badge: 'bg-white/80 text-slate-700 dark:bg-slate-800/70 dark:text-slate-200',
    value: 'text-slate-900 dark:text-slate-100',
    subtitle: 'text-slate-600 dark:text-slate-300',
  },
  spend: {
    card: 'border-sand-100/90 bg-gradient-to-br from-sand-50/90 via-white/85 to-slate-100/80 dark:border-slate-700/60 dark:from-slate-900/70 dark:via-slate-900/70 dark:to-slate-800/70',
    badge: 'bg-white/80 text-sand-700 dark:bg-slate-800/70 dark:text-slate-200',
    value: 'text-sand-900 dark:text-slate-100',
    subtitle: 'text-sand-700/80 dark:text-slate-300',
  },
  saved: {
    card: 'border-emerald-200/75 bg-gradient-to-br from-emerald-50/85 via-white/80 to-emerald-100/75 shadow-[0_24px_42px_rgba(16,185,129,0.18)] dark:border-emerald-800/45 dark:from-emerald-950/45 dark:via-slate-900/70 dark:to-emerald-900/40',
    badge: 'bg-white/80 text-emerald-700 dark:bg-slate-800/70 dark:text-emerald-200',
    value: 'text-emerald-800 dark:text-emerald-100',
    subtitle: 'text-emerald-700/85 dark:text-emerald-200/85',
  },
}

function FinanceMetricCard({
  title,
  subtitle,
  value,
  icon: Icon,
  tone,
  delay,
  className,
}) {
  const style = toneStyles[tone] || toneStyles.neutral

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay }}
      className={[
        'glass-panel rounded-3xl border p-5 sm:p-6',
        style.card,
        className,
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <p className={`mt-2 text-[11px] font-medium ${style.subtitle}`}>{subtitle}</p>
        </div>
        <div className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl ${style.badge}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
      </div>

      <AnimatedCurrency
        value={value}
        className={`mt-6 block text-3xl font-semibold tracking-tight sm:text-4xl ${style.value}`}
      />
    </motion.article>
  )
}

FinanceMetricCard.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  icon: PropTypes.elementType.isRequired,
  tone: PropTypes.oneOf(['neutral', 'spend', 'saved']),
  delay: PropTypes.number,
  className: PropTypes.string,
}

FinanceMetricCard.defaultProps = {
  tone: 'neutral',
  delay: 0,
  className: '',
}

export default FinanceMetricCard
