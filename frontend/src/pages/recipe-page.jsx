import { Heart, UtensilsCrossed } from 'lucide-react'
import PropTypes from 'prop-types'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import ChefRecipeCard from '../components/chef-recipe-card'
import EmptyStatePanel from '../components/empty-state-panel'
import TapButton from '../components/tap-button'
import MasonryGrid from '../components/ui/masonry-grid'
import { usePantryStore } from '../store/pantry-store'
import { useRecipeStore } from '../store/recipe-store'
import { generateRecipeByName } from '../services/recipe-agent-api'

const RECIPE_IMAGE_PLACEHOLDER = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fef3c7"/><stop offset="100%" stop-color="#fcd34d"/></linearGradient></defs><rect width="1024" height="1024" fill="url(#g)"/><text x="512" y="520" text-anchor="middle" font-family="Arial, sans-serif" font-size="72" fill="#78350f">CHEF</text></svg>',
)}`

const FILTER_MODE = {
  ALL: 'all',
  FAVORITES: 'favorites',
}

const normalizeRecipeKey = (value) => String(value ?? '').trim().toLocaleLowerCase('tr-TR')

function RecipeLibrarySection({ recipeList, favoriteFilterActive, onSelectRecipe, onToggleFavorite, onDeleteRecipe, t }) {
  const isLibraryEmpty = recipeList.length === 0

  let libraryContent
  if (isLibraryEmpty) {
    libraryContent = (
      <EmptyStatePanel
        icon={favoriteFilterActive ? Heart : UtensilsCrossed}
        title={
          favoriteFilterActive ? t('recipes.favoritesEmptyTitle') : t('recipes.emptyLibraryTitle')
        }
        description={
          favoriteFilterActive
            ? t('recipes.favoritesEmptyDescription')
            : t('recipes.emptyLibraryDescription')
        }
      />
    )
  } else {
    libraryContent = (
      <MasonryGrid
        items={recipeList}
        getItemKey={(recipe, index) => recipe.id || index}
        className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4"
        gap="0.75rem"
        renderItem={(recipe) => (
          <ChefRecipeCard
            recipe={recipe}
            imageFallback={RECIPE_IMAGE_PLACEHOLDER}
            onToggleFavorite={onToggleFavorite}
            onDelete={onDeleteRecipe}
            favoriteAriaLabel={
              recipe.isFavorite
                ? t('recipes.favoriteRemoveAria', { name: recipe.isim })
                : t('recipes.favoriteAddAria', { name: recipe.isim })
            }
          />
        )}
      />
    )
  }

  return (
    <>
      <div className="flex items-center">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#4b4b4b] dark:text-slate-400">
          {t('recipes.libraryTitle', { count: recipeList.length })}
        </p>
      </div>

      {libraryContent}
    </>
  )
}

RecipeLibrarySection.propTypes = {
  recipeList: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      isim: PropTypes.string,
      sure: PropTypes.string,
      kalori: PropTypes.string,
      porsiyon: PropTypes.string,
      aciklama: PropTypes.string,
      nanoBananaGorseli: PropTypes.string,
      isFavorite: PropTypes.bool,
    }),
  ).isRequired,
  favoriteFilterActive: PropTypes.bool.isRequired,
  onSelectRecipe: PropTypes.func.isRequired,
  onToggleFavorite: PropTypes.func.isRequired,
  onDeleteRecipe: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
}

function RecipePage() {
  const { t } = useTranslation()
  const savedRecipes = useRecipeStore((state) => state.savedRecipes)
  const toggleFavorite = useRecipeStore((state) => state.toggleFavorite)
  const deleteRecipe = useRecipeStore((state) => state.deleteRecipe)
  const saveRecipe = useRecipeStore((state) => state.saveRecipe)
  const products = usePantryStore((state) => state.products)
  const showToast = usePantryStore((state) => state.showToast)
  const [activeFilter, setActiveFilter] = useState(FILTER_MODE.ALL)
  const navigate = useNavigate()

  const recipeList = useMemo(
    () =>
      savedRecipes
        .slice()
        .sort((left, right) => Number(right?.updatedAt || 0) - Number(left?.updatedAt || 0)),
    [savedRecipes],
  )

  const favoriteRecipes = useMemo(
    () => recipeList.filter((recipe) => Boolean(recipe?.isFavorite)),
    [recipeList],
  )

  const visibleRecipes = useMemo(() => {
    if (activeFilter === FILTER_MODE.FAVORITES) {
      return favoriteRecipes
    }

    return recipeList
  }, [activeFilter, favoriteRecipes, recipeList])

  const handleToggleFavorite = (recipeInput) => {
    const recipeId = String(recipeInput?.id ?? '').trim()
    const recipeName = normalizeRecipeKey(recipeInput?.isim)

    const targetRecipe =
      recipeList.find((recipe) => String(recipe?.id ?? '').trim() === recipeId) ||
      recipeList.find((recipe) => normalizeRecipeKey(recipe?.isim) === recipeName)

    if (!targetRecipe) {
      return
    }

    const willBeFavorite = !targetRecipe.isFavorite
    toggleFavorite(targetRecipe)
    showToast(willBeFavorite ? t('recipes.favoriteSavedToast') : t('recipes.favoriteRemovedToast'))
  }

  const handleDeleteRecipe = (recipe) => {
    if (!recipe?.id) return
    deleteRecipe(recipe.id)
    showToast(t('recipes.recipeDeletedToast', { defaultValue: 'Tarif kütüphaneden silindi.' }))
  }

  return (
      <section className="space-y-6 pb-20 md:pb-6 relative">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#4b4b4b] dark:text-slate-400">
          {t('recipes.badge')}
        </p>
        <h1 className="heading-display mt-2 text-3xl font-semibold text-[#050505] dark:text-slate-100">
          {t('recipes.title')}
        </h1>
        <p className="mt-2 text-sm text-[#4b4b4b] dark:text-slate-300">
          {t('recipes.generatedCount', { count: recipeList.length })}
        </p>

        <div className="mt-4 inline-flex items-center gap-1 rounded-xl border border-black/10 bg-white p-1 dark:border-slate-700 dark:bg-slate-900/65">
          <TapButton
            type="button"
            onClick={() => setActiveFilter(FILTER_MODE.ALL)}
            className={[
              'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
              activeFilter === FILTER_MODE.ALL
                ? 'bg-[#171717] text-white'
                : 'text-[#4b4b4b] dark:text-slate-200',
            ].join(' ')}
          >
            {t('recipes.filterAll')}
          </TapButton>

          <TapButton
            type="button"
            onClick={() => setActiveFilter(FILTER_MODE.FAVORITES)}
            className={[
              'inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
              activeFilter === FILTER_MODE.FAVORITES
                ? 'bg-rose-500 text-white'
                : 'text-[#4b4b4b] dark:text-slate-200',
            ].join(' ')}
          >
            <Heart className="h-3.5 w-3.5" aria-hidden="true" />
            {t('recipes.filterFavorites', { count: favoriteRecipes.length })}
          </TapButton>
        </div>
      </header>

      <RecipeLibrarySection
        recipeList={visibleRecipes}
        favoriteFilterActive={activeFilter === FILTER_MODE.FAVORITES}
        onSelectRecipe={(recipe) => navigate(`/recipes/${recipe.id}`, { state: { fromChefHub: true } })}
        onToggleFavorite={handleToggleFavorite}
        onDeleteRecipe={handleDeleteRecipe}
        t={t}
      />

      </section>
  )
}

export default RecipePage
