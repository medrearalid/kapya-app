import PropTypes from 'prop-types'
import { motion } from 'framer-motion'
import AnimatedCurrency from './animated-currency'

const toneStyles = {
  neutral: {
    card: 'border-black/10 bg-white dark:border-slate-700/60 dark:bg-slate-900/80',
    badge: 'bg-[#f4f1ee] text-[#4b4b4b] dark:bg-slate-800/70 dark:text-slate-200',
    value: 'text-[#050505] dark:text-slate-100',
    subtitle: 'text-[#4b4b4b] dark:text-slate-300',
  },
  spend: {
    card: 'border-black/10 bg-[#f7f4f0] dark:border-slate-700/60 dark:bg-slate-900/80',
    badge: 'bg-white text-[#4b4b4b] dark:bg-slate-800/70 dark:text-slate-200',
    value: 'text-[#171717] dark:text-slate-100',
    subtitle: 'text-[#4b4b4b] dark:text-slate-300',
  },
  saved: {
    card: 'border-black/10 bg-[#ece7e2] dark:border-slate-700/60 dark:bg-slate-900/80',
    badge: 'bg-white text-[#171717] dark:bg-slate-800/70 dark:text-slate-200',
    value: 'text-[#171717] dark:text-slate-100',
    subtitle: 'text-[#4b4b4b] dark:text-slate-300',
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
        'feature-card rounded-3xl border p-5 sm:p-6',
        style.card,
        className,
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#4b4b4b] dark:text-slate-400">
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
