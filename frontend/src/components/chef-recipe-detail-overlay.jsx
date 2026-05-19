import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Heart,
  Sparkles,
  TimerReset,
  Users,
  X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import PropTypes from 'prop-types'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import MealPlanSheet from './meal-plan-sheet'
import TapButton from './tap-button'
import { usePantryStore } from '../store/pantry-store'
import { usePlannerStore } from '../store/planner-store'
import { toPlannerRecipe, useRecipeStore } from '../store/recipe-store'

const getTodayDate = () => new Date().toISOString().slice(0, 10)
const asArray = (value) => (Array.isArray(value) ? value : [])

function SummaryStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-[#f7f4f0] p-2.5 text-center dark:border-slate-700/70 dark:bg-slate-800/60">
      <Icon className="mx-auto h-4 w-4 text-[#4b4b4b] dark:text-slate-200" aria-hidden="true" />
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#737373] dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-xs font-semibold text-[#050505] dark:text-slate-100">{value}</p>
    </div>
  )
}

SummaryStat.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
}

function IngredientListCard({ title, items, emptyText }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-[#f7f4f0] p-3 dark:border-slate-700/70 dark:bg-slate-800/60">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#4b4b4b] dark:text-slate-200">
        {title}
      </p>

      {items.length === 0 ? (
        <p className="mt-2 text-xs text-[#737373] dark:text-slate-300/85">{emptyText}</p>
      ) : (
        <ul className="mt-2 space-y-1.5 text-sm text-[#171717] dark:text-slate-200">
          {items.map((ingredient) => (
            <li key={`${ingredient.isim}-${ingredient.birim}`} className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span className="truncate">{ingredient.isim}</span>
              <span className="ml-auto shrink-0 text-xs">
                {ingredient.miktar} {ingredient.birim}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

IngredientListCard.propTypes = {
  title: PropTypes.string.isRequired,
  items: PropTypes.arrayOf(
    PropTypes.shape({
      isim: PropTypes.string,
      miktar: PropTypes.string,
      birim: PropTypes.string,
    }),
  ).isRequired,
  emptyText: PropTypes.string.isRequired,
}

function RecipeOverlayDialog({
  recipe,
  imageFallback,
  formattedPortionCost,
  matchedIngredients,
  missingIngredients,
  steps,
  tips,
  onClose,
  onToggleFavorite,
  onOpenPlanSheet,
  t,
}) {
  return (
    <motion.div
      className="fixed inset-0 z-[72] flex items-end bg-black/55 p-2 backdrop-blur-sm sm:p-5 md:items-center md:justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.button
        type="button"
        className="absolute inset-0"
        onClick={onClose}
        aria-label={t('recipes.closeDetailAria')}
      />

      <motion.article
        role="dialog"
        aria-modal="true"
        initial={{ opacity: 0, y: 16, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 14, scale: 0.985 }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
        className="feature-card relative z-10 flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden border border-black/10 bg-white dark:border-slate-700/60 dark:bg-slate-950"
      >
        <div className="relative overflow-hidden border-b border-black/10 dark:border-slate-700/60">
          <img
            src={recipe.nanoBananaGorseli || imageFallback}
            alt={recipe.isim}
            className="h-[32vh] min-h-[230px] w-full object-cover"
            onError={(event) => {
              event.currentTarget.onerror = null
              event.currentTarget.src = imageFallback
            }}
          />

          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
            <TapButton
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 rounded-xl bg-black/55 px-3 py-2 text-xs font-semibold text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              {t('recipes.backButton')}
            </TapButton>

            <div className="flex items-center gap-2">
              <TapButton
                type="button"
                onClick={onToggleFavorite}
                className={[
                  'inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold text-white',
                  recipe.isFavorite ? 'bg-rose-500' : 'bg-black/55',
                ].join(' ')}
              >
                <Heart className="h-3.5 w-3.5" aria-hidden="true" fill={recipe.isFavorite ? 'currentColor' : 'none'} />
                {recipe.isFavorite ? t('recipes.favoritedButton') : t('recipes.favoriteButton')}
              </TapButton>

              <TapButton
                type="button"
                onClick={onClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-black/55 text-white"
                aria-label={t('recipes.closeDetailAria')}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </TapButton>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/55 to-transparent p-4 text-white">
            <p className="text-xs uppercase tracking-[0.16em] text-white/80">{t('recipes.chefAssistantTitle')}</p>
            <h2 className="mt-1 text-2xl font-semibold">{recipe.isim}</h2>
            <p className="mt-1 text-sm text-white/90">{recipe.aciklama}</p>
          </div>
        </div>

        <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          <div className="grid grid-cols-3 gap-2">
            <SummaryStat icon={Clock3} label={t('recipes.summaryTime')} value={String(recipe.sure || '-')} />
            <SummaryStat icon={Sparkles} label={t('recipes.summaryCalories')} value={String(recipe.kalori || '-')} />
            <SummaryStat icon={TimerReset} label={t('recipes.summaryDifficulty')} value={String(recipe.zorluk || '-')} />
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-[#f4f1ee] px-3 py-1.5 text-xs font-semibold text-[#4b4b4b] dark:bg-slate-800 dark:text-slate-200">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            {recipe.porsiyon}
            <span className="text-[#737373] dark:text-slate-400">|</span>
            {t('recipes.portionCostLabel')}: {formattedPortionCost}
          </div>

          <section>
            <h3 className="text-base font-semibold text-[#050505] dark:text-slate-100">
              {t('recipes.ingredientsSection')}
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <IngredientListCard
                title={t('recipes.matchedIngredientsTitle')}
                items={matchedIngredients}
                emptyText={t('recipes.noMatchedIngredients')}
              />
              <IngredientListCard
                title={t('recipes.missingIngredientsTitle')}
                items={missingIngredients}
                emptyText={t('recipes.noMissingIngredients')}
              />
            </div>
          </section>

          <section>
            <h3 className="text-base font-semibold text-[#050505] dark:text-slate-100">{t('recipes.stepsImmersiveTitle')}</h3>
            <ol className="mt-3 space-y-2">
              {steps.map((step, index) => (
                <li key={`${recipe.id}-step-${index}`} className="flex gap-3 rounded-xl bg-[#f7f4f0] p-3 dark:bg-slate-800/60">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#171717] text-xs font-semibold text-white">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-[#4b4b4b] dark:text-slate-200">{step}</p>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h3 className="text-base font-semibold text-[#050505] dark:text-slate-100">{t('recipes.tipsSection')}</h3>
            <ul className="mt-3 space-y-2">
              {tips.map((tip, index) => (
                <li
                  key={`${recipe.id}-tip-${index}`}
                  className="rounded-xl bg-[#f7f4f0] p-3 text-sm text-[#4b4b4b] dark:bg-slate-800/65 dark:text-slate-200"
                >
                  {tip}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="border-t border-black/10 bg-white/92 p-3 dark:border-slate-700/60 dark:bg-slate-900/92">
          <div className="grid grid-cols-2 gap-2">
            <TapButton
              type="button"
              onClick={onOpenPlanSheet}
              className="primary-action-btn inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold"
            >
              <Users className="h-4 w-4" aria-hidden="true" />
              {t('recipes.planButton')}
            </TapButton>

            <TapButton
              type="button"
              onClick={onToggleFavorite}
              className="soft-highlight-btn inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold"
            >
              <Heart className="h-4 w-4" aria-hidden="true" fill={recipe.isFavorite ? 'currentColor' : 'none'} />
              {recipe.isFavorite ? t('recipes.favoritedButton') : t('recipes.favoriteButton')}
            </TapButton>
          </div>
        </div>
      </motion.article>
    </motion.div>
  )
}

RecipeOverlayDialog.propTypes = {
  recipe: PropTypes.object.isRequired,
  imageFallback: PropTypes.string.isRequired,
  formattedPortionCost: PropTypes.string.isRequired,
  matchedIngredients: PropTypes.array.isRequired,
  missingIngredients: PropTypes.array.isRequired,
  steps: PropTypes.array.isRequired,
  tips: PropTypes.array.isRequired,
  onClose: PropTypes.func.isRequired,
  onToggleFavorite: PropTypes.func.isRequired,
  onOpenPlanSheet: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
}

function ChefRecipeDetailOverlay({ isOpen, recipe, imageFallback, onClose }) {
  const { t } = useTranslation()
  const showToast = usePantryStore((state) => state.showToast)
  const addPlannedMeal = usePlannerStore((state) => state.addPlannedMeal)
  const toggleFavorite = useRecipeStore((state) => state.toggleFavorite)

  const [isPlanSheetOpen, setIsPlanSheetOpen] = useState(false)
  const [mealDate, setMealDate] = useState(getTodayDate)
  const [mealType, setMealType] = useState('ogle')
  const [portionSize, setPortionSize] = useState(2)

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

  const matchedIngredients = asArray(recipe?.malzemeler?.matched)
  const missingIngredients = asArray(recipe?.malzemeler?.missing)
  const steps = asArray(recipe?.adimlar)
  const tips = asArray(recipe?.pufNoktalari)

  const handleOpenPlanSheet = () => {
    setMealDate(getTodayDate())
    setMealType('ogle')
    setPortionSize(2)
    setIsPlanSheetOpen(true)
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

  const handleToggleFavorite = () => {
    const willBeFavorite = !recipe?.isFavorite
    toggleFavorite(recipe?.id)
    showToast(willBeFavorite ? t('recipes.favoriteSavedToast') : t('recipes.favoriteRemovedToast'))
  }

  return (
    <AnimatePresence>
      {isOpen && recipe ? (
        <>
          <RecipeOverlayDialog
            recipe={recipe}
            imageFallback={imageFallback}
            formattedPortionCost={formattedPortionCost}
            matchedIngredients={matchedIngredients}
            missingIngredients={missingIngredients}
            steps={steps}
            tips={tips}
            onClose={onClose}
            onToggleFavorite={handleToggleFavorite}
            onOpenPlanSheet={handleOpenPlanSheet}
            t={t}
          />

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
        </>
      ) : null}
    </AnimatePresence>
  )
}

ChefRecipeDetailOverlay.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  recipe: PropTypes.shape({
    id: PropTypes.string,
    isim: PropTypes.string,
    aciklama: PropTypes.string,
    kalori: PropTypes.string,
    porsiyon: PropTypes.string,
    sure: PropTypes.string,
    zorluk: PropTypes.string,
    isFavorite: PropTypes.bool,
    porsiyonMaliyetiTl: PropTypes.number,
    nanoBananaGorseli: PropTypes.string,
    adimlar: PropTypes.arrayOf(PropTypes.string),
    pufNoktalari: PropTypes.arrayOf(PropTypes.string),
    malzemeler: PropTypes.shape({
      matched: PropTypes.array,
      missing: PropTypes.array,
    }),
  }),
  imageFallback: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
}

ChefRecipeDetailOverlay.defaultProps = {
  recipe: null,
}

export default ChefRecipeDetailOverlay
