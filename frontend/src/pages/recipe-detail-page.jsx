import {
  ArrowLeft,
  Clock3,
  Flame,
  Heart,
  Sparkles,
  TimerReset,
  Users,
  Minus,
  Plus,
  Trash2,
  LoaderCircle,
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
import { generateRecipeByName } from '../services/recipe-agent-api'
import { useBehaviorStore } from '../store/behavior-store'

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
  const deleteRecipe = useRecipeStore((state) => state.deleteRecipe)
  const saveRecipe = useRecipeStore((state) => state.saveRecipe)
  const products = usePantryStore((state) => state.products)
  const addPlannedMeal = usePlannerStore((state) => state.addPlannedMeal)
  const showToast = usePantryStore((state) => state.showToast)
  const startAgentProcess = useBehaviorStore((state) => state.startAgentProcess)
  const finishAgentProcess = useBehaviorStore((state) => state.finishAgentProcess)

  const [isPlanSheetOpen, setIsPlanSheetOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [mealDate, setMealDate] = useState(getTodayDate)
  const [mealType, setMealType] = useState('ogle')
  const [portionSize, setPortionSize] = useState(2)

  const recipe = useMemo(
    () => savedRecipes.find((item) => item.id === recipeId) || null,
    [savedRecipes, recipeId],
  )

  const parsePortionSize = (portionStr) => {
    if (!portionStr) return 2
    const normalized = String(portionStr).toLowerCase()
    const match = normalized.match(/(\d+)/)
    if (match) {
      return parseInt(match[1], 10)
    }
    return 2
  }

  const originalPortions = useMemo(() => parsePortionSize(recipe?.porsiyon), [recipe?.porsiyon])
  const [currentPortions, setCurrentPortions] = useState(2)
  const [hasInitializedPortions, setHasInitializedPortions] = useState(false)

  if (recipe && !hasInitializedPortions) {
    const initPortions = parsePortionSize(recipe.porsiyon)
    setCurrentPortions(initPortions)
    setHasInitializedPortions(true)
  }

  const scaleIngredientAmount = (amountStr, orig, target) => {
    if (!amountStr) return ''
    const trimmed = String(amountStr).trim()
    const ratio = target / orig
    if (ratio === 1) return trimmed

    const fractionMatch = trimmed.match(/^(\d+)\/(\d+)$/)
    if (fractionMatch) {
      const num = parseFloat(fractionMatch[1])
      const den = parseFloat(fractionMatch[2])
      const val = (num / den) * ratio
      return formatScaledValue(val)
    }

    const numberMatch = trimmed.match(/^(\d+(?:\.\d+)?)$/)
    if (numberMatch) {
      const val = parseFloat(numberMatch[1]) * ratio
      return formatScaledValue(val)
    }

    return trimmed
  }

  const formatScaledValue = (val) => {
    if (val % 1 === 0) {
      return String(val)
    }
    const rounded = Math.round(val * 100) / 100
    return String(rounded)
  }

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
    if (isGenerating) {
      return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[6px] transition-all duration-300">
          <div className="flex flex-col items-center gap-4 rounded-3xl bg-white/95 p-8 shadow-2xl dark:bg-slate-900/95 border border-black/10 dark:border-slate-700/50 max-w-xs text-center">
            <div className="relative flex h-16 w-16 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
              <div className="relative rounded-full bg-amber-500 p-3.5 text-white">
                <LoaderCircle className="h-8 w-8 animate-spin" />
              </div>
            </div>
            <div>
              <p className="text-base font-bold text-[#050505] dark:text-slate-100">
                Yeni Tarif Hazırlanıyor
              </p>
              <p className="mt-1 text-xs text-[#4b4b4b] dark:text-slate-400">
                Şef dolabındaki malzemelere göre en lezzetli alternatifi hazırlıyor...
              </p>
            </div>
          </div>
        </div>
      )
    }

    return (
      <section className="space-y-4 pb-24">
        <TapButton
          type="button"
          onClick={() => navigate('/recipes')}
          className="soft-highlight-btn inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t('recipes.backToLibrary')}
        </TapButton>

        <article className="feature-card p-4">
          <p className="text-sm font-semibold text-[#050505] dark:text-slate-100">
            {t('recipes.detailNotFoundTitle')}
          </p>
          <p className="mt-1 text-sm text-[#4b4b4b] dark:text-slate-300">
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
    setPortionSize(currentPortions)
    setIsPlanSheetOpen(true)
  }

  const handleToggleFavorite = () => {
    toggleFavorite(recipe.id)
    showToast(t('recipes.favoriteSavedToast'))
  }

  const handleDeleteAndRegenerate = async () => {
    if (!recipe?.id) return

    showToast(t('recipes.deletingAndReplacing', { defaultValue: 'Tarif siliniyor ve yerine yenisi üretiliyor...' }))
    setIsGenerating(true)
    startAgentProcess()

    // Mevcut diğer tarif isimlerini topla (yeni üretilenle çakışmasın)
    const recentRecipeNames = savedRecipes.map((r) => r.isim)

    deleteRecipe(recipe.id)

    try {
      const generatedRecipe = await generateRecipeByName({
        pantryStock: products,
        isLucky: true,
        recentRecipeNames,
      })

      if (generatedRecipe) {
        const savedRecipe = saveRecipe(generatedRecipe, {
          source: 'home-recipe-inventory',
        })
        if (savedRecipe?.id) {
          navigate(`/recipes/${savedRecipe.id}`, { replace: true })
          showToast(t('recipes.replacementGenerated', { defaultValue: 'Yeni alternatif tarif başarıyla kütüphaneye eklendi!' }))
        } else {
          navigate('/recipes', { replace: true })
        }
      } else {
        throw new Error('Replacement recipe generation returned null')
      }
    } catch (err) {
      console.error('Failed to generate replacement recipe:', err)
      showToast(t('recipes.replacementFailed', { defaultValue: 'Yeni tarif üretilemedi, ancak tarif silindi.' }))
      navigate('/recipes', { replace: true })
    } finally {
      setIsGenerating(false)
      finishAgentProcess()
    }
  }

  return (
    <motion.section
      initial={hasSmartChefEntryAnimation ? { opacity: 0, y: 18, scale: 0.985 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.32, ease: 'easeOut' }}
      className="space-y-6 pb-32 md:pb-8"
    >
      <div className="relative overflow-hidden rounded-[20px] border border-black/10 bg-white shadow-soft dark:border-slate-700/55 dark:bg-slate-900/60">
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

          <div className="flex items-center gap-2">
            <TapButton
              type="button"
              onClick={handleDeleteAndRegenerate}
              className="inline-flex items-center gap-1 rounded-xl bg-rose-600/90 hover:bg-rose-700 px-3 py-2 text-xs font-semibold text-white transition-all shadow-lg"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              {t('recipes.deleteAndRegenerate', { defaultValue: 'Yenisini Üret' })}
            </TapButton>

            <TapButton
              type="button"
              onClick={handleToggleFavorite}
              className={[
                'inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold text-white',
                recipe.isFavorite ? 'bg-[#171717]' : 'bg-black/55',
              ].join(' ')}
            >
              <Heart className="h-3.5 w-3.5" aria-hidden="true" />
              {recipe.isFavorite ? t('recipes.favoritedButton') : t('recipes.favoriteButton')}
            </TapButton>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/55 to-transparent p-4 text-white">
          <p className="text-xs uppercase tracking-[0.16em] text-white/80">{t('recipes.chefAssistantTitle')}</p>
          <h1 className="mt-1 text-2xl font-semibold">{recipe.isim}</h1>
          <p className="mt-1 text-sm text-white/90">{recipe.aciklama}</p>
        </div>
      </div>

      <article className="feature-card p-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-[#f7f4f0] p-2 dark:bg-slate-800/70">
            <Clock3 className="mx-auto h-4 w-4 text-[#4b4b4b] dark:text-slate-200" aria-hidden="true" />
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#737373] dark:text-slate-400">
              {t('recipes.summaryTime')}
            </p>
            <p className="mt-1 text-xs font-semibold text-[#050505] dark:text-slate-100">{recipe.sure}</p>
          </div>

          <div className="rounded-xl bg-[#f7f4f0] p-2 dark:bg-slate-800/70">
            <Flame className="mx-auto h-4 w-4 text-[#4b4b4b] dark:text-slate-200" aria-hidden="true" />
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#737373] dark:text-slate-400">
              {t('recipes.summaryCalories')}
            </p>
            <p className="mt-1 text-xs font-semibold text-[#050505] dark:text-slate-100">{recipe.kalori}</p>
          </div>

          <div className="rounded-xl bg-[#f7f4f0] p-2 dark:bg-slate-800/70">
            <TimerReset
              className="mx-auto h-4 w-4 text-[#4b4b4b] dark:text-slate-200"
              aria-hidden="true"
            />
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#737373] dark:text-slate-400">
              {t('recipes.summaryDifficulty')}
            </p>
            <p className="mt-1 text-xs font-semibold text-[#050505] dark:text-slate-100">{recipe.zorluk}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-4 dark:border-slate-800">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#4b4b4b] dark:text-slate-400">
            {t('recipes.portionScaleLabel', { defaultValue: 'Kişi Sayısı' })}
          </span>
          <div className="inline-flex items-center gap-2 rounded-xl bg-[#f7f4f0] p-1 dark:bg-slate-800">
            <TapButton
              type="button"
              onClick={() => setCurrentPortions(Math.max(1, currentPortions - 1))}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[#171717] shadow-sm dark:bg-slate-700 dark:text-white"
              aria-label="Azalt"
            >
              <Minus className="h-3.5 w-3.5" aria-hidden="true" />
            </TapButton>
            <span className="min-w-8 text-center text-sm font-semibold text-[#050505] dark:text-white">
              {currentPortions} Kişilik
            </span>
            <TapButton
              type="button"
              onClick={() => setCurrentPortions(Math.min(24, currentPortions + 1))}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[#171717] shadow-sm dark:bg-slate-700 dark:text-white"
              aria-label="Artır"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            </TapButton>
          </div>
        </div>

        <p className="mt-4 text-sm font-semibold text-[#171717] dark:text-slate-100">
          {t('recipes.portionCostLabel')}: {formattedPortionCost}
        </p>
      </article>

      <article className="feature-card p-4">
        <h2 className="text-base font-semibold text-[#050505] dark:text-slate-100">
          {t('recipes.ingredientsSection')}
        </h2>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-black/10 bg-[#f7f4f0] p-3 dark:border-slate-700/70 dark:bg-slate-800/60">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#4b4b4b] dark:text-slate-200">
              {t('recipes.matchedIngredientsTitle')}
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-[#171717] dark:text-slate-200">
              {recipe.malzemeler.matched.map((ingredient) => (
                <li key={`${ingredient.isim}-matched`} className="flex items-center gap-2">
                  <span>{ingredient.isim}</span>
                  <span className="ml-auto text-xs font-medium">
                    {scaleIngredientAmount(ingredient.miktar, originalPortions, currentPortions)} {ingredient.birim}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-black/10 bg-[#ece7e2] p-3 dark:border-slate-700/70 dark:bg-slate-800/60">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#4b4b4b] dark:text-slate-200">
              {t('recipes.missingIngredientsTitle')}
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-[#171717] dark:text-slate-200">
              {recipe.malzemeler.missing.length > 0 ? (
                recipe.malzemeler.missing.map((ingredient) => (
                  <li key={`${ingredient.isim}-missing`} className="flex items-center gap-2">
                    <span>{ingredient.isim}</span>
                    <span className="ml-auto text-xs font-medium">
                      {scaleIngredientAmount(ingredient.miktar, originalPortions, currentPortions)} {ingredient.birim}
                    </span>
                  </li>
                ))
              ) : (
                <li className="text-xs text-[#737373] dark:text-slate-300/80">
                  {t('recipes.noMissingIngredients')}
                </li>
              )}
            </ul>
          </div>
        </div>
      </article>

      <article className="feature-card p-4">
        <h2 className="text-base font-semibold text-[#050505] dark:text-slate-100">
          {t('recipes.stepsImmersiveTitle')}
        </h2>
        <ol className="mt-3 space-y-2">
          {recipe.adimlar.map((step, index) => (
            <li key={`${recipe.id}-step-${index}`} className="flex gap-3 rounded-xl bg-[#f7f4f0] p-3 dark:bg-slate-800/60">
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#171717] text-xs font-semibold text-white">
                {index + 1}
              </span>
              <p className="text-sm leading-relaxed text-[#4b4b4b] dark:text-slate-200">{step}</p>
            </li>
          ))}
        </ol>
      </article>

      <article className="feature-card border border-black/10 bg-white p-4 dark:border-slate-700/55 dark:bg-slate-900/70">
        <h2 className="inline-flex items-center gap-2 text-base font-semibold text-[#050505] dark:text-slate-100">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {t('recipes.tipsSection')}
        </h2>
        <ul className="mt-3 space-y-2">
          {recipe.pufNoktalari.map((tip, index) => (
            <li
              key={`${recipe.id}-tip-${index}`}
              className="rounded-xl bg-[#f7f4f0] p-3 text-sm text-[#4b4b4b] dark:bg-slate-800/65 dark:text-slate-200"
            >
              {tip}
            </li>
          ))}
        </ul>
      </article>

      <div className="fixed inset-x-0 bottom-20 z-40 px-4 sm:px-6 md:static md:inset-auto md:z-auto md:px-0">
        <div className="mx-auto flex w-full max-w-3xl gap-2 rounded-2xl border border-black/10 bg-white/92 p-2 shadow-soft backdrop-blur dark:border-slate-700/55 dark:bg-slate-900/85 md:mt-2 md:max-w-none">
          <TapButton
            type="button"
            onClick={openPlanSheet}
            className="primary-action-btn inline-flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-semibold"
          >
            <Users className="h-4 w-4" aria-hidden="true" />
            {t('recipes.planButton')}
          </TapButton>

          <TapButton
            type="button"
            onClick={handleToggleFavorite}
            className="soft-highlight-btn inline-flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-semibold"
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

      {isGenerating && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[6px] transition-all duration-300">
          <div className="flex flex-col items-center gap-4 rounded-3xl bg-white/95 p-8 shadow-2xl dark:bg-slate-900/95 border border-black/10 dark:border-slate-700/50 max-w-xs text-center">
            <div className="relative flex h-16 w-16 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
              <div className="relative rounded-full bg-amber-500 p-3.5 text-white">
                <LoaderCircle className="h-8 w-8 animate-spin" />
              </div>
            </div>
            <div>
              <p className="text-base font-bold text-[#050505] dark:text-slate-100">
                Yeni Tarif Hazırlanıyor
              </p>
              <p className="mt-1 text-xs text-[#4b4b4b] dark:text-slate-400">
                Şef dolabındaki malzemelere göre en lezzetli alternatifi hazırlıyor...
              </p>
            </div>
          </div>
        </div>
      )}
    </motion.section>
  )
}

export default RecipeDetailPage
