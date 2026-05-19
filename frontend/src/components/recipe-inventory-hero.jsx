import { Coins, LoaderCircle, PackageCheck, Sparkles, TriangleAlert, WandSparkles, Minus, Plus } from 'lucide-react'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'
import TapButton from './tap-button'

function RecipeInventoryHero({
  recipePrompt,
  onRecipePromptChange,
  portionSize,
  onPortionSizeChange,
  onGenerateRecipe,
  onGenerateLuckyRecipe,
  onOpenGuidedWizard,
  isGeneratingRecipe,
  recipeGenerationError,
  stats,
}) {
  const { t } = useTranslation()

  return (
    <article className="feature-card relative overflow-hidden p-5 sm:p-8">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#c7c7c7]/45 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 bottom-0 h-40 w-40 rounded-full bg-[#ffc42c]/15 blur-3xl" />

      <div className="relative space-y-5">
        <header>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#4b4b4b]">
            {t('pantry.badge')}
          </p>
          <h1 className="heading-display mt-2 text-3xl font-medium text-[#050505] sm:text-4xl">
            {t('pantry.recipeInventory.headline')}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#4b4b4b] sm:text-base">
            {t('pantry.recipeInventory.subtitle')}
          </p>
        </header>

        <div className="rounded-[20px] border border-black/10 bg-white/85 p-4 shadow-soft">
          <div className="border-b border-black/15 pb-2.5">
            <input
              type="text"
              value={recipePrompt}
              onChange={(event) => onRecipePromptChange(event.target.value)}
              aria-label={t('pantry.recipeInventory.promptPlaceholder')}
              placeholder={t('pantry.recipeInventory.promptPlaceholder')}
              className="w-full border-0 bg-transparent p-0 text-base text-[#050505] outline-none placeholder:text-[#737373] dark:text-slate-100"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  onGenerateRecipe()
                }
              }}
            />
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-black/5 pt-3 dark:border-slate-800">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#4b4b4b] dark:text-slate-400">
              {t('recipes.portionCountLabel', { defaultValue: 'Kaç Kişilik?' })}
            </span>
            <div className="inline-flex items-center gap-2 rounded-xl bg-[#f7f4f0] p-1 dark:bg-slate-800">
              <TapButton
                type="button"
                onClick={() => onPortionSizeChange(Math.max(1, portionSize - 1))}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[#171717] shadow-sm dark:bg-slate-700 dark:text-white"
                aria-label="Azalt"
              >
                <Minus className="h-3.5 w-3.5" aria-hidden="true" />
              </TapButton>
              <span className="min-w-8 text-center text-sm font-semibold text-[#050505] dark:text-white">
                {portionSize}
              </span>
              <TapButton
                type="button"
                onClick={() => onPortionSizeChange(Math.min(12, portionSize + 1))}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[#171717] shadow-sm dark:bg-slate-700 dark:text-white"
                aria-label="Artır"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              </TapButton>
            </div>
          </div>

          <p className="mt-3.5 border-t border-black/5 pt-3.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#737373] dark:border-slate-800">
            {t('recipes.chefOptionsTitle')}
          </p>

          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <TapButton
              type="button"
              onClick={onGenerateRecipe}
              disabled={isGeneratingRecipe}
              className="primary-action-btn inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isGeneratingRecipe ? (
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <WandSparkles className="h-4 w-4" aria-hidden="true" />
              )}
              <span>{t('pantry.recipeInventory.generateButton')}</span>
            </TapButton>

            <TapButton
              type="button"
              onClick={onGenerateLuckyRecipe}
              disabled={isGeneratingRecipe}
              className="soft-highlight-btn inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              <span>{t('pantry.recipeInventory.luckyButton')}</span>
            </TapButton>

            <TapButton
              type="button"
              onClick={onOpenGuidedWizard}
              className="soft-highlight-btn inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              <span>{t('pantry.recipeInventory.guidedButton')}</span>
            </TapButton>
          </div>

          {recipeGenerationError ? (
            <p className="mt-3 text-xs font-medium text-[#7e1c26]">{recipeGenerationError}</p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-[20px] border border-black/10 bg-white p-4 shadow-soft">
            <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#4b4b4b]">
              <PackageCheck className="h-4 w-4" aria-hidden="true" />
              {t('pantry.recipeInventory.activeStock')}
            </p>
            <p className="mt-2 text-2xl font-semibold text-[#050505]">{stats.activeCount}</p>
            <p className="mt-1 text-xs text-[#737373]">{t('pantry.recipeInventory.activeStockDescription')}</p>
          </div>

          <div className="rounded-[20px] border border-black/10 bg-white p-4 shadow-soft">
            <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#4b4b4b]">
              <TriangleAlert className="h-4 w-4" aria-hidden="true" />
              {t('pantry.recipeInventory.urgentStock')}
            </p>
            <p className="mt-2 text-2xl font-semibold text-[#050505]">{stats.urgentCount}</p>
            <p className="mt-1 text-xs text-[#737373]">{t('pantry.recipeInventory.urgentStockDescription')}</p>
          </div>

          <div className="rounded-[20px] border border-black/10 bg-white p-4 shadow-soft">
            <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#4b4b4b]">
              <Coins className="h-4 w-4" aria-hidden="true" />
              {t('pantry.recipeInventory.inventoryValue')}
            </p>
            <p className="mt-2 text-xl font-semibold text-[#050505]">{stats.totalValue}</p>
            <p className="mt-1 text-xs text-[#737373]">{t('pantry.recipeInventory.inventoryValueDescription')}</p>
          </div>
        </div>
      </div>
    </article>
  )
}

RecipeInventoryHero.propTypes = {
  recipePrompt: PropTypes.string.isRequired,
  onRecipePromptChange: PropTypes.func.isRequired,
  portionSize: PropTypes.number.isRequired,
  onPortionSizeChange: PropTypes.func.isRequired,
  onGenerateRecipe: PropTypes.func.isRequired,
  onGenerateLuckyRecipe: PropTypes.func.isRequired,
  onOpenGuidedWizard: PropTypes.func.isRequired,
  isGeneratingRecipe: PropTypes.bool.isRequired,
  recipeGenerationError: PropTypes.string.isRequired,
  stats: PropTypes.shape({
    activeCount: PropTypes.number.isRequired,
    urgentCount: PropTypes.number.isRequired,
    totalValue: PropTypes.string.isRequired,
  }).isRequired,
}

export default RecipeInventoryHero
