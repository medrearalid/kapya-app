import { BadgeCheck, Lightbulb, LoaderCircle, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getBudgetProfileLabelKey, usePantryStore } from '../store/pantry-store'
import RecipeCard from '../components/RecipeCard'
import TapButton from '../components/tap-button'
import { generateWasteSaverRecipes } from '../services/recipe-agent-api'

const MS_PER_DAY = 1000 * 60 * 60 * 24

const calculateDaysLeft = (dateValue) => {
  const targetDate = new Date(dateValue)
  const today = new Date()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const startOfTarget = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
  )

  return Math.ceil((startOfTarget - startOfToday) / MS_PER_DAY)
}

function RecipePage() {
  const { t } = useTranslation()
  const selectedBudgetProfile = usePantryStore((state) => state.selectedBudgetProfile)
  const products = usePantryStore((state) => state.products)
  const generatedRecipes = usePantryStore((state) => state.generatedRecipes)
  const recentRecipeNames = usePantryStore((state) => state.recentRecipeNames)
  const agentInsight = usePantryStore((state) => state.agentInsight)
  const setGeneratedRecipes = usePantryStore((state) => state.setGeneratedRecipes)
  const setAgentInsight = usePantryStore((state) => state.setAgentInsight)
  const addRecentRecipeNames = usePantryStore((state) => state.addRecentRecipeNames)

  const [isRefreshingRecipes, setIsRefreshingRecipes] = useState(false)
  const [refreshError, setRefreshError] = useState('')

  const urgentProducts = useMemo(
    () =>
      products.filter((product) => {
        const daysLeft = calculateDaysLeft(product.estimatedShelfLifeEndDate)
        return daysLeft >= 0 && daysLeft <= 2
      }),
    [products],
  )
  const hasUrgentProducts = urgentProducts.length > 0

  const ingredientPreview = products.slice(0, 4).map((product) => product.name)
  const selectedBudgetProfileLabel = t(getBudgetProfileLabelKey(selectedBudgetProfile))
  const savingsAmount = Math.max(0, Math.round(Number(agentInsight?.tasarrufEdilenTutar) || 0))
  const hasAgentInsight = Boolean(agentInsight?.ajanMesaji) || savingsAmount > 0

  const handleRefreshRecipes = async () => {
    if (isRefreshingRecipes) {
      return
    }

    setIsRefreshingRecipes(true)
    setRefreshError('')
    setAgentInsight(null)

    const agentInstruction = hasUrgentProducts
      ? 'Bu acil urunleri merkeze alarak israf onleyici tarif uret.'
      : 'Buzdolabindaki urunleri kullanarak profile uygun gunluk bir tarif uret.'
    const requestMode = hasUrgentProducts ? 'waste-prevent' : 'daily-profile'

    try {
      const recipeData = await generateWasteSaverRecipes({
        budgetProfile: selectedBudgetProfile,
        pantryStock: products,
        urgentProducts,
        agentInstruction,
        requestMode,
        recentRecipeNames,
      })

      const recipeList = Array.isArray(recipeData?.tarifler) ? recipeData.tarifler : []
      if (recipeList.length === 0) {
        throw new Error('RECIPE_GENERATION_FAILED')
      }

      setGeneratedRecipes(recipeList)
      addRecentRecipeNames(
        recipeList.map((recipe) => String(recipe?.tarifAdi ?? '').trim()).filter(Boolean),
      )
      setAgentInsight({
        tasarrufEdilenTutar: Number(recipeData?.tasarrufEdilenTutar) || 0,
        ajanMesaji: String(recipeData?.ajanMesaji ?? '').trim(),
      })
    } catch (error) {
      setRefreshError(
        error?.message === 'RECIPE_GENERATION_FAILED'
          ? t('recipes.refreshError')
          : error?.message || t('recipes.refreshError'),
      )
    } finally {
      setIsRefreshingRecipes(false)
    }
  }

  return (
    <section className="space-y-4">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sand-700 dark:text-slate-400">
          {t('recipes.badge')}
        </p>
        <h1 className="heading-display mt-2 text-3xl font-semibold text-sand-900 dark:text-slate-100">
          {t('recipes.title')}
        </h1>
      </header>

      <article className="glass-panel soft-card rounded-2xl p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-sand-900 dark:text-slate-100">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {t('recipes.parametersTitle')}
        </p>
        <p className="mt-2 text-sm text-sand-700 dark:text-slate-300">
          {t('recipes.budgetMode', { profile: selectedBudgetProfileLabel })}
        </p>
        <p className="mt-1 text-sm text-sand-700 dark:text-slate-300">
          {t('recipes.availableProducts', {
            products:
              ingredientPreview.length > 0 ? ingredientPreview.join(', ') : t('recipes.noProducts'),
          })}
        </p>
      </article>

      <article className="glass-panel soft-card rounded-2xl border border-sage-200/70 bg-sage-50/75 p-4 dark:border-sage-900/40 dark:bg-sage-950/20">
        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-900 dark:text-emerald-200">
          <Lightbulb className="h-4 w-4" aria-hidden="true" />
          {t('recipes.skeletonTitle')}
        </p>
        <p className="mt-2 text-sm text-emerald-900 dark:text-emerald-200">
          {generatedRecipes.length > 0
            ? t('recipes.generatedCount', { count: generatedRecipes.length })
            : t('recipes.skeletonDescription')}
        </p>
      </article>

      <TapButton
        type="button"
        onClick={handleRefreshRecipes}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-kapya-200/65 bg-kapya-50/80 px-4 py-3 text-sm font-semibold text-kapya-800 transition hover:bg-kapya-100 dark:border-kapya-900/45 dark:bg-kapya-950/25 dark:text-kapya-200 dark:hover:bg-kapya-900/35"
      >
        {isRefreshingRecipes ? (
          <>
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
            {t('recipes.refreshLoading')}
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {t('recipes.refreshButton')}
          </>
        )}
      </TapButton>

      {refreshError ? (
        <p className="text-xs text-kapya-900 dark:text-kapya-300">{refreshError}</p>
      ) : null}

      {hasAgentInsight ? (
        <article className="glass-panel soft-card rounded-2xl border border-emerald-200/75 bg-gradient-to-br from-emerald-50/90 via-white to-emerald-100/80 p-4 dark:border-emerald-900/50 dark:from-emerald-950/35 dark:via-slate-900/45 dark:to-emerald-900/30">
          <p className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white">
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {t('recipes.savingsBadge')}
          </p>
          <p className="mt-2 text-lg font-semibold text-emerald-900 dark:text-emerald-200">
            {t('recipes.savingsAmount', { amount: savingsAmount })}
          </p>
          <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-300">
            {agentInsight?.ajanMesaji || t('recipes.savingsMessageFallback', { amount: savingsAmount })}
          </p>
        </article>
      ) : null}

      {generatedRecipes.length > 0 ? (
        <div className="space-y-3">
          {generatedRecipes.map((recipe, index) => (
            <RecipeCard key={`${recipe?.tarifAdi || 'tarif'}-${index}`} recipe={recipe} />
          ))}
        </div>
      ) : (
        <article className="glass-panel soft-card rounded-2xl border border-white/50 bg-white/70 p-4 dark:border-slate-700/50 dark:bg-slate-900/60">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {t('recipes.emptyTitle')}
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {t('recipes.emptyDescription')}
          </p>
        </article>
      )}
    </section>
  )
}

export default RecipePage