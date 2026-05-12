import { AlertTriangle, CheckCircle2, Clock3, Sparkles } from 'lucide-react'
import PropTypes from 'prop-types'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import MealPlanSheet from './meal-plan-sheet'
import TapButton from './tap-button'
import { usePantryStore } from '../store/pantry-store'
import { usePlannerStore } from '../store/planner-store'

const normalizeCompactIngredient = (ingredient) => ({
  isim: String(ingredient?.isim ?? ingredient?.name ?? '').trim(),
  miktar: String(ingredient?.miktar ?? ingredient?.baseAmount ?? '1').trim() || '1',
  birim: String(ingredient?.birim ?? ingredient?.unit ?? 'adet').trim() || 'adet',
})

const RECIPE_IMAGE_PLACEHOLDER = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fef3c7"/><stop offset="100%" stop-color="#fcd34d"/></linearGradient></defs><rect width="1024" height="1024" fill="url(#g)"/><text x="512" y="520" text-anchor="middle" font-family="Arial, sans-serif" font-size="72" fill="#78350f">KAPYA</text></svg>',
)}`

const getTodayDate = () => new Date().toISOString().slice(0, 10)

function RecipeCard({ recipe }) {
  const { t } = useTranslation()
  const showToast = usePantryStore((state) => state.showToast)
  const addPlannedMeal = usePlannerStore((state) => state.addPlannedMeal)

  const [isPlanSheetOpen, setIsPlanSheetOpen] = useState(false)
  const [plannedDate, setPlannedDate] = useState(getTodayDate)
  const [mealType, setMealType] = useState('ogle')
  const [portionSize, setPortionSize] = useState(2)

  const matchedIngredients = useMemo(
    () =>
      (Array.isArray(recipe?.matchedIngredients) ? recipe.matchedIngredients : [])
        .map(normalizeCompactIngredient)
        .filter((ingredient) => ingredient.isim),
    [recipe],
  )

  const missingIngredients = useMemo(
    () =>
      (Array.isArray(recipe?.missingIngredients) ? recipe.missingIngredients : [])
        .map(normalizeCompactIngredient)
        .filter((ingredient) => ingredient.isim),
    [recipe],
  )

  const cookingSteps = useMemo(
    () =>
      (Array.isArray(recipe?.pisirmeAdimlari) ? recipe.pisirmeAdimlari : [])
        .map((step) => String(step ?? '').trim())
        .filter(Boolean),
    [recipe],
  )

  const compactRecipe = useMemo(
    () => ({
      tarifAdi: String(recipe?.tarifAdi ?? '').trim(),
      kisaAciklama: String(recipe?.kisaAciklama ?? '').trim(),
      tahminiSure: String(recipe?.tahminiSure ?? recipe?.tahminiSuresi ?? '').trim(),
      goruntuUrl: String(recipe?.goruntuUrl ?? '').trim(),
      matchedIngredients,
      missingIngredients,
      pisirmeAdimlari: cookingSteps,
    }),
    [recipe, matchedIngredients, missingIngredients, cookingSteps],
  )

  const handlePlanRecipe = () => {
    addPlannedMeal({
      date: plannedDate,
      mealType,
      portionSize,
      recipe: compactRecipe,
    })

    setIsPlanSheetOpen(false)
    showToast(t('planner.planSavedToast'))
  }

  const openPlanSheet = () => {
    setPlannedDate(getTodayDate())
    setMealType('ogle')
    setPortionSize(2)
    setIsPlanSheetOpen(true)
  }

  return (
    <article className="glass-panel soft-card rounded-2xl border border-sage-200/65 bg-white/75 p-4 dark:border-sage-900/40 dark:bg-slate-900/60">
      <div className="mx-auto aspect-square w-full max-w-[420px] overflow-hidden rounded-2xl border border-white/60 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
        <img
          src={recipe?.goruntuUrl || RECIPE_IMAGE_PLACEHOLDER}
          alt={recipe?.tarifAdi || 'Tarif gorseli'}
          className="h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.onerror = null
            event.currentTarget.src = RECIPE_IMAGE_PLACEHOLDER
          }}
          loading="lazy"
        />
      </div>

      <div className="mt-3">
        <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{recipe?.tarifAdi}</p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{recipe?.kisaAciklama}</p>
        <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
          {t('recipes.timeLabel', { time: recipe?.tahminiSure || recipe?.tahminiSuresi || '-' })}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/75 p-3 dark:border-emerald-800/70 dark:bg-emerald-950/25">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800 dark:text-emerald-200">
            {t('recipes.matchedIngredientsTitle')}
          </p>
          <ul className="mt-2 space-y-1.5">
            {matchedIngredients.length > 0 ? (
              matchedIngredients.map((ingredient) => (
                <li key={`${ingredient.isim}-matched`} className="flex items-center gap-2 text-xs text-emerald-900 dark:text-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{ingredient.isim}</span>
                  <span className="ml-auto shrink-0">{ingredient.miktar} {ingredient.birim}</span>
                </li>
              ))
            ) : (
              <li className="text-xs text-emerald-800/80 dark:text-emerald-300/80">{t('recipes.noMatchedIngredients')}</li>
            )}
          </ul>
        </div>

        <div className="rounded-xl border border-rose-200/70 bg-rose-50/75 p-3 dark:border-rose-800/70 dark:bg-rose-950/25">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-800 dark:text-rose-200">
            {t('recipes.missingIngredientsTitle')}
          </p>
          <ul className="mt-2 space-y-1.5">
            {missingIngredients.length > 0 ? (
              missingIngredients.map((ingredient) => (
                <li key={`${ingredient.isim}-missing`} className="flex items-center gap-2 text-xs text-rose-900 dark:text-rose-200">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{ingredient.isim}</span>
                  <span className="ml-auto shrink-0">{ingredient.miktar} {ingredient.birim}</span>
                </li>
              ))
            ) : (
              <li className="text-xs text-rose-800/80 dark:text-rose-300/80">{t('recipes.noMissingIngredients')}</li>
            )}
          </ul>
        </div>
      </div>

      <details className="mt-4 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/65">
        <summary className="cursor-pointer text-sm font-semibold text-slate-800 dark:text-slate-100">
          {t('recipes.stepsTitle')}
        </summary>
        <ol className="mt-2 space-y-1.5 pl-4 text-xs text-slate-700 dark:text-slate-300">
          {cookingSteps.map((step, index) => (
            <li key={`${recipe?.tarifAdi || 'tarif'}-step-${index}`}>{step}</li>
          ))}
        </ol>
      </details>

      <TapButton
        type="button"
        onClick={openPlanSheet}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-kapya-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-kapya-700"
      >
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        {t('recipes.planButton')}
      </TapButton>

      <MealPlanSheet
        isOpen={isPlanSheetOpen}
        mealDate={plannedDate}
        mealType={mealType}
        portionSize={portionSize}
        onDateChange={setPlannedDate}
        onMealTypeChange={setMealType}
        onPortionSizeChange={setPortionSize}
        onClose={() => setIsPlanSheetOpen(false)}
        onSubmit={handlePlanRecipe}
        labels={{
          title: t('planner.sheetTitle'),
          dayLabel: t('planner.dayLabel'),
          mealTypeLabel: t('planner.mealTypeLabel'),
          portionLabel: t('planner.portionLabel'),
          lunch: t('planner.lunch'),
          dinner: t('planner.dinner'),
          cancelButton: t('planner.cancelButton'),
          saveButton: t('planner.saveButton'),
        }}
      />
    </article>
  )
}

export default RecipeCard

RecipeCard.propTypes = {
  recipe: PropTypes.shape({
    tarifAdi: PropTypes.string,
    kisaAciklama: PropTypes.string,
    tahminiSure: PropTypes.string,
    tahminiSuresi: PropTypes.string,
    goruntuUrl: PropTypes.string,
    matchedIngredients: PropTypes.arrayOf(
      PropTypes.shape({
        isim: PropTypes.string,
        miktar: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        birim: PropTypes.string,
      }),
    ),
    missingIngredients: PropTypes.arrayOf(
      PropTypes.shape({
        isim: PropTypes.string,
        miktar: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        birim: PropTypes.string,
      }),
    ),
    pisirmeAdimlari: PropTypes.arrayOf(PropTypes.string),
  }),
}