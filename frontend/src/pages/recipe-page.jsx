import { Lightbulb, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getBudgetProfileLabelKey, usePantryStore } from '../store/pantry-store'

function RecipePage() {
  const { t } = useTranslation()
  const selectedBudgetProfile = usePantryStore((state) => state.selectedBudgetProfile)
  const products = usePantryStore((state) => state.products)

  const ingredientPreview = products.slice(0, 4).map((product) => product.name)
  const selectedBudgetProfileLabel = t(getBudgetProfileLabelKey(selectedBudgetProfile))

  return (
    <section className="space-y-4">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sand-700 dark:text-slate-400">
          {t('recipes.badge')}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-sand-900 dark:text-slate-100 sm:text-3xl">
          {t('recipes.title')}
        </h1>
      </header>

      <article className="rounded-2xl border border-sand-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/85">
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

      <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/25">
        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-900 dark:text-emerald-200">
          <Lightbulb className="h-4 w-4" aria-hidden="true" />
          {t('recipes.skeletonTitle')}
        </p>
        <p className="mt-2 text-sm text-emerald-900 dark:text-emerald-200">
          {t('recipes.skeletonDescription')}
        </p>
      </article>
    </section>
  )
}

export default RecipePage