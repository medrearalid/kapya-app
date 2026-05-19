import { CalendarCheck2, Check, Trash2 } from 'lucide-react'
import PropTypes from 'prop-types'
import { motion, useAnimation } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import TapButton from './tap-button'

function PlannedMealCard({ meal, onOpenDetail, onCookMeal, onRemoveMeal }) {
  const { t } = useTranslation()
  const swipeControls = useAnimation()

  const handleDragEnd = async (_event, info) => {
    const swipeDistance = Math.abs(Number(info?.offset?.x) || 0)
    if (swipeDistance >= 110) {
      await swipeControls.start({
        x: info.offset.x > 0 ? 380 : -380,
        opacity: 0,
        transition: { duration: 0.18, ease: 'easeOut' },
      })
      onRemoveMeal(meal.id)
      return
    }

    swipeControls.start({ x: 0, transition: { type: 'spring', stiffness: 420, damping: 28 } })
  }

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.3}
      onDragEnd={handleDragEnd}
      animate={swipeControls}
      className={[
        'rounded-[20px] border border-black/10 bg-white p-3 shadow-soft dark:border-slate-700 dark:bg-slate-800/60',
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
          <p className="truncate text-sm font-semibold text-[#050505] dark:text-slate-100">
            {meal?.recipe?.tarifAdi}
          </p>
          <p className="mt-1 text-xs text-[#4b4b4b] dark:text-slate-300">
            {t('planner.portionInfo', { count: meal.portionSize })}
          </p>
        </div>
      </TapButton>

      <p className="mt-2 text-[11px] font-medium text-[#737373] dark:text-slate-400">
        {t('planner.swipeHint')}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <TapButton
          type="button"
          onClick={() => onCookMeal(meal)}
          disabled={meal.completed}
          className={[
            'inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-white',
            meal.completed ? 'bg-[#4b4b4b]/75' : 'bg-[#171717] hover:bg-black',
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
          className="soft-highlight-btn inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          {t('planner.removeButton')}
        </TapButton>
      </div>
    </motion.div>
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
