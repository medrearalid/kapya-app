import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, LoaderCircle, ScanLine, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import TapButton from '../components/tap-button'
import { getBudgetProfileLabelKey, usePantryStore } from '../store/pantry-store'
import { generateWasteSaverRecipes } from '../services/recipe-agent-api'

const MS_PER_DAY = 1000 * 60 * 60 * 24
const LOADING_STEP_KEYS = [
  'dashboard.loadingStepChefThinking',
  'dashboard.loadingStepInventoryCheck',
  'dashboard.loadingStepRecipeCrafting',
]

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

function DashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const selectedBudgetProfile = usePantryStore((state) => state.selectedBudgetProfile)
  const products = usePantryStore((state) => state.products)
  const recentRecipeNames = usePantryStore((state) => state.recentRecipeNames)
  const setGeneratedRecipes = usePantryStore((state) => state.setGeneratedRecipes)
  const addRecentRecipeNames = usePantryStore((state) => state.addRecentRecipeNames)
  const setAgentInsight = usePantryStore((state) => state.setAgentInsight)

  const [isGeneratingRecipes, setIsGeneratingRecipes] = useState(false)
  const [loadingStepIndex, setLoadingStepIndex] = useState(0)
  const [requestError, setRequestError] = useState('')

  const urgentProducts = useMemo(
    () =>
      products.filter((product) => {
        const daysLeft = calculateDaysLeft(product.estimatedShelfLifeEndDate)
        return daysLeft >= 0 && daysLeft <= 2
      }),
    [products],
  )

  const hasUrgentProducts = urgentProducts.length > 0

  useEffect(() => {
    if (!isGeneratingRecipes) {
      setLoadingStepIndex(0)
      return
    }

    const intervalId = setInterval(() => {
      setLoadingStepIndex((current) => (current + 1) % LOADING_STEP_KEYS.length)
    }, 1400)

    return () => {
      clearInterval(intervalId)
    }
  }, [isGeneratingRecipes])

  const handleGenerateRecipes = async () => {
    if (isGeneratingRecipes) {
      return
    }

    setIsGeneratingRecipes(true)
    setRequestError('')
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
      navigate('/recipes')
    } catch (error) {
      setRequestError(
        error?.message === 'RECIPE_GENERATION_FAILED'
          ? t('dashboard.defaultRequestError')
          : error?.message || t('dashboard.defaultRequestError'),
      )
    } finally {
      setIsGeneratingRecipes(false)
    }
  }

  const selectedBudgetProfileLabel = t(getBudgetProfileLabelKey(selectedBudgetProfile))

  return (
    <section className="space-y-5">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sand-700 dark:text-slate-400">
          {t('dashboard.badge')}
        </p>
        <h1 className="heading-display text-3xl font-semibold text-sand-900 dark:text-slate-100">
          {t('dashboard.greeting', { count: products.length })}
        </h1>
        <p className="inline-flex rounded-full bg-white/65 px-3 py-1 text-xs font-semibold text-sand-700 shadow-soft dark:bg-slate-800/65 dark:text-slate-300">
          {selectedBudgetProfileLabel}
        </p>
      </header>

      {urgentProducts.length > 0 ? (
        <article className="glass-panel soft-card overflow-hidden rounded-3xl border border-kapya-200/45 p-4 dark:border-kapya-900/40">
          <p className="flex items-center gap-2 text-sm font-semibold text-kapya-900 dark:text-kapya-200">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            {t('dashboard.alarmTitle')}
          </p>
          <p className="mt-1 text-xs text-kapya-700 dark:text-kapya-300">{t('dashboard.alarmSubtitle')}</p>

          <ul className="-mx-1 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2">
            {urgentProducts.map((product, index) => {
              const days = calculateDaysLeft(product.estimatedShelfLifeEndDate)
              return (
                <motion.li
                  key={product.id}
                  className="glass-panel soft-card min-w-[220px] snap-start rounded-2xl border border-kapya-300/45 bg-gradient-to-br from-kapya-50/90 via-white/70 to-kapya-100/75 px-3 py-3 dark:border-kapya-900/40 dark:from-kapya-950/35 dark:via-slate-900/45 dark:to-kapya-900/30"
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.06, duration: 0.24 }}
                >
                  <p className="text-sm font-semibold text-kapya-900 dark:text-kapya-200">{product.name}</p>
                  <p className="mt-1 text-xs text-kapya-800 dark:text-kapya-300">
                    {t('dashboard.urgentProductItem', {
                      name: product.name,
                      quantity: product.quantity,
                      unit: product.unit,
                      days,
                    })}
                  </p>
                </motion.li>
              )
            })}
          </ul>
        </article>
      ) : (
        <article className="glass-panel soft-card rounded-3xl border border-sage-300/55 bg-sage-50/70 p-4 dark:border-sage-700/60 dark:bg-sage-900/38">
          <p className="flex items-center gap-2 text-sm font-semibold text-sage-900 dark:text-sage-50">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {t('dashboard.noUrgentProducts')}
          </p>
        </article>
      )}

      <div className="grid gap-3">
        <TapButton
          type="button"
          onClick={() => navigate('/pantry')}
          className="glass-panel soft-card inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/55 bg-white/65 px-4 py-4 text-base font-semibold text-sand-900 dark:border-slate-700/55 dark:bg-slate-800/65 dark:text-slate-100"
        >
          <ScanLine className="h-5 w-5 text-kapya-600" aria-hidden="true" />
          {t('dashboard.scanReceiptButton')}
        </TapButton>

        <TapButton
          type="button"
          onClick={handleGenerateRecipes}
          className="animate-kapya-pulse inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-kapya-600 px-4 py-4 text-base font-semibold text-white shadow-float transition hover:bg-kapya-700"
        >
          {isGeneratingRecipes ? (
            <>
              <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
              {t(LOADING_STEP_KEYS[loadingStepIndex])}
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" aria-hidden="true" />
              {hasUrgentProducts
                ? t('dashboard.generateButtonUrgent')
                : t('dashboard.generateButton')}
            </>
          )}
        </TapButton>

        {requestError ? (
          <p className="text-xs text-kapya-900 dark:text-kapya-300">{requestError}</p>
        ) : null}
      </div>
    </section>
  )
}

export default DashboardPage