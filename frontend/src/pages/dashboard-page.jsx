import { useMemo, useState } from 'react'
import { AlertTriangle, Boxes, LoaderCircle, Siren, Sparkles, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { getBudgetProfileLabelKey, usePantryStore } from '../store/pantry-store'
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

function DashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const selectedBudgetProfile = usePantryStore((state) => state.selectedBudgetProfile)
  const products = usePantryStore((state) => state.products)
  const setGeneratedRecipes = usePantryStore((state) => state.setGeneratedRecipes)

  const [isGeneratingRecipes, setIsGeneratingRecipes] = useState(false)
  const [requestError, setRequestError] = useState('')

  const urgentProducts = useMemo(
    () =>
      products.filter((product) => {
        const daysLeft = calculateDaysLeft(product.estimatedShelfLifeEndDate)
        return daysLeft <= 2
      }),
    [products],
  )

  const expiringSoonProducts = useMemo(
    () =>
      products.filter((product) => {
        const daysLeft = calculateDaysLeft(product.estimatedShelfLifeEndDate)
        return daysLeft >= 0 && daysLeft <= 3
      }),
    [products],
  )

  const handleGenerateRecipes = async () => {
    setIsGeneratingRecipes(true)
    setRequestError('')

    try {
      const recipeData = await generateWasteSaverRecipes({
        budgetProfile: selectedBudgetProfile,
        pantryStock: products,
        urgentProducts,
      })

      const recipeList = Array.isArray(recipeData?.tarifler) ? recipeData.tarifler : []
      if (recipeList.length === 0) {
        throw new Error('RECIPE_GENERATION_FAILED')
      }

      setGeneratedRecipes(recipeList)
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
    <section className="space-y-4">
      <article className="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 p-4 shadow-sm dark:border-red-900/50 dark:from-red-950/50 dark:via-orange-950/40 dark:to-amber-950/25">
        <p className="flex items-center gap-2 text-sm font-semibold text-red-900 dark:text-red-300">
          <Siren className="h-4 w-4" aria-hidden="true" />
          {t('dashboard.alarmTitle')}
        </p>

        {urgentProducts.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {urgentProducts.map((product) => (
              <li
                key={product.id}
                className="rounded-xl border border-orange-200 bg-white/80 px-3 py-2 text-sm text-red-900 dark:border-orange-900/40 dark:bg-slate-900/45 dark:text-orange-200"
              >
                {t('dashboard.urgentProductItem', {
                  name: product.name,
                  quantity: product.quantity,
                  unit: product.unit,
                  date: product.estimatedShelfLifeEndDate,
                })}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-red-800 dark:text-red-300">
            {t('dashboard.noUrgentProducts')}
          </p>
        )}

        <button
          type="button"
          onClick={handleGenerateRecipes}
          disabled={isGeneratingRecipes || urgentProducts.length === 0}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-red-300 dark:bg-red-700 dark:hover:bg-red-600 dark:disabled:bg-red-900/40"
        >
          {isGeneratingRecipes ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
              {t('dashboard.loadingButton')}
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {t('dashboard.generateButton')}
            </>
          )}
        </button>

        {requestError ? (
          <p className="mt-2 text-xs text-red-900 dark:text-red-300">{requestError}</p>
        ) : null}
      </article>

      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sand-700 dark:text-slate-400">
          {t('dashboard.badge')}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-sand-900 dark:text-slate-100 sm:text-3xl">
          {t('dashboard.title')}
        </h1>
      </header>

      <div className="grid gap-3">
        <article className="rounded-2xl border border-sand-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/85">
          <p className="flex items-center gap-2 text-sm font-semibold text-sand-900 dark:text-slate-100">
            <Wallet className="h-4 w-4" aria-hidden="true" />
            {t('dashboard.selectedBudgetProfile')}
          </p>
          <p className="mt-2 text-lg font-medium text-sand-900 dark:text-slate-100">
            {selectedBudgetProfileLabel}
          </p>
        </article>

        <article className="rounded-2xl border border-sand-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/85">
          <p className="flex items-center gap-2 text-sm font-semibold text-sand-900 dark:text-slate-100">
            <Boxes className="h-4 w-4" aria-hidden="true" />
            {t('dashboard.totalProducts')}
          </p>
          <p className="mt-2 text-lg font-medium text-sand-900 dark:text-slate-100">{products.length}</p>
        </article>

        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            {t('dashboard.expiringTitle')}
          </p>
          <p className="mt-2 text-sm text-amber-900 dark:text-amber-200">
            {expiringSoonProducts.length > 0
              ? t('dashboard.expiringCount', { count: expiringSoonProducts.length })
              : t('dashboard.expiringNone')}
          </p>
        </article>
      </div>
    </section>
  )
}

export default DashboardPage