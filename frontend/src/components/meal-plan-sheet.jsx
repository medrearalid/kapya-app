import PropTypes from 'prop-types'
import { CalendarDays, Clock3, Users, X } from 'lucide-react'
import TapButton from './tap-button'
import { useMediaQuery } from '../utils/use-media-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'

function MealPlanSheet({
  isOpen,
  mealDate,
  mealType,
  portionSize,
  onDateChange,
  onMealTypeChange,
  onPortionSizeChange,
  onClose,
  onSubmit,
  labels,
}) {
  const isDesktopViewport = useMediaQuery('(min-width: 768px)')
  const { t } = useTranslation()

  const todayStr = new Date().toISOString().slice(0, 10)
  const tomorrowDate = new Date()
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrowStr = tomorrowDate.toISOString().slice(0, 10)

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={[
              'relative w-full overflow-hidden border border-white/20 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95',
              isDesktopViewport ? 'max-w-md rounded-3xl' : 'max-w-full rounded-[2rem]',
            ].join(' ')}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-black/5 px-6 py-4 dark:border-white/5">
              <h2 className="text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100">
                {labels.title}
              </h2>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Date Section */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <CalendarDays className="h-4 w-4" />
                  {labels.dayLabel}
                </label>
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onDateChange(todayStr)}
                    className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                      mealDate === todayStr
                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    {t('planner.today', 'Bugün')}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDateChange(tomorrowStr)}
                    className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                      mealDate === tomorrowStr
                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    {t('planner.tomorrow', 'Yarın')}
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="date"
                    min={todayStr}
                    value={mealDate}
                    onChange={(event) => onDateChange(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition-colors focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100 dark:focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Meal Type Section */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <Clock3 className="h-4 w-4" />
                  {labels.mealTypeLabel}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['kahvalti', 'ogle', 'aksam'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => onMealTypeChange(type)}
                      className={`rounded-xl px-2 py-3 text-sm font-medium transition-all ${
                        mealType === type
                          ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                      }`}
                    >
                      {
                        {
                          kahvalti: labels.breakfast,
                          ogle: labels.lunch,
                          aksam: labels.dinner,
                        }[type]
                      }
                    </button>
                  ))}
                </div>
              </div>

              {/* Portion Section */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <Users className="h-4 w-4" />
                  {labels.portionLabel}
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onPortionSizeChange(String(Math.max(1, Number(portionSize) - 1)))}
                    className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-xl font-medium text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    -
                  </button>
                  <div className="flex-1 rounded-xl border border-slate-100 bg-slate-50 py-3 text-center text-lg font-semibold text-slate-800 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100">
                    {portionSize} <span className="text-sm font-normal text-slate-500">Kişilik</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onPortionSizeChange(String(Math.min(12, Number(portionSize) + 1)))}
                    className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-xl font-medium text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t border-black/5 bg-slate-50/80 p-6 dark:border-white/5 dark:bg-slate-950/80">
              <TapButton
                type="button"
                onClick={onSubmit}
                className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3.5 text-base font-bold text-white shadow-lg shadow-orange-500/25 transition-all hover:brightness-110 active:scale-[0.98]"
              >
                {labels.saveButton}
              </TapButton>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

MealPlanSheet.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  mealDate: PropTypes.string.isRequired,
  mealType: PropTypes.oneOf(['kahvalti', 'ogle', 'aksam']).isRequired,
  portionSize: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onDateChange: PropTypes.func.isRequired,
  onMealTypeChange: PropTypes.func.isRequired,
  onPortionSizeChange: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  labels: PropTypes.shape({
    title: PropTypes.string.isRequired,
    dayLabel: PropTypes.string.isRequired,
    mealTypeLabel: PropTypes.string.isRequired,
    portionLabel: PropTypes.string.isRequired,
    breakfast: PropTypes.string.isRequired,
    lunch: PropTypes.string.isRequired,
    dinner: PropTypes.string.isRequired,
    cancelButton: PropTypes.string.isRequired,
    saveButton: PropTypes.string.isRequired,
  }).isRequired,
}

export default MealPlanSheet
