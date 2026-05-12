import {
  ArrowLeft,
  Clock3,
  Flame,
  Heart,
  Sparkles,
  TimerReset,
  Users,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import MealPlanSheet from '../components/meal-plan-sheet'
import TapButton from '../components/tap-button'
import { usePantryStore } from '../store/pantry-store'
import { usePlannerStore } from '../store/planner-store'
import { toPlannerRecipe, useRecipeStore } from '../store/recipe-store'

const RECIPE_IMAGE_PLACEHOLDER = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fef3c7"/><stop offset="100%" stop-color="#fcd34d"/></linearGradient></defs><rect width="1024" height="1024" fill="url(#g)"/><text x="512" y="520" text-anchor="middle" font-family="Arial, sans-serif" font-size="72" fill="#78350f">CHEF</text></svg>',
)}`

const getTodayDate = () => new Date().toISOString().slice(0, 10)

function RecipeDetailPage() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { recipeId } = useParams()
  const savedRecipes = useRecipeStore((state) => state.savedRecipes)
  const toggleFavorite = useRecipeStore((state) => state.toggleFavorite)
  const addPlannedMeal = usePlannerStore((state) => state.addPlannedMeal)
  const showToast = usePantryStore((state) => state.showToast)

  const [isPlanSheetOpen, setIsPlanSheetOpen] = useState(false)
  const [mealDate, setMealDate] = useState(getTodayDate)
  const [mealType, setMealType] = useState('ogle')
  const [portionSize, setPortionSize] = useState(2)

  const recipe = useMemo(
    () => savedRecipes.find((item) => item.id === recipeId) || null,
    [savedRecipes, recipeId],
  )

  const plannerRecipe = useMemo(() => toPlannerRecipe(recipe), [recipe])
  const formattedPortionCost = useMemo(
    () =>
      new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        maximumFractionDigits: 2,
      }).format(Math.max(0, Number(recipe?.porsiyonMaliyetiTl) || 0)),
    [recipe?.porsiyonMaliyetiTl],
  )
  const hasSmartChefEntryAnimation = Boolean(location.state?.fromChefHub)

  if (!recipe) {
    return (
      <section className="space-y-4 pb-24">
        <TapButton
          type="button"
          onClick={() => navigate('/recipes')}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t('recipes.backToLibrary')}
        </TapButton>

        <article className="glass-panel soft-card rounded-2xl border border-white/50 bg-white/70 p-4 dark:border-slate-700/50 dark:bg-slate-900/60">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {t('recipes.detailNotFoundTitle')}
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {t('recipes.detailNotFoundDescription')}
          </p>
        </article>
      </section>
    )
  }

  const handlePlanRecipe = () => {
    if (!plannerRecipe) {
      return
    }

    addPlannedMeal({
      date: mealDate,
      mealType,
      portionSize,
      recipe: plannerRecipe,
    })

    setIsPlanSheetOpen(false)
    showToast(t('planner.planSavedToast'))
  }

  const openPlanSheet = () => {
    setMealDate(getTodayDate())
    setMealType('ogle')
    setPortionSize(2)
    setIsPlanSheetOpen(true)
  }

  const handleToggleFavorite = () => {
    toggleFavorite(recipe.id)
    showToast(t('recipes.favoriteSavedToast'))
  }

  return (
    <motion.section
      initial={hasSmartChefEntryAnimation ? { opacity: 0, y: 18, scale: 0.985 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.32, ease: 'easeOut' }}
      className="space-y-4 pb-32"
    >
      <div className="relative overflow-hidden rounded-3xl border border-white/55 bg-white/60 dark:border-slate-700/55 dark:bg-slate-900/60">
        <img
          src={recipe.nanoBananaGorseli || RECIPE_IMAGE_PLACEHOLDER}
          alt={recipe.isim}
          className="h-[46vh] min-h-[280px] w-full object-cover"
          onError={(event) => {
            event.currentTarget.onerror = null
            event.currentTarget.src = RECIPE_IMAGE_PLACEHOLDER
          }}
        />

        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
          <TapButton
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 rounded-xl bg-black/55 px-3 py-2 text-xs font-semibold text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            {t('recipes.backButton')}
          </TapButton>

          <TapButton
            type="button"
            onClick={handleToggleFavorite}
            className={[
              'inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold text-white',
              recipe.isFavorite ? 'bg-kapya-600' : 'bg-black/55',
            ].join(' ')}
          >
            <Heart className="h-3.5 w-3.5" aria-hidden="true" />
            {recipe.isFavorite ? t('recipes.favoritedButton') : t('recipes.favoriteButton')}
          </TapButton>
        </div>

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/55 to-transparent p-4 text-white">
          <p className="text-xs uppercase tracking-[0.16em] text-white/80">{t('recipes.chefAssistantTitle')}</p>
          <h1 className="mt-1 text-2xl font-semibold">{recipe.isim}</h1>
          <p className="mt-1 text-sm text-white/90">{recipe.aciklama}</p>
        </div>
      </div>

      <article className="glass-panel soft-card rounded-2xl p-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-slate-100/75 p-2 dark:bg-slate-800/70">
            <Clock3 className="mx-auto h-4 w-4 text-slate-700 dark:text-slate-200" aria-hidden="true" />
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
              {t('recipes.summaryTime')}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-900 dark:text-slate-100">{recipe.sure}</p>
          </div>

          <div className="rounded-xl bg-slate-100/75 p-2 dark:bg-slate-800/70">
            <Flame className="mx-auto h-4 w-4 text-slate-700 dark:text-slate-200" aria-hidden="true" />
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
              {t('recipes.summaryCalories')}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-900 dark:text-slate-100">{recipe.kalori}</p>
          </div>

          <div className="rounded-xl bg-slate-100/75 p-2 dark:bg-slate-800/70">
            <TimerReset
              className="mx-auto h-4 w-4 text-slate-700 dark:text-slate-200"
              aria-hidden="true"
            />
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
              {t('recipes.summaryDifficulty')}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-900 dark:text-slate-100">{recipe.zorluk}</p>
          </div>
        </div>

        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-kapya-50 px-3 py-1.5 text-xs font-semibold text-kapya-800 dark:bg-kapya-900/35 dark:text-kapya-200">
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
          {recipe.porsiyon}
        </div>

        <p className="mt-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          {t('recipes.portionCostLabel')}: {formattedPortionCost}
        </p>
      </article>

      <article className="glass-panel soft-card rounded-2xl p-4">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          {t('recipes.ingredientsSection')}
        </h2>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/70 p-3 dark:border-emerald-800/70 dark:bg-emerald-950/25">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800 dark:text-emerald-200">
              {t('recipes.matchedIngredientsTitle')}
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-emerald-900 dark:text-emerald-200">
              {recipe.malzemeler.matched.map((ingredient) => (
                <li key={`${ingredient.isim}-matched`} className="flex items-center gap-2">
                  <span>{ingredient.isim}</span>
                  <span className="ml-auto text-xs">
                    {ingredient.miktar} {ingredient.birim}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-rose-200/70 bg-rose-50/70 p-3 dark:border-rose-800/70 dark:bg-rose-950/25">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-800 dark:text-rose-200">
              {t('recipes.missingIngredientsTitle')}
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-rose-900 dark:text-rose-200">
              {recipe.malzemeler.missing.length > 0 ? (
                recipe.malzemeler.missing.map((ingredient) => (
                  <li key={`${ingredient.isim}-missing`} className="flex items-center gap-2">
                    <span>{ingredient.isim}</span>
                    <span className="ml-auto text-xs">
                      {ingredient.miktar} {ingredient.birim}
                    </span>
                  </li>
                ))
              ) : (
                <li className="text-xs text-rose-900/75 dark:text-rose-200/75">
                  {t('recipes.noMissingIngredients')}
                </li>
              )}
            </ul>
          </div>
        </div>
      </article>

      <article className="glass-panel soft-card rounded-2xl p-4">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          {t('recipes.stepsImmersiveTitle')}
        </h2>
        <ol className="mt-3 space-y-2">
          {recipe.adimlar.map((step, index) => (
            <li key={`${recipe.id}-step-${index}`} className="flex gap-3 rounded-xl bg-white/70 p-3 dark:bg-slate-800/60">
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-kapya-600 text-xs font-semibold text-white">
                {index + 1}
              </span>
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{step}</p>
            </li>
          ))}
        </ol>
      </article>

      <article className="glass-panel soft-card rounded-2xl border border-kapya-200/70 bg-gradient-to-br from-kapya-50/70 via-white to-sage-50/60 p-4 dark:border-kapya-900/45 dark:from-kapya-950/25 dark:via-slate-900/70 dark:to-sage-900/20">
        <h2 className="inline-flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-100">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {t('recipes.tipsSection')}
        </h2>
        <ul className="mt-3 space-y-2">
          {recipe.pufNoktalari.map((tip, index) => (
            <li
              key={`${recipe.id}-tip-${index}`}
              className="rounded-xl bg-white/75 p-3 text-sm text-slate-700 dark:bg-slate-800/65 dark:text-slate-200"
            >
              {tip}
            </li>
          ))}
        </ul>
      </article>

      <div className="fixed inset-x-0 bottom-20 z-40 px-4 sm:px-6">
        <div className="mx-auto flex w-full max-w-3xl gap-2 rounded-2xl border border-white/55 bg-white/88 p-2 shadow-soft backdrop-blur dark:border-slate-700/55 dark:bg-slate-900/85">
          <TapButton
            type="button"
            onClick={openPlanSheet}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-kapya-600 px-4 py-3 text-sm font-semibold text-white hover:bg-kapya-700"
          >
            <Users className="h-4 w-4" aria-hidden="true" />
            {t('recipes.planButton')}
          </TapButton>

          <TapButton
            type="button"
            onClick={handleToggleFavorite}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            <Heart className="h-4 w-4" aria-hidden="true" />
            {t('recipes.favoriteButton')}
          </TapButton>
        </div>
      </div>

      <MealPlanSheet
        isOpen={isPlanSheetOpen}
        mealDate={mealDate}
        mealType={mealType}
        portionSize={portionSize}
        onDateChange={setMealDate}
        onMealTypeChange={setMealType}
        onPortionSizeChange={setPortionSize}
        onClose={() => setIsPlanSheetOpen(false)}
        onSubmit={handlePlanRecipe}
        labels={{
          title: t('planner.sheetTitle'),
          dayLabel: t('planner.dayLabel'),
          mealTypeLabel: t('planner.mealTypeLabel'),
          portionLabel: t('planner.portionLabel'),
          breakfast: t('planner.breakfast'),
          lunch: t('planner.lunch'),
          dinner: t('planner.dinner'),
          cancelButton: t('planner.cancelButton'),
          saveButton: t('planner.saveButton'),
        }}
      />
    </motion.section>
  )
}

export default RecipeDetailPage
