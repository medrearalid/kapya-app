import { motion } from 'framer-motion'
import PropTypes from 'prop-types'

function EmptyStatePanel({ icon: Icon, title, description, className = '' }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={[
        'feature-card rounded-[20px] border border-black/10 bg-white p-5 text-center dark:border-slate-700/55 dark:bg-slate-900/65',
        className,
      ].join(' ')}
    >
      <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-black/10 bg-[#f4f1ee] text-[#4b4b4b] dark:border-slate-700/70 dark:bg-slate-800/75 dark:text-slate-300">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>

      <p className="mt-3 text-sm font-semibold text-[#050505] dark:text-slate-200">{title}</p>
      <p className="mt-1 text-sm text-[#737373] dark:text-slate-400">{description}</p>
    </motion.article>
  )
}

EmptyStatePanel.propTypes = {
  icon: PropTypes.elementType.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  className: PropTypes.string,
}

export default EmptyStatePanel
