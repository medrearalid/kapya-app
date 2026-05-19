import { CakeSlice, LoaderCircle, Soup, Sparkles, UtensilsCrossed } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'
import TapButton from './tap-button'

const CATEGORY_OPTIONS = [
  { id: 'ana_yemek', labelKey: 'recipes.guidedCategoryMainDish', icon: UtensilsCrossed },
  { id: 'corba', labelKey: 'recipes.guidedCategorySoup', icon: Soup },
  { id: 'tatli', labelKey: 'recipes.guidedCategoryDessert', icon: CakeSlice },
  { id: 'atistirmalik', labelKey: 'recipes.guidedCategorySnack', icon: Sparkles },
]

const COOKING_TECHNIQUE_OPTIONS = [
  { id: 'firin', labelKey: 'recipes.guidedTechniqueOven' },
  { id: 'tava_ocak', labelKey: 'recipes.guidedTechniquePanStove' },
  { id: 'tencere', labelKey: 'recipes.guidedTechniquePot' },
  { id: 'pisirme_gerektirmez', labelKey: 'recipes.guidedTechniqueNoCook' },
  { id: 'fark_etmez', labelKey: 'recipes.guidedTechniqueAny' },
]

const DIET_GOAL_OPTIONS = [
  { id: 'yuksek_protein', labelKey: 'recipes.guidedDietHighProtein' },
  { id: 'dusuk_karbonhidrat', labelKey: 'recipes.guidedDietLowCarb' },
  { id: 'sadece_sebze', labelKey: 'recipes.guidedDietVegetableOnly' },
  { id: 'fark_etmez', labelKey: 'recipes.guidedDietAny' },
]

const normalizeText = (value) => String(value ?? '').trim().toLocaleLowerCase('tr-TR')

function GuidedAssistantWizard({
  isOpen,
  step,
  selectedCategory,
  selectedIngredients,
  selectedCookingTechnique,
  selectedDietGoal,
  pantryIngredientOptions,
  onSelectCategory,
  onToggleIngredient,
  onSelectCookingTechnique,
  onSelectDietGoal,
  onStepBack,
  onStepNext,
  onClose,
  onSubmit,
  isGenerating,
  errorMessage,
}) {
  const { t } = useTranslation()

  if (!isOpen) {
    return null
  }

  const selectedIngredientSet = new Set(
    (Array.isArray(selectedIngredients) ? selectedIngredients : []).map((ingredient) =>
      normalizeText(ingredient),
    ),
  )

  let primaryActionLabel = t('recipes.guidedNextButton')
  if (isGenerating) {
    primaryActionLabel = t('recipes.byNameLoading')
  } else if (step === 4) {
    primaryActionLabel = t('recipes.guidedCreateButton')
  }

  const handlePrimaryAction = step === 4 ? onSubmit : onStepNext

  return (
    <AnimatePresence>
      <motion.div
        key="guided-wizard-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-6"
      >
        <motion.button
          type="button"
          className="absolute inset-0"
          onClick={onClose}
          aria-label={t('planner.cancelButton')}
        />

        <motion.div
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="feature-card relative z-10 w-full max-w-xl border border-black/10 bg-white p-4 dark:border-slate-700/65 dark:bg-slate-900/95"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#4b4b4b] dark:text-slate-400">
                {t('recipes.guidedAssistantTitle')}
              </p>
              <h3 className="mt-1 text-base font-semibold text-[#050505] dark:text-slate-100">
                {t(`recipes.guidedStep${step}Title`)}
              </h3>
            </div>
            <TapButton
              type="button"
              onClick={onClose}
              className="soft-highlight-btn px-3 py-1.5 text-xs font-semibold"
            >
              {t('planner.cancelButton')}
            </TapButton>
          </div>

          {step === 1 ? (
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {CATEGORY_OPTIONS.map((option) => {
                const Icon = option.icon
                const isSelected = selectedCategory === option.id

                return (
                  <TapButton
                    key={option.id}
                    type="button"
                    onClick={() => onSelectCategory(option.id)}
                    className={[
                      'inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-semibold transition',
                      isSelected
                        ? 'border-[#171717] bg-[#171717] text-white'
                        : 'border-black/10 bg-white text-[#4b4b4b] hover:bg-[#f4f1ee] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
                    ].join(' ')}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {t(option.labelKey)}
                  </TapButton>
                )
              })}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="mt-3">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#737373] dark:text-slate-400">
                {t('recipes.guidedOptionalStepLabel')}
              </p>

              <p className="mb-2 text-xs font-medium text-[#737373] dark:text-slate-400">
                {t('recipes.guidedFocusMultiHint')}
              </p>

              {pantryIngredientOptions.length === 0 ? (
                <p className="text-sm text-[#4b4b4b] dark:text-slate-300">
                  {t('recipes.focusedIngredientsEmpty')}
                </p>
              ) : (
                <div className="flex max-h-[240px] flex-wrap gap-2 overflow-y-auto pr-1">
                  {pantryIngredientOptions.map((ingredient) => {
                    const isSelected = selectedIngredientSet.has(normalizeText(ingredient))
                    return (
                      <TapButton
                        key={ingredient}
                        type="button"
                        onClick={() => onToggleIngredient(ingredient)}
                        className={[
                          'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                          isSelected
                            ? 'border-[#171717] bg-[#171717] text-white'
                            : 'border-black/10 bg-white text-[#4b4b4b] hover:bg-[#f4f1ee] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
                        ].join(' ')}
                      >
                        {ingredient}
                      </TapButton>
                    )
                  })}
                </div>
              )}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {COOKING_TECHNIQUE_OPTIONS.map((option) => {
                const isSelected = selectedCookingTechnique === option.id
                return (
                  <TapButton
                    key={option.id}
                    type="button"
                    onClick={() => onSelectCookingTechnique(option.id)}
                    className={[
                      'inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-semibold transition',
                      isSelected
                        ? 'border-[#171717] bg-[#171717] text-white'
                        : 'border-black/10 bg-white text-[#4b4b4b] hover:bg-[#f4f1ee] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
                    ].join(' ')}
                  >
                    {t(option.labelKey)}
                  </TapButton>
                )
              })}
            </div>
          ) : null}

          {step === 4 ? (
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {DIET_GOAL_OPTIONS.map((option) => {
                const isSelected = selectedDietGoal === option.id
                return (
                  <TapButton
                    key={option.id}
                    type="button"
                    onClick={() => onSelectDietGoal(option.id)}
                    className={[
                      'inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-semibold transition',
                      isSelected
                        ? 'border-[#171717] bg-[#171717] text-white'
                        : 'border-black/10 bg-white text-[#4b4b4b] hover:bg-[#f4f1ee] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
                    ].join(' ')}
                  >
                    {t(option.labelKey)}
                  </TapButton>
                )
              })}
            </div>
          ) : null}

          {errorMessage ? (
            <p className="mt-3 text-xs font-semibold text-[#7e1c26] dark:text-rose-300">{errorMessage}</p>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <TapButton
              type="button"
              onClick={onStepBack}
              className="soft-highlight-btn px-4 py-2.5 text-sm font-semibold"
            >
              {step === 1 ? t('planner.cancelButton') : t('recipes.guidedBackButton')}
            </TapButton>

            <TapButton
              type="button"
              onClick={handlePrimaryAction}
              disabled={isGenerating}
              className="primary-action-btn inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold disabled:opacity-70"
            >
              {isGenerating ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                  {primaryActionLabel}
                </>
              ) : (
                primaryActionLabel
              )}
            </TapButton>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

GuidedAssistantWizard.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  step: PropTypes.oneOf([1, 2, 3, 4]).isRequired,
  selectedCategory: PropTypes.string,
  selectedIngredients: PropTypes.arrayOf(PropTypes.string),
  selectedCookingTechnique: PropTypes.string,
  selectedDietGoal: PropTypes.string,
  pantryIngredientOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
  onSelectCategory: PropTypes.func.isRequired,
  onToggleIngredient: PropTypes.func.isRequired,
  onSelectCookingTechnique: PropTypes.func.isRequired,
  onSelectDietGoal: PropTypes.func.isRequired,
  onStepBack: PropTypes.func.isRequired,
  onStepNext: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  isGenerating: PropTypes.bool.isRequired,
  errorMessage: PropTypes.string,
}

GuidedAssistantWizard.defaultProps = {
  selectedCategory: '',
  selectedIngredients: [],
  selectedCookingTechnique: '',
  selectedDietGoal: '',
  errorMessage: '',
}

export default GuidedAssistantWizard
