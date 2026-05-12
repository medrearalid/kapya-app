import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import PlannedMealCard from '../components/planned-meal-card'
import { usePlannerStore } from '../store/planner-store'
import { usePantryStore } from '../store/pantry-store'
import { useRecipeStore } from '../store/recipe-store'

const mealTypeOrder = ['ogle', 'aksam']

const toNumberFromAmount = (value) => {
  const text = String(value ?? '').trim().replaceAll(',', '.')
  if (!text) {
    return 1
  }

  const direct = Number(text)
  if (Number.isFinite(direct) && direct > 0) {
    return direct
  }

  const fractionMatch = /(\d+)\s*\/\s*(\d+)/.exec(text)
  if (fractionMatch) {
    const numerator = Number(fractionMatch[1])
    const denominator = Number(fractionMatch[2])
    if (Number.isFinite(numerator) && Number.isFinite(denominator) && denominator !== 0) {
      return numerator / denominator
    }
  }

  const numericPrefix = Number.parseFloat(text)
  return Number.isFinite(numericPrefix) && numericPrefix > 0 ? numericPrefix : 1
}

const getDayLabel = (dateKey, t, language) => {
  const targetDate = new Date(`${dateKey}T00:00:00`)
  if (Number.isNaN(targetDate.getTime())) {
    return dateKey
  }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate())

  if (target.getTime() === today.getTime()) {
    return t('planner.today')
  }

  if (target.getTime() === tomorrow.getTime()) {
    return t('planner.tomorrow')
  }

  return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'tr-TR', {
    weekday: 'long',
  }).format(targetDate)
}

function PlannerPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const plannedMeals = usePlannerStore((state) => state.plannedMeals)
  const markPlannedMealCompleted = usePlannerStore((state) => state.markPlannedMealCompleted)
  const removePlannedMeal = usePlannerStore((state) => state.removePlannedMeal)
  const saveRecipe = useRecipeStore((state) => state.saveRecipe)
  const consumeRecipeIngredients = usePantryStore((state) => state.consumeRecipeIngredients)
  const showToast = usePantryStore((state) => state.showToast)

  const groupedMeals = useMemo(() => {
    const map = new Map()

    plannedMeals
      .slice()
      .sort((left, right) => left.date.localeCompare(right.date))
      .forEach((meal) => {
        if (!map.has(meal.date)) {
          map.set(meal.date, {
            dayLabel: getDayLabel(meal.date, t, i18n.language),
            byType: {
              ogle: [],
              aksam: [],
            },
          })
        }

        const group = map.get(meal.date)
        const safeType = mealTypeOrder.includes(meal.mealType) ? meal.mealType : 'ogle'
        group.byType[safeType].push(meal)
      })

    return Array.from(map.entries()).map(([date, data]) => ({
      date,
      ...data,
    }))
  }, [plannedMeals, t, i18n.language])

  const handleCookMeal = (plannedMeal) => {
    if (plannedMeal.completed) {
      return
    }

    const ingredientsForConsume = (Array.isArray(plannedMeal?.recipe?.matchedIngredients)
      ? plannedMeal.recipe.matchedIngredients
      : []
    )
      .map((ingredient) => ({
        name: String(ingredient?.isim ?? '').trim(),
        baseAmount: toNumberFromAmount(ingredient?.miktar),
        unit: String(ingredient?.birim ?? 'adet').trim() || 'adet',
      }))
      .filter((ingredient) => ingredient.name && ingredient.baseAmount > 0)

    consumeRecipeIngredients({
      ingredients: ingredientsForConsume,
      portionSize: plannedMeal.portionSize,
    })

    markPlannedMealCompleted(plannedMeal.id)
    showToast(t('planner.completedToast', { name: plannedMeal?.recipe?.tarifAdi || t('planner.meal') }))
  }

  const handleOpenMealDetail = (plannedMeal) => {
    const savedRecipe = saveRecipe(plannedMeal?.recipe, {
      source: 'planner',
    })

    if (savedRecipe?.id) {
      navigate(`/recipes/${savedRecipe.id}`)
    }
  }

  return (
    <section className="space-y-4 pb-20">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sand-700 dark:text-slate-400">
          {t('planner.badge')}
        </p>
        <h1 className="heading-display mt-2 text-3xl font-semibold text-sand-900 dark:text-slate-100">
          {t('planner.title')}
        </h1>
      </header>

      {groupedMeals.length === 0 ? (
        <article className="glass-panel soft-card rounded-2xl border border-white/50 bg-white/70 p-4 dark:border-slate-700/50 dark:bg-slate-900/60">
          <p className="text-sm text-slate-600 dark:text-slate-300">{t('planner.emptyDescription')}</p>
        </article>
      ) : (
        groupedMeals.map((dayGroup) => (
          <article key={dayGroup.date} className="glass-panel soft-card rounded-2xl p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              {dayGroup.dayLabel}
            </p>

            {mealTypeOrder.map((mealType) => (
              <div key={`${dayGroup.date}-${mealType}`} className="mt-3 space-y-2">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {mealType === 'ogle' ? t('planner.lunch') : t('planner.dinner')}
                </p>

                {dayGroup.byType[mealType].length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t('planner.noMeal')}</p>
                ) : (
                  dayGroup.byType[mealType].map((meal) => (
                    <PlannedMealCard
                      key={meal.id}
                      meal={meal}
                      onOpenDetail={handleOpenMealDetail}
                      onCookMeal={handleCookMeal}
                      onRemoveMeal={removePlannedMeal}
                    />
                  ))
                )}
              </div>
            ))}
          </article>
        ))
      )}
    </section>
  )
}

export default PlannerPage
