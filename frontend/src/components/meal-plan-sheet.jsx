import PropTypes from 'prop-types'
import { CalendarDays, Clock3, Users } from 'lucide-react'
import TapButton from './tap-button'
import { useMediaQuery } from '../utils/use-media-query'

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

  if (!isOpen) {
    return null
  }

  return (
    <dialog
      open
      className={[
        'fixed inset-0 z-[70] flex bg-black/45 p-3 sm:p-6',
        isDesktopViewport ? 'items-center justify-center' : 'items-end',
      ].join(' ')}
    >
      <div
        className={[
          'glass-panel mx-auto w-full border border-white/60 bg-white/95 p-4 shadow-soft dark:border-slate-700/60 dark:bg-slate-900/95',
          isDesktopViewport ? 'max-w-lg rounded-3xl' : 'max-w-xl rounded-2xl',
        ].join(' ')}
      >
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          {labels.title}
        </p>

        <div className="mt-3 space-y-3">
          <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
            <span className="mb-1 inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              {labels.dayLabel}
            </span>
            <input
              type="date"
              min={new Date().toISOString().slice(0, 10)}
              value={mealDate}
              onChange={(event) => onDateChange(event.target.value)}
              className="w-full rounded-xl border border-white/55 bg-white/80 px-3 py-2 text-sm outline-none ring-kapya-300 focus:ring-2 dark:border-slate-700 dark:bg-slate-800"
            />
          </label>

          <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
            <span className="mb-1 inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
              {labels.mealTypeLabel}
            </span>
            <select
              value={mealType}
              onChange={(event) => onMealTypeChange(event.target.value)}
              className="w-full rounded-xl border border-white/55 bg-white/80 px-3 py-2 text-sm outline-none ring-kapya-300 focus:ring-2 dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="kahvalti">{labels.breakfast}</option>
              <option value="ogle">{labels.lunch}</option>
              <option value="aksam">{labels.dinner}</option>
            </select>
          </label>

          <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
            <span className="mb-1 inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {labels.portionLabel}
            </span>
            <input
              type="number"
              min="1"
              max="12"
              step="1"
              value={portionSize}
              onChange={(event) => onPortionSizeChange(event.target.value)}
              className="w-full rounded-xl border border-white/55 bg-white/80 px-3 py-2 text-sm outline-none ring-kapya-300 focus:ring-2 dark:border-slate-700 dark:bg-slate-800"
            />
          </label>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <TapButton
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            {labels.cancelButton}
          </TapButton>
          <TapButton
            type="button"
            onClick={onSubmit}
            className="rounded-xl bg-sage-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sage-700"
          >
            {labels.saveButton}
          </TapButton>
        </div>
      </div>
    </dialog>
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
