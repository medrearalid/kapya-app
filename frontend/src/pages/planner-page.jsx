import { LoaderCircle, Sparkles, Wand2 } from 'lucide-react'
import PropTypes from 'prop-types'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import PlannedMealCard from '../components/planned-meal-card'
import TapButton from '../components/tap-button'
import { generateRecipeByName } from '../services/recipe-agent-api'
import { usePantryStore } from '../store/pantry-store'
import { usePlannerStore } from '../store/planner-store'
import { toPlannerRecipe, useRecipeStore } from '../store/recipe-store'

const mealTypeOrder = ['kahvalti', 'ogle', 'aksam']

const mealNameByType = {
  kahvalti: 'Kahvalti onerisi',
  ogle: 'Ogle yemegi onerisi',
  aksam: 'Aksam yemegi onerisi',
}

const getDateKeyFromOffset = (offset) => {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  return date.toISOString().slice(0, 10)
}

const getDateKeys = (dayCount) =>
  Array.from({ length: Math.max(1, dayCount) }, (_item, index) => getDateKeyFromOffset(index))

const normalizeKey = (value) => String(value ?? '').trim().toLocaleLowerCase('tr-TR')

const toNumberFromAmount = (value) => {
  const text = String(value ?? '').trim().replaceAll(',', '.')
  if (!text) {
    return 1
  }

  const direct = Number(text)
  if (Number.isFinite(direct) && direct > 0) {
    return direct
  }

  const fractionMatch = /([\d.]+)\s*\/\s*([\d.]+)/.exec(text)
  if (fractionMatch) {
    const numerator = Number(fractionMatch[1])
    const denominator = Number(fractionMatch[2])
    if (Number.isFinite(numerator) && Number.isFinite(denominator) && denominator > 0) {
      return numerator / denominator
    }
  }

  const numericPrefix = Number.parseFloat(text)
  return Number.isFinite(numericPrefix) && numericPrefix > 0 ? numericPrefix : 1
}

const getIngredientNames = (recipe) => {
  const matched = Array.isArray(recipe?.malzemeler?.matched) ? recipe.malzemeler.matched : []
  const missing = Array.isArray(recipe?.malzemeler?.missing) ? recipe.malzemeler.missing : []

  return [...matched, ...missing]
    .map((item) => String(item?.isim ?? item?.name ?? '').trim())
    .filter(Boolean)
}

const getMealTypeFitScore = (recipe, mealType) => {
  const text = `${recipe?.isim || ''} ${recipe?.aciklama || ''}`.toLocaleLowerCase('tr-TR')

  const breakfastWords = ['kahvalti', 'menemen', 'omlet', 'yulaf', 'pankek', 'toast', 'tost']
  const dinnerWords = ['guvec', 'tencere', 'firin', 'sote', 'kofte', 'corba', 'pilav', 'makarna']

  const includesAny = (words) => words.some((word) => text.includes(word))

  if (mealType === 'kahvalti') {
    if (includesAny(breakfastWords)) return 2.4
    if (includesAny(dinnerWords)) return 0.3
    return 1.2
  }

  if (mealType === 'aksam') {
    if (includesAny(dinnerWords)) return 2.2
    if (includesAny(breakfastWords)) return 0.4
    return 1.4
  }

  if (includesAny(breakfastWords)) return 0.8
  if (includesAny(dinnerWords)) return 1.7
  return 1.5
}

const toSlotKey = (date, mealType) => `${date}-${mealType}`

const getMealTypeLabel = (mealType, t) => {
  if (mealType === 'kahvalti') {
    return t('planner.breakfast')
  }

  if (mealType === 'ogle') {
    return t('planner.lunch')
  }

  return t('planner.dinner')
}

function AutoPlanSheet({ isOpen, dayCount, personCount, onDayCountChange, onPersonCountChange, onClose, onConfirm, t }) {
  if (!isOpen) {
    return null
  }

  return (
    <dialog open className="fixed inset-0 z-[80] flex items-end bg-black/45 p-3 sm:p-6">
      <div className="glass-panel mx-auto w-full max-w-md rounded-2xl border border-white/60 bg-white/95 p-4 dark:border-slate-700/60 dark:bg-slate-900/95">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          {t('planner.autoPlanTitle')}
        </p>

        <div className="mt-3 space-y-3">
          <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
            <span className="mb-1 block text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
              {t('planner.autoPlanDayCount')}
            </span>
            <input
              type="number"
              min="1"
              max="7"
              value={dayCount}
              onChange={(event) => onDayCountChange(event.target.value)}
              className="w-full rounded-xl border border-white/55 bg-white/80 px-3 py-2 text-sm outline-none ring-kapya-300 focus:ring-2 dark:border-slate-700 dark:bg-slate-800"
            />
          </label>

          <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
            <span className="mb-1 block text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
              {t('planner.autoPlanPersonCount')}
            </span>
            <input
              type="number"
              min="1"
              max="10"
              value={personCount}
              onChange={(event) => onPersonCountChange(event.target.value)}
              className="w-full rounded-xl border border-white/55 bg-white/80 px-3 py-2 text-sm outline-none ring-kapya-300 focus:ring-2 dark:border-slate-700 dark:bg-slate-800"
            />
          </label>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <TapButton
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            {t('planner.cancelButton')}
          </TapButton>
          <TapButton
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-kapya-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            {t('planner.autoPlanConfirmButton')}
          </TapButton>
        </div>
      </div>
    </dialog>
  )
}

AutoPlanSheet.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  dayCount: PropTypes.number.isRequired,
  personCount: PropTypes.number.isRequired,
  onDayCountChange: PropTypes.func.isRequired,
  onPersonCountChange: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
}

function PlannerPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  const plannedMeals = usePlannerStore((state) => state.plannedMeals)
  const addPlannedMeal = usePlannerStore((state) => state.addPlannedMeal)
  const removePlannedMeal = usePlannerStore((state) => state.removePlannedMeal)
  const markPlannedMealCompleted = usePlannerStore((state) => state.markPlannedMealCompleted)

  const pantryProducts = usePantryStore((state) => state.products)
  const consumeRecipeIngredients = usePantryStore((state) => state.consumeRecipeIngredients)
  const showToast = usePantryStore((state) => state.showToast)

  const savedRecipes = useRecipeStore((state) => state.savedRecipes)
  const saveRecipe = useRecipeStore((state) => state.saveRecipe)

  const [isAutoPlanSheetOpen, setIsAutoPlanSheetOpen] = useState(false)
  const [autoPlanDayCount, setAutoPlanDayCount] = useState(3)
  const [autoPlanPersonCount, setAutoPlanPersonCount] = useState(2)
  const [visibleDayCount, setVisibleDayCount] = useState(7)
  const [selectedDay, setSelectedDay] = useState(getDateKeyFromOffset(0))
  const [loadingSlotKey, setLoadingSlotKey] = useState('')

  const availablePantryProducts = useMemo(
    () =>
      pantryProducts
        .filter((product) => String(product?.status ?? '').trim() !== 'tukendi' && Number(product?.quantity) > 0)
        .map((item) => ({
          name: String(item?.name ?? '').trim(),
          quantity: Number(item?.quantity) || 0,
          unit: String(item?.unit ?? 'adet').trim() || 'adet',
        }))
        .filter((item) => item.name),
    [pantryProducts],
  )

  const dayKeys = useMemo(() => {
    const base = getDateKeys(visibleDayCount)
    const fromPlans = plannedMeals.map((meal) => meal.date)
    return Array.from(new Set([...base, ...fromPlans])).sort((left, right) => left.localeCompare(right))
  }, [plannedMeals, visibleDayCount])

  const activeSelectedDay = dayKeys.includes(selectedDay)
    ? selectedDay
    : dayKeys[0] || getDateKeyFromOffset(0)

  const mealByType = useMemo(() => {
    const result = {
      kahvalti: null,
      ogle: null,
      aksam: null,
    }

    for (const mealType of mealTypeOrder) {
      result[mealType] =
        plannedMeals.find((meal) => meal.date === activeSelectedDay && meal.mealType === mealType) || null
    }

    return result
  }, [activeSelectedDay, plannedMeals])

  const getDayPillLabel = (dateKey) => {
    const date = new Date(`${dateKey}T00:00:00`)
    if (Number.isNaN(date.getTime())) {
      return dateKey
    }

    const weekday = new Intl.DateTimeFormat(i18n.language === 'en' ? 'en-US' : 'tr-TR', {
      weekday: 'short',
    }).format(date)

    return `${weekday} ${date.getDate()}`
  }

  const handleOpenMealDetail = (plannedMeal) => {
    const saved = saveRecipe(plannedMeal?.recipe, { source: 'planner' })
    if (saved?.id) {
      navigate(`/recipes/${saved.id}`)
    }
  }

  const handleCookMeal = (plannedMeal) => {
    if (plannedMeal.completed) {
      return
    }

    const allIngredients = [
      ...(Array.isArray(plannedMeal?.recipe?.matchedIngredients)
        ? plannedMeal.recipe.matchedIngredients
        : []),
      ...(Array.isArray(plannedMeal?.recipe?.missingIngredients)
        ? plannedMeal.recipe.missingIngredients
        : []),
    ]

    consumeRecipeIngredients({
      ingredients: allIngredients
        .map((ingredient) => ({
          name: String(ingredient?.isim ?? ingredient?.name ?? '').trim(),
          baseAmount: toNumberFromAmount(ingredient?.miktar ?? ingredient?.baseAmount),
          unit: String(ingredient?.birim ?? ingredient?.unit ?? 'adet').trim() || 'adet',
        }))
        .filter((ingredient) => ingredient.name && ingredient.baseAmount > 0),
      portionSize: plannedMeal.portionSize,
    })

    markPlannedMealCompleted(plannedMeal.id)
    showToast(t('planner.completedToast', { name: plannedMeal?.recipe?.tarifAdi || t('planner.meal') }))
  }

  const handleChefSuggestion = async ({ date, mealType, portionSize }) => {
    const slotKey = toSlotKey(date, mealType)
    if (loadingSlotKey === slotKey) {
      return
    }

    setLoadingSlotKey(slotKey)

    try {
      const recipe = await generateRecipeByName({
        mealName: mealNameByType[mealType] || 'Sef onerisi',
        mealType,
        pantryStock: availablePantryProducts,
      })

      const storedRecipe = saveRecipe(recipe, { source: 'planner-agent' })
      const plannerRecipe = toPlannerRecipe(storedRecipe || recipe)

      if (!plannerRecipe?.tarifAdi) {
        throw new Error('PLANNER_CHEF_RECIPE_EMPTY')
      }

      addPlannedMeal({
        date,
        mealType,
        portionSize,
        recipe: plannerRecipe,
      })

      showToast(t('planner.chefSuggestionAdded'))
    } catch {
      showToast(t('planner.chefSuggestionError'))
    } finally {
      setLoadingSlotKey('')
    }
  }

  const handleAutoPlan = () => {
    const dayCount = Math.min(7, Math.max(1, Number(autoPlanDayCount) || 1))
    const personCount = Math.min(10, Math.max(1, Number(autoPlanPersonCount) || 1))

    const pantryNameSet = new Set(availablePantryProducts.map((item) => normalizeKey(item.name)))
    const slotKeys = getDateKeys(dayCount).flatMap((date) =>
      mealTypeOrder.map((mealType) => ({ date, mealType, slotKey: toSlotKey(date, mealType) })),
    )

    const existingSlotSet = new Set(plannedMeals.map((meal) => toSlotKey(meal.date, meal.mealType)))
    const usedRecipeIds = new Set()

    let plannedCount = 0

    for (const slot of slotKeys) {
      if (existingSlotSet.has(slot.slotKey)) {
        continue
      }

      const candidate = savedRecipes
        .filter((recipe) => {
          const idKey = String(recipe?.id ?? '').trim()
          if (idKey && usedRecipeIds.has(idKey)) {
            return false
          }

          return Boolean(toPlannerRecipe(recipe)?.tarifAdi)
        })
        .map((recipe) => {
          const ingredientNames = getIngredientNames(recipe)
          const matchedCount = ingredientNames.filter((name) => pantryNameSet.has(normalizeKey(name))).length
          const fitScore = getMealTypeFitScore(recipe, slot.mealType)
          const score = fitScore + matchedCount / Math.max(ingredientNames.length || 1, 1)

          return { recipe, score }
        })
        .sort((left, right) => right.score - left.score)[0]?.recipe

      if (!candidate) {
        continue
      }

      const plannerRecipe = toPlannerRecipe(candidate)
      if (!plannerRecipe?.tarifAdi) {
        continue
      }

      const idKey = String(candidate?.id ?? '').trim()
      if (idKey) {
        usedRecipeIds.add(idKey)
      }

      addPlannedMeal({
        date: slot.date,
        mealType: slot.mealType,
        portionSize: personCount,
        recipe: plannerRecipe,
      })
      plannedCount += 1
    }

    setVisibleDayCount(dayCount)
    setSelectedDay(getDateKeyFromOffset(0))
    setIsAutoPlanSheetOpen(false)

    if (plannedCount > 0) {
      showToast(t('planner.autoPlanSuccess', { count: plannedCount }))
      return
    }

    showToast(t('planner.autoPlanNoLocalRecipe'))
  }

  return (
    <section className="space-y-4 pb-20">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sand-700 dark:text-slate-400">
            {t('planner.badge')}
          </p>
          <h1 className="heading-display mt-2 text-3xl font-semibold text-sand-900 dark:text-slate-100">
            {t('planner.title')}
          </h1>
        </div>

        <TapButton
          type="button"
          onClick={() => setIsAutoPlanSheetOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-kapya-600 px-3 py-2 text-xs font-semibold text-white"
        >
          <Wand2 className="h-4 w-4" aria-hidden="true" />
          {t('planner.autoPlanButton')}
        </TapButton>
      </header>

      <div className="no-scrollbar -mx-1 overflow-x-auto px-1">
        <div className="flex w-max min-w-full gap-2 pb-1">
          {dayKeys.map((dayKey) => {
            const isSelected = activeSelectedDay === dayKey
            return (
              <TapButton
                key={dayKey}
                type="button"
                onClick={() => setSelectedDay(dayKey)}
                className={[
                  'rounded-full border px-3.5 py-1.5 text-xs font-semibold transition',
                  isSelected
                    ? 'border-kapya-500 bg-kapya-600 text-white shadow-md shadow-kapya-700/15'
                    : 'border-slate-200/80 bg-slate-100/75 text-slate-700 dark:border-slate-600/80 dark:bg-slate-800/70 dark:text-slate-200',
                ].join(' ')}
              >
                {getDayPillLabel(dayKey)}
              </TapButton>
            )
          })}
        </div>
      </div>

      <article className="glass-panel soft-card rounded-2xl p-4">
        {mealTypeOrder.map((mealType) => {
          const plannedMeal = mealByType[mealType]
          const slotKey = toSlotKey(activeSelectedDay, mealType)
          const isLoadingSlot = loadingSlotKey === slotKey

          return (
            <div key={slotKey} className="mt-3 first:mt-0">
              <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {getMealTypeLabel(mealType, t)}
              </p>

              {plannedMeal ? (
                <PlannedMealCard
                  meal={plannedMeal}
                  onOpenDetail={handleOpenMealDetail}
                  onCookMeal={handleCookMeal}
                  onRemoveMeal={removePlannedMeal}
                />
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-3 dark:border-slate-600 dark:bg-slate-900/50">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('planner.emptySlot')}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <TapButton
                      type="button"
                      onClick={() =>
                        handleChefSuggestion({
                          date: activeSelectedDay,
                          mealType,
                          portionSize: Math.min(10, Math.max(1, Number(autoPlanPersonCount) || 2)),
                        })
                      }
                      disabled={isLoadingSlot}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-70 dark:bg-kapya-700"
                    >
                      {isLoadingSlot ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Sparkles className="h-4 w-4" aria-hidden="true" />
                      )}
                      {t('planner.getChefSuggestion')}
                    </TapButton>

                    <TapButton
                      type="button"
                      onClick={() =>
                        handleChefSuggestion({
                          date: activeSelectedDay,
                          mealType,
                          portionSize: Math.min(10, Math.max(1, Number(autoPlanPersonCount) || 2)),
                        })
                      }
                      disabled={isLoadingSlot}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-sm font-bold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                    >
                      +
                    </TapButton>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </article>

      <AutoPlanSheet
        isOpen={isAutoPlanSheetOpen}
        dayCount={autoPlanDayCount}
        personCount={autoPlanPersonCount}
        onDayCountChange={(value) => setAutoPlanDayCount(Math.min(7, Math.max(1, Number(value) || 1)))}
        onPersonCountChange={(value) =>
          setAutoPlanPersonCount(Math.min(10, Math.max(1, Number(value) || 1)))
        }
        onClose={() => setIsAutoPlanSheetOpen(false)}
        onConfirm={handleAutoPlan}
        t={t}
      />
    </section>
  )
}

export default PlannerPage
