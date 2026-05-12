import { CheckCircle2, Minus, Plus, Sparkles } from 'lucide-react'
import PropTypes from 'prop-types'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import TapButton from './tap-button'
import { usePantryStore } from '../store/pantry-store'

const normalizeIngredient = (ingredient) => ({
  name: String(ingredient?.name ?? ingredient?.isim ?? '').trim(),
  baseAmount: Number(ingredient?.baseAmount ?? ingredient?.bazMiktar ?? 0),
  unit: String(ingredient?.unit ?? ingredient?.birim ?? '').trim(),
})

const formatAmount = (amount) => {
  const rounded = Number(amount.toFixed(2))
  return String(rounded)
}

function RecipeCard({ recipe }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const consumeRecipeIngredients = usePantryStore((state) => state.consumeRecipeIngredients)
  const showToast = usePantryStore((state) => state.showToast)

  const [portionSize, setPortionSize] = useState(2)

  const ingredients = useMemo(
    () =>
      (Array.isArray(recipe?.malzemeler) ? recipe.malzemeler : [])
        .map(normalizeIngredient)
        .filter((ingredient) => ingredient.name && ingredient.baseAmount > 0),
    [recipe],
  )

  const calculatedIngredients = useMemo(
    () =>
      ingredients.map((ingredient) => ({
        ...ingredient,
        totalAmount: ingredient.baseAmount * portionSize,
      })),
    [ingredients, portionSize],
  )

  const decrementPortion = () => {
    setPortionSize((current) => Math.max(1, current - 1))
  }

  const incrementPortion = () => {
    setPortionSize((current) => Math.min(12, current + 1))
  }

  const handleCookRecipe = () => {
    consumeRecipeIngredients({
      ingredients,
      portionSize,
    })

    showToast(t('recipes.toastSaved'))
    navigate('/')
  }

  return (
    <article className="glass-panel soft-card rounded-2xl border border-sage-200/65 bg-white/75 p-4 dark:border-sage-900/40 dark:bg-slate-900/60">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{recipe?.tarifAdi}</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{recipe?.kisaAciklama}</p>
          <p className="mt-2 inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/45 dark:text-emerald-200">
            {recipe?.tahminiPorsiyonBasiMaliyet}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-600 dark:bg-slate-800">
          <div className="flex items-center gap-1">
            <TapButton
              type="button"
              onClick={decrementPortion}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
              aria-label={t('recipes.decreasePortion')}
            >
              <Minus className="h-4 w-4" aria-hidden="true" />
            </TapButton>
            <span className="min-w-16 text-center text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t('recipes.portionSize', { count: portionSize })}
            </span>
            <TapButton
              type="button"
              onClick={incrementPortion}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
              aria-label={t('recipes.increasePortion')}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </TapButton>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          {t('recipes.ingredientsTitle')}
        </p>
        <ul className="mt-2 space-y-2">
          {calculatedIngredients.map((ingredient) => (
            <li
              key={`${ingredient.name}-${ingredient.unit}`}
              className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/65"
            >
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{ingredient.name}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {t('recipes.ingredientCalculated', {
                  amount: formatAmount(ingredient.totalAmount),
                  unit: ingredient.unit,
                })}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('recipes.ingredientBase', {
                  amount: formatAmount(ingredient.baseAmount),
                  unit: ingredient.unit,
                })}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <TapButton
        type="button"
        onClick={handleCookRecipe}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sage-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sage-700"
      >
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        {t('recipes.cookButton')}
      </TapButton>

      <p className="mt-2 flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
        {t('recipes.wasteHint')}
      </p>
    </article>
  )
}

export default RecipeCard

RecipeCard.propTypes = {
  recipe: PropTypes.shape({
    tarifAdi: PropTypes.string,
    kisaAciklama: PropTypes.string,
    tahminiPorsiyonBasiMaliyet: PropTypes.string,
    malzemeler: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string,
        baseAmount: PropTypes.number,
        unit: PropTypes.string,
        isim: PropTypes.string,
        bazMiktar: PropTypes.number,
        birim: PropTypes.string,
      }),
    ),
  }),
}