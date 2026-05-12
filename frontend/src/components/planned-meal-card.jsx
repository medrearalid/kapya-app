import { CalendarCheck2, Check, Trash2 } from 'lucide-react'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'
import TapButton from './tap-button'

function PlannedMealCard({ meal, onOpenDetail, onCookMeal, onRemoveMeal }) {
  const { t } = useTranslation()

  return (
    <div
      className={[
        'rounded-xl border border-slate-100 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-800/60',
        meal.completed ? 'opacity-70' : '',
      ].join(' ')}
    >
      <TapButton type="button" onClick={() => onOpenDetail(meal)} className="flex w-full gap-3 text-left">
        <img
          src={meal?.recipe?.goruntuUrl || ''}
          alt={meal?.recipe?.tarifAdi || t('planner.meal')}
          className="h-14 w-14 rounded-xl object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
            {meal?.recipe?.tarifAdi}
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            {t('planner.portionInfo', { count: meal.portionSize })}
          </p>
        </div>
      </TapButton>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <TapButton
          type="button"
          onClick={() => onCookMeal(meal)}
          disabled={meal.completed}
          className={[
            'inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-white',
            meal.completed ? 'bg-emerald-400/80' : 'bg-emerald-600 hover:bg-emerald-700',
          ].join(' ')}
        >
          {meal.completed ? (
            <>
              <CalendarCheck2 className="h-4 w-4" aria-hidden="true" />
              {t('planner.completed')}
            </>
          ) : (
            <>
              <Check className="h-4 w-4" aria-hidden="true" />
              {t('planner.cookButton')}
            </>
          )}
        </TapButton>

        <TapButton
          type="button"
          onClick={() => onRemoveMeal(meal.id)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          {t('planner.removeButton')}
        </TapButton>
      </div>
    </div>
  )
}

PlannedMealCard.propTypes = {
  meal: PropTypes.shape({
    id: PropTypes.string.isRequired,
    completed: PropTypes.bool,
    portionSize: PropTypes.number,
    recipe: PropTypes.shape({
      tarifAdi: PropTypes.string,
      goruntuUrl: PropTypes.string,
    }),
  }).isRequired,
  onOpenDetail: PropTypes.func.isRequired,
  onCookMeal: PropTypes.func.isRequired,
  onRemoveMeal: PropTypes.func.isRequired,
}

export default PlannedMealCard
